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
    const pools = await this.prisma.prismaPool.findMany({
      ...this.poolUtils.mapQueryArgsToPoolQuery(args),
      include: prismaPoolMinimal.include,
    });

    const filtered = [];
    const remove = [
      '0xf20e2badc2fcd36708f442aa554fd4494e3042c8000200000000000000000004',
      '0x94cbf85d049ab5a122348324b53dc4a9b751f08400020000000000000000000d',
      '0xeb49e7e8ebdd44651c53eca40a844866d8825ab3000200000000000000000005',
      '0x8a925563418ae30f2c83bbdb6b107a152e84d405000200000000000000000010',
      '0x6f1a24488736d0a45d5cb9079bc3ce328b9c8254000200000000000000000009',
    ];
    pools.forEach((p) => {
      if (!remove.find((pi) => pi === p.id)) {
        filtered.push(p);
      }
    });

    const data = filtered.map((pool) => this.poolUtils.mapToMinimalGqlPool(pool));

    const fml = data.find(
      (p) => p.id == '0x6e30ec031f2d94c397e469b40f86bff0be014124000200000000000000000006',
    );
    console.log(fml);

    return data;
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
