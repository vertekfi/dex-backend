import { Injectable } from '@nestjs/common';
import { PrismaPoolCategoryType } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { ProtocolService } from 'src/modules/protocol/protocol.service';
import { PoolFilter } from 'src/modules/protocol/types';

interface PoolDataConfig {
  incentivizedPools: string[];
  blacklistedPools: string[];
  poolFilters: PoolFilter[];
}

@Injectable()
export class PoolDataLoaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocolService: ProtocolService,
  ) {}

  async syncPoolConfigData() {
    const response: PoolDataConfig = await this.protocolService.getProtocolConfigDataForChain();

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
