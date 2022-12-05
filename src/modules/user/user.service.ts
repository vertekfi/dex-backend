import { Injectable } from '@nestjs/common';
import { PrismaPoolStaking, PrismaPoolStakingType } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { GqlPoolJoinExit, GqlPoolSwap } from 'src/gql-addons';
import { PoolSwapService } from '../common/pool/pool-swap.service';
import { UserBalanceService } from './lib/user-balance.service';
import { UserSyncGaugeBalanceService } from './lib/user-sync-gauge-balance.service';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { UserPoolBalance } from './user-types';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletSyncService: UserSyncWalletBalanceService,
    private readonly userBalanceService: UserBalanceService,
    private readonly poolSwapService: PoolSwapService,
    private readonly gaugeSyncService: UserSyncGaugeBalanceService,
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
  }

  async syncUserBalanceAllPools(userAddress: string) {
    const allBalances = await this.userBalanceService.getUserPoolBalances(userAddress);
    for (const userPoolBalance of allBalances) {
      this.syncUserBalance(userAddress, userPoolBalance.poolId);
    }
  }
}
