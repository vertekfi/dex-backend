import { Inject, Injectable } from '@nestjs/common';
import { PrismaPoolStaking } from '@prisma/client';
import { formatUnits, getAddress } from 'ethers/lib/utils';
import { PrismaService } from 'nestjs-prisma';
import { GqlPoolJoinExit, GqlPoolSwap } from 'src/gql-addons';
import { PoolSwapService } from '../common/pool/pool-swap.service';
import { Multicaller } from '../common/web3/multicaller';
import { UserBalanceService } from './lib/user-balance.service';
import { UserSyncGaugeBalanceService } from './lib/user-sync-gauge-balance.service';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { VeBalLockInfoResult } from './types';
import { UserGaugeShare, UserPoolBalance } from './user-types';
import * as votingEscrowAbi from '../abis/VotingEscrow.json';
import { RPC } from '../common/web3/rpc.provider';
import { AccountWeb3 } from '../common/types';
import { toJsTimestamp } from '../utils/time';
import { networkConfig } from '../config/network-config';
import { bnum } from '@balancer-labs/sor';
import { Contract } from 'ethers';
import { getContractAddress } from '../common/web3/contract';
import { VeGaugeAprService } from '../common/gauges/ve-bal-gauge-apr.service';
import { GaugeService } from '../common/gauges/gauge.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly walletSyncService: UserSyncWalletBalanceService,
    private readonly userBalanceService: UserBalanceService,
    private readonly poolSwapService: PoolSwapService,
    private readonly gaugeSyncService: UserSyncGaugeBalanceService,
    private readonly gaugeAprService: VeGaugeAprService,
    private readonly gaugeService: GaugeService,
  ) {}

  async initWalletBalancesForPool(poolId: string) {
    await this.walletSyncService.initBalancesForPool(poolId);
  }

  async getUserPoolBalances(address: string): Promise<UserPoolBalance[]> {
    return this.userBalanceService.getUserPoolBalances(address);
  }

  async getUserPoolInvestments(
    address: string,
    poolId: string,
    first?: number,
    skip?: number,
  ): Promise<GqlPoolJoinExit[]> {
    return this.poolSwapService.getUserJoinExitsForPool(address, poolId, first, skip);
  }

  async getUserSwaps(
    address: string,
    poolId: string,
    first?: number,
    skip?: number,
  ): Promise<GqlPoolSwap[]> {
    return this.poolSwapService.getUserSwapsForPool(address, poolId, first, skip);
  }

  async getUserStaking(address: string): Promise<PrismaPoolStaking[]> {
    return this.userBalanceService.getUserStaking(address);
  }

  async syncChangedWalletBalancesForAllPools() {
    await this.walletSyncService.syncChangedBalancesForAllPools();
  }

  async initWalletBalancesForAllPools() {
    await this.walletSyncService.initBalancesForPools();
  }

  async initStakedBalances() {
    this.gaugeSyncService.initStakedBalances();
  }

  async syncChangedStakedBalances() {
    await this.gaugeSyncService.syncChangedStakedBalances();
  }

  async syncUserBalance(userAddress: string, poolId: string) {
    try {
      const pool = await this.prisma.prismaPool.findUniqueOrThrow({
        where: { id: poolId },
        include: { staking: true },
      });

      // we make sure the user exists
      await this.prisma.prismaUser.upsert({
        where: { address: userAddress },
        update: {},
        create: { address: userAddress },
      });

      await this.walletSyncService.syncUserBalance(userAddress, pool.id, pool.address);

      if (pool.staking) {
        this.gaugeSyncService.syncUserBalance({
          userAddress,
          poolId: pool.id,
          poolAddress: pool.address,
          staking: pool.staking!,
        });
      }
    } catch (error) {
      console.error(`Error syncing user ${userAddress} balance for pool ${poolId}`);
    }
  }

  async syncUserBalanceAllPools(userAddress: string) {
    const allBalances = await this.userBalanceService.getUserPoolBalances(userAddress);
    for (const userPoolBalance of allBalances) {
      this.syncUserBalance(userAddress, userPoolBalance.poolId);
    }
  }

  async getUserVeLockInfo(account?: string) {
    if (!account) {
      return null;
    }

    const veBalMulticaller = new Multicaller(this.rpc, votingEscrowAbi);

    const veAddress = networkConfig.balancer.votingEscrow.veAddress;
    veBalMulticaller.call('locked', veAddress, 'locked', [account]);
    veBalMulticaller.call('epoch', veAddress, 'epoch');
    veBalMulticaller.call('totalSupply', veAddress, 'totalSupply');
    veBalMulticaller.call('balanceOf', veAddress, 'balanceOf', [account]);

    const result = await veBalMulticaller.execute<VeBalLockInfoResult>();

    return this.formatLockInfo(result);
  }

  private formatLockInfo(lockInfo: VeBalLockInfoResult) {
    const [lockedAmount, lockedEndDate] = lockInfo.locked;

    const hasExistingLock = lockedAmount.gt(0);
    const lockedEndDateNormalised = toJsTimestamp(lockedEndDate.toNumber());
    const isExpired = hasExistingLock && Date.now() > lockedEndDateNormalised;

    const numerator = Number(formatUnits(lockInfo.balanceOf));
    const denominator = Number(formatUnits(lockInfo.totalSupply));

    const data = {
      lockEndDate: String(lockedEndDateNormalised),
      lockedAmount: formatUnits(lockedAmount, 18),
      totalSupply: formatUnits(lockInfo.totalSupply, 18),
      epoch: lockInfo.epoch.toString(),
      hasExistingLock,
      isExpired,
      currentBalance: formatUnits(lockInfo.balanceOf, 18),
      percentOwned: ((numerator / denominator) * 100).toFixed(4),
    };

    return data;
  }

  async getUserBoosts(userAddress: string) {
    // need to use veBAL balance from the proxy as the balance from the proxy takes
    // into account the amount of delegated veBAL as well
    const veBalProxy = new Contract(
      getContractAddress('VotingEscrowDelegationProxy'),
      ['function adjustedBalanceOf(address) public view returns(uint)'],
      this.rpc.provider,
    );

    const [veBALInfo, veBALBalance, databaseGauges, userGauges] = await Promise.all([
      this.getUserVeLockInfo(userAddress),
      veBalProxy.adjustedBalanceOf(userAddress),
      this.gaugeService.getDatabaseGauges(),
      this.gaugeService.getAllUserShares(userAddress),
    ]);

    const veBALTotalSupply = veBALInfo.totalSupply;
    const workingSupplies = await this.gaugeAprService.getWorkingSupplyForGauges(
      userGauges.map((g) => g.gaugeAddress),
    );

    const boosts = userGauges.map((gaugeShare) => {
      const gaugeAddress = getAddress(gaugeShare.gaugeAddress);
      const dbGauge = databaseGauges.find((g) => g.gaugeAddress === gaugeAddress);
      const gaugeWorkingSupply = bnum(workingSupplies[gaugeAddress]);
      const userGaugeBalance = bnum(gaugeShare.amount);

      const adjustedGaugeBalance = bnum(0.4)
        .times(gaugeWorkingSupply)
        .plus(bnum(0.6).times(bnum(veBALBalance).div(veBALTotalSupply).times(dbGauge.totalSupply)));

      // choose the minimum of either gauge balance or the adjusted gauge balance
      const workingBalance = userGaugeBalance.lt(adjustedGaugeBalance)
        ? userGaugeBalance
        : adjustedGaugeBalance;

      const zeroBoostWorkingBalance = bnum(0.4).times(userGaugeBalance);
      const zeroBoostWorkingSupply = gaugeWorkingSupply
        .minus(workingBalance)
        .plus(zeroBoostWorkingBalance);

      const boostedFraction = workingBalance.div(gaugeWorkingSupply);
      const unboostedFraction = zeroBoostWorkingBalance.div(zeroBoostWorkingSupply);

      const boost = boostedFraction.div(unboostedFraction);

      return {
        poolId: gaugeShare.poolId,
        gaugeAddress,
        boost: boost.toString(),
      };
    });

    return boosts;
  }
}
