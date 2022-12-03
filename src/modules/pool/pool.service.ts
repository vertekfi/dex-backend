import { Inject } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaPoolFilter, PrismaPoolSwap } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  GqlPoolFeaturedPoolGroup,
  GqlPoolJoinExit,
  GqlPoolSnapshotDataRange,
  GqlPoolUserSwapVolume,
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetJoinExitsArgs,
  QueryPoolGetPoolsArgs,
  QueryPoolGetSwapsArgs,
  QueryPoolGetUserSwapVolumeArgs,
} from 'src/gql-addons';
import { GqlPoolMinimal } from 'src/graphql';
import { CacheService } from '../common/cache.service';
import { AccountWeb3 } from '../common/types';
import { RPC } from '../common/web3/rpc.provider';
import { FEATURED_POOLS } from './data/home-screen-info';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolCreatorService } from './lib/pool-creator.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolSnapshotService } from './lib/pool-snapshot.service';
import { PoolSwapService } from './lib/pool-swap.service';

const FEATURED_POOL_GROUPS_CACHE_KEY = 'pool:featuredPoolGroups';
const HOME_SCREEN_CONFIG_CACHE_KEY = 'content:homeScreen';

@Injectable()
export class PoolService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly poolGqlLoaderService: PoolGqlLoaderService,
    private readonly poolSwapService: PoolSwapService,
    private readonly poolUtils: PoolGqlLoaderUtils,
    private readonly cache: CacheService,
    private readonly poolSnapshotService: PoolSnapshotService,
    private readonly poolCreatorService: PoolCreatorService,
  ) {}

  async getGqlPool(id: string) {
    return this.poolGqlLoaderService.getPool(id);
  }

  async getGqlPools(args: QueryPoolGetPoolsArgs): Promise<GqlPoolMinimal[]> {
    return this.poolGqlLoaderService.getPools(args);
  }

  async getPoolsCount(args: QueryPoolGetPoolsArgs): Promise<number> {
    return this.poolGqlLoaderService.getPoolsCount(args);
  }

  async getPoolFilters(): Promise<PrismaPoolFilter[]> {
    return this.prisma.prismaPoolFilter.findMany({});
  }

  async getPoolSwaps(args: QueryPoolGetSwapsArgs): Promise<PrismaPoolSwap[]> {
    return this.poolSwapService.getSwaps(args);
  }

  async getPoolBatchSwaps(args: QueryPoolGetBatchSwapsArgs) {
    const batchSwaps = await this.poolSwapService.getBatchSwaps(args);

    return batchSwaps.map((batchSwap) => ({
      ...batchSwap,
      swaps: batchSwap.swaps.map((swap) => {
        return {
          ...swap,
          pool: this.poolUtils.mapToMinimalGqlPool(swap.pool),
        };
      }),
    }));
  }

  async getPoolJoinExits(args: QueryPoolGetJoinExitsArgs): Promise<GqlPoolJoinExit[]> {
    return this.poolSwapService.getJoinExits(args);
  }

  async getPoolUserSwapVolume(
    args: QueryPoolGetUserSwapVolumeArgs,
  ): Promise<GqlPoolUserSwapVolume[]> {
    return this.poolSwapService.getUserSwapVolume(args);
  }

  getFeaturedPoolGroups(): GqlPoolFeaturedPoolGroup[] {
    return FEATURED_POOLS;
  }

  async getSnapshotsForAllPools(range: GqlPoolSnapshotDataRange) {
    return this.poolSnapshotService.getSnapshotsForAllPools(range);
  }

  async getSnapshotsForPool(poolId: string, range: GqlPoolSnapshotDataRange) {
    return this.poolSnapshotService.getSnapshotsForPool(poolId, range);
  }

  async syncAllPoolsFromSubgraph(): Promise<string[]> {
    const blockNumber = await this.rpc.provider.getBlockNumber();

    return this.poolCreatorService.syncAllPoolsFromSubgraph(blockNumber);
  }
}
