import { Injectable } from '@nestjs/common';
import { PrismaPoolSwap } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolBatchSwapWithSwaps, prismaPoolMinimal } from 'prisma/prisma-types';
import {
  GqlPoolJoinExit,
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetJoinExitsArgs,
  QueryPoolGetSwapsArgs,
} from 'src/gql-addons';
import {
  JoinExit_OrderBy,
  OrderDirection,
} from 'src/modules/subgraphs/balancer/balancer-subgraph-types';
import { BalancerSubgraphService } from 'src/modules/subgraphs/balancer/balancer-subgraph.service';

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
}
