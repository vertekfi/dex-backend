import { Injectable } from '@nestjs/common';
import { PrismaPoolSwap } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { QueryPoolGetSwapsArgs } from 'src/gql-addons';

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
}
