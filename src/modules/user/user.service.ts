import { Inject, Injectable } from '@nestjs/common';
import { PrismaPoolStaking } from '@prisma/client';
import { formatEther, formatUnits, getAddress } from 'ethers/lib/utils';
import { PrismaService } from 'nestjs-prisma';
import { GqlPoolJoinExit, GqlPoolSwap } from 'src/gql-addons';
import { PoolSwapService } from '../common/pool/pool-swap.service';
import { Multicaller } from '../common/web3/multicaller';
import { UserBalanceService } from './lib/user-balance.service';
import { UserSyncGaugeBalanceService } from './lib/user-sync-gauge-balance.service';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { VeBalLockInfoResult } from './types';
import { UserPoolBalance } from './user-types';
import * as votingEscrowAbi from '../abis/VotingEscrow.json';
import { RPC } from '../common/web3/rpc.provider';
import { AccountWeb3 } from '../common/types';
import { toJsTimestamp } from '../utils/time';
import { networkConfig } from '../config/network-config';
import { bnum } from '@balancer-labs/sor';
import { BigNumber, Contract } from 'ethers';
import { getContractAddress } from '../common/web3/contract';
import { VeGaugeAprService } from '../common/gauges/ve-bal-gauge-apr.service';
import { GaugeService } from '../common/gauges/gauge.service';
import { GaugeUserShare } from '../gauge/types';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { ethNum } from '../utils/old-big-number';

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

  async getUserProtocolRewardInfo(user: string) {
    if (!user) return [];

    const instance = new Contract(
      getContractAddress('SimpleFeeDist'),
      [
        ` function getUserRewards(
      address user
    ) external view returns (address[] memory tokens, uint256[] memory amounts)`,
      ],
      this.rpc.provider,
    );

    // get price data for token or BPT from database
    // token logoURI as well
    // set isBPT as needed

    const poolIdMap = {
      ['0x32934c1122c0d7b0fc3daab588a4490b53c1568c'.toLowerCase()]:
        '0x32934c1122c0d7b0fc3daab588a4490b53c1568c00020000000000000000000e',
      ['0x64bf08fac067b25c77967affafce73760d8d0bdf'.toLowerCase()]:
        '0x64bf08fac067b25c77967affafce73760d8d0bdf000200000000000000000011',
      ['0x6e30ec031f2d94c397e469b40f86bff0be014124'.toLowerCase()]:
        '0x6e30ec031f2d94c397e469b40f86bff0be014124000200000000000000000006',
      ['0x8e15953eba7d5f8f99853d8f3cb64fc73b3ba770'.toLowerCase()]:
        '0x8e15953eba7d5f8f99853d8f3cb64fc73b3ba770000200000000000000000003',
      ['0x9ee22f8b21b53323ae34d153e475aea6363b3ba7'.toLowerCase()]:
        '0x9ee22f8b21b53323ae34d153e475aea6363b3ba7000100000000000000000017',
      ['0xae42be6a9f75a2b53229e262e0488df6ecfeb53a'.toLowerCase()]:
        '0xae42be6a9f75a2b53229e262e0488df6ecfeb53a000200000000000000000012',
      ['0xdb043d8a95ad4d3ae0be21a6b34484a345c93481'.toLowerCase()]:
        '0xdb043d8a95ad4d3ae0be21a6b34484a345c93481000200000000000000000016',
      ['0xeD236c32f695c83Efde232c288701d6f9C23E60E'.toLowerCase()]:
        '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000', // VRTK single token
    };

    const pending = await instance.getUserRewards(user);

    const pendingTokens = pending.tokens.map((t) => t.toLowerCase());

    const [tokens, pools] = await Promise.all([
      this.prisma.prismaToken.findMany({
        where: {
          address: {
            in: pendingTokens,
          },
        },
        include: {
          types: true,
          currentPrice: true,
        },
      }),
      this.prisma.prismaPool.findMany({
        where: {
          address: {
            in: pendingTokens,
          },
        },
        include: {
          tokens: {
            include: {
              token: true,
            },
          },
        },
      }),
    ]);

    const tokenInfos = pendingTokens.map((address, idx) => {
      const token = tokens.find((t) => t.address === address);
      return {
        token: token.address,
        isBPT: token.types.find((type) => type.type === 'BPT') ? true : false,
        valueUSD: ethNum(pending.amounts[idx]) * token.currentPrice.price,
        logoURI: token.logoURI,
      };
    });

    const amountInfo = pending.amounts.map((amt, idx) => {
      return {
        amount: formatEther(amt),
      };
    });

    const vrtkLow = '0xeD236c32f695c83Efde232c288701d6f9C23E60E'.toLowerCase();

    const data = tokenInfos.map((tki, idx) => {
      const poolId = poolIdMap[tki.token];
      const pool = pools.find((p) => p.id === poolId);

      const tokenList = !pool
        ? [tokens.find((t) => t.address === vrtkLow)]
        : pool.tokens.map((t) => t.token);

      return {
        poolId,
        token: tki.token,
        amount: amountInfo[idx].amount,
        tokenInfo: tki,
        isBPT: tki.isBPT,
        tokenList,
      };
    });

    return [data[data.length - 1], ...data.slice(0, data.length - 1)];
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

    const result = await veBalMulticaller.execute<VeBalLockInfoResult>(
      'UserService:getUserVeLockInfo',
    );

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

    const poolGauges = await this.gaugeService.getDatabaseGauges();
    const gaugeAddresses = poolGauges.map((p) => p.gauge.gaugeAddress);

    const [veBALInfo, veBALBalance, userBalanceInfo, workingSupplies] = await Promise.all([
      this.getUserVeLockInfo(userAddress),
      veBalProxy.adjustedBalanceOf(userAddress),
      this.getUserGaugeBalances(userAddress, gaugeAddresses),
      this.gaugeAprService.getWorkingSupplyForGauges(gaugeAddresses),
    ]);

    const userGauges: GaugeUserShare[] = userBalanceInfo.map((info) => {
      const [gaugeAddress, balance] = info;
      const dbPoolGauge = poolGauges.find((p) => p.gauge.gaugeAddress === gaugeAddress);

      return {
        poolId: dbPoolGauge.poolId,
        gaugeAddress,
        amount: formatFixed(balance.balance, 18),
        tokens: [],
      };
    });

    const veBALTotalSupply = veBALInfo.totalSupply;

    const boosts = userGauges.map((gaugeShare) => {
      const gaugeAddress = getAddress(gaugeShare.gaugeAddress);
      const dbPoolGauge = poolGauges.find((p) => p.gauge.gaugeAddress === gaugeAddress);
      const gaugeWorkingSupply = bnum(workingSupplies[gaugeAddress]);
      const userGaugeBalance = bnum(gaugeShare.amount);

      const adjustedGaugeBalance = bnum(0.4)
        .times(gaugeWorkingSupply)
        .plus(
          bnum(0.6).times(
            bnum(veBALBalance).div(veBALTotalSupply).times(dbPoolGauge.gauge.totalSupply),
          ),
        );

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

  async getUserGaugeBalances(userAddress: string, gaugeAddresses: string[]) {
    const multiCaller = new Multicaller(this.rpc, [
      'function balanceOf(address) public view returns(uint)',
    ]);

    gaugeAddresses.forEach((g) => multiCaller.call(`${g}.balance`, g, 'balanceOf', [userAddress]));

    return Object.entries(
      await multiCaller.execute<Record<string, { balance: BigNumber }>>(
        'UserService:getUserGaugeBalances',
      ),
    ).filter((info) => !info[1].balance.isZero());
  }
}
