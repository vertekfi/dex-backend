import { Injectable } from '@nestjs/common';
import { PrismaPoolSwap } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolBatchSwapWithSwaps, prismaPoolMinimal } from 'prisma/prisma-types';
import {
  GqlPoolJoinExit,
  GqlPoolSwap,
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetJoinExitsArgs,
  QueryPoolGetSwapsArgs,
  QueryPoolGetUserSwapVolumeArgs,
} from 'src/gql-addons';
import {
  JoinExit_OrderBy,
  OrderDirection,
  Swap_OrderBy,
} from 'src/modules/subgraphs/balancer/balancer-subgraph-types';
import { BalancerSubgraphService } from 'src/modules/subgraphs/balancer/balancer-subgraph.service';
import * as moment from 'moment-timezone';

@Injectable()
export class PoolSwapService {
  constructor(
    private prisma: PrismaService,
    private balancerSubgraphService: BalancerSubgraphService,
  ) {}

  async getSwaps(args: QueryPoolGetSwapsArgs): Promise<PrismaPoolSwap[]> {
    const take = !args.first || args.first > 100 ? 10 : args.first;

    return this.prisma.prismaPoolSwap.findMany({
      take,
      skip: args.skip || undefined,
      where: {
        poolId: {
          in: args.where?.poolIdIn || undefined,
        },
        tokenIn: {
          in: args.where?.tokenInIn || undefined,
        },
        tokenOut: {
          in: args.where?.tokenOutIn || undefined,
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getBatchSwaps(args: QueryPoolGetBatchSwapsArgs): Promise<PrismaPoolBatchSwapWithSwaps[]> {
    const take = !args.first || args.first > 100 ? 10 : args.first;

    return this.prisma.prismaPoolBatchSwap.findMany({
      take,
      skip: args.skip || undefined,
      where: {
        swaps: args.where?.poolIdIn
          ? {
              some: {
                poolId: {
                  in: args.where.poolIdIn,
                },
              },
            }
          : undefined,
        tokenIn: {
          in: args.where?.tokenInIn || undefined,
        },
        tokenOut: {
          in: args.where?.tokenOutIn || undefined,
        },
      },
      orderBy: { timestamp: 'desc' },
      include: {
        swaps: { include: { pool: { include: prismaPoolMinimal.include } } },
      },
    });
  }

  async getJoinExits(args: QueryPoolGetJoinExitsArgs): Promise<GqlPoolJoinExit[]> {
    const first = !args.first || args.first > 100 ? 10 : args.first;

    const { joinExits } = await this.balancerSubgraphService.getPoolJoinExits({
      where: { pool_in: args.where?.poolIdIn },
      first,
      skip: args.skip,
      orderBy: JoinExit_OrderBy.Timestamp,
      orderDirection: OrderDirection.Desc,
    });

    return joinExits.map((joinExit) => ({
      ...joinExit,
      __typename: 'GqlPoolJoinExit',
      poolId: joinExit.pool.id,
      amounts: joinExit.amounts.map((amount, index) => ({
        address: joinExit.pool.tokensList[index],
        amount,
      })),
    }));
  }

  async getUserJoinExitsForPool(
    userAddress: string,
    poolId: string,
    first = 10,
    skip = 0,
  ): Promise<GqlPoolJoinExit[]> {
    const { joinExits } = await this.balancerSubgraphService.getPoolJoinExits({
      where: { pool: poolId, user: userAddress },
      first,
      skip: skip,
      orderBy: JoinExit_OrderBy.Timestamp,
      orderDirection: OrderDirection.Desc,
    });

    return joinExits.map((joinExit) => ({
      ...joinExit,
      __typename: 'GqlPoolJoinExit',
      poolId: joinExit.pool.id,
      amounts: joinExit.amounts.map((amount, index) => ({
        address: joinExit.pool.tokensList[index],
        amount,
      })),
    }));
  }

  async getUserSwapsForPool(
    userAddress: string,
    poolId: string,
    first = 10,
    skip = 0,
  ): Promise<GqlPoolSwap[]> {
    const result = await this.balancerSubgraphService.getSwaps({
      first,
      skip,
      where: {
        poolId,
        userAddress,
      },
      orderBy: Swap_OrderBy.Timestamp,
      orderDirection: OrderDirection.Desc,
    });

    return result.swaps.map((swap) => ({
      id: swap.id,
      userAddress,
      poolId: swap.poolId.id,
      tokenIn: swap.tokenIn,
      tokenAmountIn: swap.tokenAmountIn,
      tokenOut: swap.tokenOut,
      tokenAmountOut: swap.tokenAmountOut,
      valueUSD: parseFloat(swap.valueUSD),
      timestamp: swap.timestamp,
      tx: swap.tx,
    }));
  }

  async getUserSwapVolume(args: QueryPoolGetUserSwapVolumeArgs) {
    const yesterday = moment().subtract(1, 'day').unix();
    const take = !args.first || args.first > 100 ? 10 : args.first;

    const result = await this.prisma.prismaPoolSwap.groupBy({
      take,
      skip: args.skip || undefined,
      by: ['userAddress'],
      _sum: { valueUSD: true },
      orderBy: { _sum: { valueUSD: 'desc' } },
      where: {
        poolId: { in: args.where?.poolIdIn || undefined },
        tokenIn: { in: args.where?.tokenInIn || undefined },
        tokenOut: { in: args.where?.tokenOutIn || undefined },
        timestamp: { gte: yesterday },
      },
    });

    return result.map((item) => ({
      userAddress: item.userAddress,
      swapVolumeUSD: `${item._sum.valueUSD || 0}`,
    }));
  }
}
