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
import { FEATURED_POOLS } from './data/home-screen-info';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolSnapshotService } from './lib/pool-snapshot.service';
import { PoolSwapService } from './lib/pool-swap.service';

const FEATURED_POOL_GROUPS_CACHE_KEY = 'pool:featuredPoolGroups';
const HOME_SCREEN_CONFIG_CACHE_KEY = 'content:homeScreen';

@Injectable()
export class PoolService {
  constructor(
    private prisma: PrismaService,
    private poolGqlLoaderService: PoolGqlLoaderService,
    private poolSwapService: PoolSwapService,
    private poolUtils: PoolGqlLoaderUtils,
    private cache: CacheService,
    private poolSnapshotService: PoolSnapshotService,
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
}
