import { Injectable } from '@nestjs/common';
import { PrismaPoolSwap } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolBatchSwapWithSwaps, prismaPoolMinimal } from 'prisma/prisma-types';
import { QueryPoolGetBatchSwapsArgs, QueryPoolGetSwapsArgs } from 'src/gql-addons';

@Injectable()
export class PoolSwapService {
  constructor(private prisma: PrismaService) {}

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
}
