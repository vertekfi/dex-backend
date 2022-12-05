import { Injectable } from '@nestjs/common';
import { PrismaPoolStaking, PrismaPoolStakingType } from '@prisma/client';
import { GqlPoolJoinExit, GqlPoolSwap } from 'src/gql-addons';
import { PoolSwapService } from '../common/pool/pool-swap.service';
import { UserBalanceService } from './lib/user-balance.service';
import { UserSyncGaugeBalanceService } from './lib/user-sync-gauge-balance.service';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { UserPoolBalance } from './user-types';

@Injectable()
export class UserService {
  constructor(
    private readonly walletSyncService: UserSyncWalletBalanceService,
    private readonly userBalanceService: UserBalanceService,
    private readonly poolSwapService: PoolSwapService,
    private readonly stakedSyncServices: UserSyncGaugeBalanceService,
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
    this.stakedSyncServices.initStakedBalances();
  }
}
