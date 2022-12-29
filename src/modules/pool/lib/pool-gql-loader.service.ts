import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { prismaPoolMinimal, prismaPoolWithExpandedNesting } from 'prisma/prisma-types';
import { PoolGqlLoaderUtils } from './gql-loader-utils.service';
import { GqlPoolLinear, QueryPoolGetPoolsArgs } from 'src/gql-addons';

@Injectable()
export class PoolGqlLoaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly poolUtils: PoolGqlLoaderUtils,
  ) {}

  async getPool(id: string) {
    const pool = await this.prisma.prismaPool.findUnique({
      where: { id },
      include: prismaPoolWithExpandedNesting.include,
    });

    if (!pool) {
      throw new Error('Pool with id does not exist');
    }

    if (pool.type === 'UNKNOWN') {
      throw new Error('Pool exists, but has an unknown type');
    }

    return this.poolUtils.mapPoolToGqlPool(pool);
  }

  async getPools(args: QueryPoolGetPoolsArgs): Promise<any[]> {
    // TODO: Cache this a bit?

    const pools = await this.prisma.prismaPool.findMany({
      ...this.poolUtils.mapQueryArgsToPoolQuery(args),
      include: prismaPoolMinimal.include,
    });

    return pools.map((pool) => this.poolUtils.mapToMinimalGqlPool(pool));
  }

  async getPoolsCount(args: QueryPoolGetPoolsArgs): Promise<number> {
    return this.prisma.prismaPool.count({
      where: this.poolUtils.mapQueryArgsToPoolQuery(args).where,
    });
  }

  async getLinearPools(): Promise<GqlPoolLinear[]> {
    const pools = await this.prisma.prismaPool.findMany({
      where: { type: 'LINEAR' },
      orderBy: { dynamicData: { totalLiquidity: 'desc' } },
      include: prismaPoolWithExpandedNesting.include,
    });

    return pools.map((pool) => this.poolUtils.mapPoolToGqlPool(pool)) as GqlPoolLinear[];
  }
}
