import { Inject, Injectable } from '@nestjs/common';
import { PrismaPoolStaking, PrismaTokenCurrentPrice } from '@prisma/client';
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
import { getTokenAddress } from '../common/token/utils';

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
      getContractAddress('FeeDistributor'),
      [
        `function claimTokens(
          address user, address[] tokens
        ) external view returns ( uint256[] memory)`,
      ],
      this.rpc.provider,
    );

    const addies = [
      '0x0db861235c7b90d419a64e1f71b3687db74d4477',
      '0x8e15953eba7d5f8f99853d8f3cb64fc73b3ba770',
      '0x6e30ec031f2d94c397e469b40f86bff0be014124',
      '0x32934c1122c0d7b0fc3daab588a4490b53c1568c',
      '0x64bf08fac067b25c77967affafce73760d8d0bdf',
      '0xae42be6a9f75a2b53229e262e0488df6ecfeb53a',
      '0xcf61cf9654f5536b8d6c93f09a0308ff3c2650f9',
      '0xdb043d8a95ad4d3ae0be21a6b34484a345c93481',
      '0x9ee22f8b21b53323ae34d153e475aea6363b3ba7',
      '0xeD236c32f695c83Efde232c288701d6f9C23E60E',
    ].map((t) => t.toLowerCase());

    const vrtkLow = getTokenAddress('VRTK').toLowerCase();

    const [tokenPrices, pools, vrtkTokenInfo] = await Promise.all([
      this.prisma.prismaTokenCurrentPrice.findMany({}),
      this.prisma.prismaPool.findMany({
        where: {
          categories: {
            none: {
              category: 'BLACK_LISTED',
            },
          },
          type: {
            not: 'STABLE', // These do not pay fees in BPT's
          },
          address: {
            in: addies,
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
      this.prisma.prismaToken.findFirstOrThrow({
        where: {
          address: vrtkLow,
        },
      }),
    ]);

    const poolAddresses = pools.map((p) => p.address).concat(vrtkLow);
    const pending: BigNumber[] = await instance.claimTokens(user, poolAddresses);

    const rewards = pending
      .filter((p) => !p.isZero())
      .map((p, i) => {
        // Account for solo VRTK in all of this
        const pool = pools[i];
        let price: PrismaTokenCurrentPrice;

        if (pool) {
          price = tokenPrices.find((price) => price.tokenAddress === pool.address);
        } else {
          price = tokenPrices.find((price) => price.tokenAddress === vrtkLow);
        }

        return {
          token: pool ? pool.address : vrtkLow,
          isBPT: pool ? true : false,
          poolId: pool ? pool.id : networkConfig.balancer.votingEscrow.lockablePoolId,
          amount: formatEther(p),
          tokenInfo: {
            valueUSD: ethNum(p) * price.price,
            logoURI: pool ? null : vrtkTokenInfo.logoURI,
          },
          tokenList: pool ? pool.tokens.map((t) => t.token) : [vrtkTokenInfo],
        };
      });

    return rewards.sort((r1, r2) =>
      r2.poolId === networkConfig.balancer.votingEscrow.lockablePoolId ? 1 : -1,
    );
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
        boost: veBALInfo.isExpired ? '1' : boost.toString(),
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
