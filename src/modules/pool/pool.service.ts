import { Injectable } from '@nestjs/common';
import { PrismaPoolFilter, PrismaPoolSwap } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetPoolsArgs,
  QueryPoolGetSwapsArgs,
} from 'src/gql-addons';
import { GqlPoolBatchSwap, GqlPoolMinimal } from 'src/graphql';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolSwapService } from './lib/pool-swap.service';

@Injectable()
export class PoolService {
  constructor(
    private prisma: PrismaService,
    private poolGqlLoaderService: PoolGqlLoaderService,
    private poolSwapService: PoolSwapService,
    private poolUtils: PoolGqlLoaderUtils,
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
}
