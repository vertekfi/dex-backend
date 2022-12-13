import { Inject, Injectable } from '@nestjs/common';
import { PrismaPoolCategoryType } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'nestjs-prisma';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { getPoolConfigData } from './pool-utils';

interface PoolDataConfig {
  incentivizedPools: string[];
  blacklistedPools: string[];
  poolFilters: {
    id: string;
    title: string;
    pools: string[];
  }[];
}

@Injectable()
export class PoolDataLoaderService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
  ) {}

  async syncPoolConfigData() {
    const response: PoolDataConfig = await getPoolConfigData(this.rpc.chainId);

    const config: PoolDataConfig = {
      incentivizedPools: response?.incentivizedPools ?? [],
      blacklistedPools: response?.blacklistedPools ?? [],
      poolFilters: response?.poolFilters ?? [],
    };

    const categories = await this.prisma.prismaPoolCategory.findMany({});
    const incentivized = categories
      .filter((item) => item.category === 'INCENTIVIZED')
      .map((item) => item.poolId);
    const blacklisted = categories
      .filter((item) => item.category === 'BLACK_LISTED')
      .map((item) => item.poolId);

    await this.updatePoolCategory(incentivized, config.incentivizedPools, 'INCENTIVIZED');
    await this.updatePoolCategory(blacklisted, config.blacklistedPools, 'BLACK_LISTED');

    await this.prisma.$transaction([
      this.prisma.prismaPoolFilterMap.deleteMany({}),
      this.prisma.prismaPoolFilter.deleteMany({}),
      this.prisma.prismaPoolFilter.createMany({
        data: config.poolFilters.map((item) => ({
          id: item.id,
          title: item.title,
        })),
        skipDuplicates: true,
      }),
      this.prisma.prismaPoolFilterMap.createMany({
        data: config.poolFilters
          .map((item) => {
            return item.pools.map((poolId) => ({
              id: `${item.id}-${poolId}`,
              poolId,
              filterId: item.id,
            }));
          })
          .flat(),
        skipDuplicates: true,
      }),
    ]);
  }

  private async updatePoolCategory(
    currentPoolIds: string[],
    newPoolIds: string[],
    category: PrismaPoolCategoryType,
  ) {
    const itemsToAdd = newPoolIds.filter((poolId) => !currentPoolIds.includes(poolId));
    const itemsToRemove = currentPoolIds.filter((poolId) => !newPoolIds.includes(poolId));

    // make sure the pools really exist to prevent sanity mistakes from breaking the system
    const pools = await this.prisma.prismaPool.findMany({
      where: { id: { in: itemsToAdd } },
      select: { id: true },
    });
    const poolIds = pools.map((pool) => pool.id);
    const existingItemsToAdd = itemsToAdd.filter((poolId) => poolIds.includes(poolId));

    await this.prisma.$transaction([
      this.prisma.prismaPoolCategory.createMany({
        data: existingItemsToAdd.map((poolId) => ({
          id: `${poolId}-${category}`,
          category,
          poolId,
        })),
        skipDuplicates: true,
      }),
      this.prisma.prismaPoolCategory.deleteMany({
        where: { poolId: { in: itemsToRemove }, category },
      }),
    ]);
  }
}
