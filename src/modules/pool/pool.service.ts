import { Inject } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import { PrismaPoolFilter, PrismaPoolSwap } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import * as moment from 'moment-timezone';

import {
  GqlPoolFeaturedPoolGroup,
  GqlPoolJoinExit,
  GqlPoolLinear,
  GqlPoolSnapshotDataRange,
  GqlPoolUserSwapVolume,
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetJoinExitsArgs,
  QueryPoolGetPoolsArgs,
  QueryPoolGetSwapsArgs,
  QueryPoolGetUserSwapVolumeArgs,
} from 'src/gql-addons';
import { GqlPoolMinimal } from 'src/graphql';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolCreatorService } from './lib/pool-creator.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolOnChainDataService } from '../common/pool/pool-on-chain-data.service';
import { PoolSnapshotService } from '../common/pool/pool-snapshot.service';
import { PoolSwapService } from '../common/pool/pool-swap.service';
import { PoolUsdDataService } from './lib/pool-usd-data.service';
import { BalancerSubgraphService } from '../subgraphs/balancer/balancer-subgraph.service';
import { PoolAprUpdaterService } from './lib/pool-apr-updater.service';
import { PoolSyncService } from './lib/pool-sync.service';
import { prismaPoolMinimal } from 'prisma/prisma-types';
import { ProtocolService } from '../protocol/protocol.service';
import { SwapFeeAprService } from './lib/aprs/swap-fee-apr.service';
import { VeGaugeAprService } from '../common/gauges/ve-bal-gauge-apr.service';
import { GaugeService } from '../common/gauges/gauge.service';
import { TokenPriceService } from '../common/token/pricing/token-price.service';
import { networkConfig } from '../config/network-config';
import { BlockService } from '../common/web3/block.service';
import { APR_SERVICES } from './lib/providers/apr-services.provider';
import { PoolAprService } from './pool-types';

@Injectable()
export class PoolService {
  constructor(
    @Inject(APR_SERVICES) private readonly aprServices: PoolAprService[],
    private readonly prisma: PrismaService,
    private readonly poolGqlLoaderService: PoolGqlLoaderService,
    private readonly poolSwapService: PoolSwapService,
    private readonly poolUtils: PoolGqlLoaderUtils,
    private readonly poolSnapshotService: PoolSnapshotService,
    private readonly poolCreatorService: PoolCreatorService,
    private readonly poolOnChainDataService: PoolOnChainDataService,
    private readonly poolUsdDataService: PoolUsdDataService,
    private readonly balancerSubgraphService: BalancerSubgraphService,
    private readonly poolAprUpdaterService: PoolAprUpdaterService,
    private readonly poolSyncService: PoolSyncService,
    private readonly protocolService: ProtocolService,
    private readonly gaugeService: GaugeService,
    private readonly pricingService: TokenPriceService,
    private readonly blockService: BlockService,
  ) {}

  async getGqlPool(id: string) {
    return this.poolGqlLoaderService.getPool(id);
  }

  async getGqlPools(args: QueryPoolGetPoolsArgs): Promise<GqlPoolMinimal[]> {
    return this.poolGqlLoaderService.getPools(args);
  }

  async getGqlLinearPools(): Promise<GqlPoolLinear[]> {
    return this.poolGqlLoaderService.getLinearPools();
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

  async getFeaturedPoolGroups(): Promise<GqlPoolFeaturedPoolGroup[]> {
    const config = await this.protocolService.getProtocolConfigDataForChain();
    const pools = await this.prisma.prismaPool.findMany({
      where: {
        id: {
          in: config.featuredPools || [],
        },
      },
      include: prismaPoolMinimal.include,
    });

    const featured: GqlPoolFeaturedPoolGroup[] = pools.map((pool, i): GqlPoolFeaturedPoolGroup => {
      return {
        id: pool.id,
        title: '',
        icon: '',
        items: [
          // {
          //   __typename: 'GqlFeaturePoolGroupItemExternalLink',
          //   id: '',
          //   image: '',
          //   buttonText: '',
          //   buttonUrl: '',
          // },
          {
            __typename: 'GqlPoolMinimal',
            ...this.poolUtils.mapToMinimalGqlPool(pool),
          },
        ],
      };
    });

    return featured;
  }

  async getSnapshotsForAllPools(range: GqlPoolSnapshotDataRange) {
    return this.poolSnapshotService.getSnapshotsForAllPools(range);
  }

  async getSnapshotsForPool(poolId: string, range: GqlPoolSnapshotDataRange) {
    return this.poolSnapshotService.getSnapshotsForPool(poolId, range);
  }

  async syncPoolAllTokensRelationship(): Promise<void> {
    const pools = await this.prisma.prismaPool.findMany({ select: { id: true } });

    for (const pool of pools) {
      await this.poolCreatorService.createAllTokensRelationshipForPool(pool.id);
    }
  }

  async syncNewPoolsFromSubgraph(): Promise<string[]> {
    const blockNumber = await this.blockService.getBlockNumber();

    const poolIds = await this.poolCreatorService.syncNewPoolsFromSubgraph(blockNumber);

    if (poolIds.length > 0) {
      await this.updateOnChainDataForPools(poolIds, blockNumber);
      await this.syncSwapsForLast48Hours();
      await this.updateVolumeAndFeeValuesForPools(poolIds);
    }

    return poolIds;
  }

  async loadOnChainDataForAllPools(): Promise<void> {
    const result = await this.prisma.prismaPool.findMany({
      select: { id: true },
      where: {
        categories: {
          none: { category: 'BLACK_LISTED' },
        },
        // isV1: false,
      },
    });
    const poolIds = result.map((item) => item.id);
    const blockNumber = await this.blockService.getBlockNumber();

    const chunks = _.chunk(poolIds, 100);

    for (const chunk of chunks) {
      await this.poolOnChainDataService.updateOnChainData(chunk, blockNumber);
    }
  }

  async updateOnChainDataForPools(poolIds: string[], blockNumber: number) {
    await this.poolOnChainDataService.updateOnChainData(poolIds, blockNumber);
  }

  async loadOnChainDataForPoolsWithActiveUpdates() {
    const blockNumber = await this.blockService.getBlockNumber();
    const timestamp = moment().subtract(5, 'minutes').unix();
    console.time('getPoolsWithActiveUpdates');
    const poolIds = await this.balancerSubgraphService.getPoolsWithActiveUpdates(timestamp);
    console.timeEnd('getPoolsWithActiveUpdates');

    console.time('updateOnChainData');
    await this.poolOnChainDataService.updateOnChainData(poolIds, blockNumber);
    console.timeEnd('updateOnChainData');
  }

  async updateLiquidityValuesForPools(minShares?: number, maxShares?: number): Promise<void> {
    await this.poolUsdDataService.updateLiquidityValuesForPools(minShares, maxShares);
  }

  async updateVolumeAndFeeValuesForPools(poolIds?: string[]): Promise<void> {
    console.time('updateVolumeAndFeeValuesForPools');
    await this.poolUsdDataService.updateVolumeAndFeeValuesForPools(poolIds);
    console.timeEnd('updateVolumeAndFeeValuesForPools');
  }

  async syncSwapsForLast48Hours(): Promise<string[]> {
    console.time('syncSwapsForLast48Hours');
    const poolIds = await this.poolSwapService.syncSwapsForLast48Hours();
    console.timeEnd('syncSwapsForLast48Hours');

    return poolIds;
  }

  async updatePoolAprs() {
    // TODO: Use ProtocolFeePercentagesProvider to get protocol fee
    // Also move all of this apr stuff into its own concern/service
    const swaps = new SwapFeeAprService(this.prisma, 0.5);
    // await this.poolAprUpdaterService.updatePoolAprs([swaps, ...this.aprServices]);
    await this.poolAprUpdaterService.updatePoolAprs([...this.aprServices, swaps]);
  }

  async syncChangedPools() {
    const { startBlock, endBlock, latestBlock } = await this.poolSyncService.syncChangedPools();
    const poolIds = await this.poolSyncService.getChangedPoolIds(startBlock, endBlock);

    if (poolIds.length !== 0) {
      console.log(`Syncing ${poolIds.length} pools`);
      await this.updateOnChainDataForPools(poolIds, latestBlock);

      const poolsWithNewSwaps = await this.syncSwapsForLast48Hours();
      await this.updateVolumeAndFeeValuesForPools(poolsWithNewSwaps);
    }
  }

  async reloadAllPoolAprs() {
    await this.updatePoolAprs();
  }

  async updateLiquidity24hAgoForAllPools() {
    await this.poolUsdDataService.updateLiquidity24hAgoForAllPools();
  }

  async loadSnapshotsForAllPools() {
    await this.prisma.prismaPoolSnapshot.deleteMany({});
    const pools = await this.prisma.prismaPool.findMany({
      select: { id: true },
      where: {
        dynamicData: {
          totalSharesNum: {
            gt: 0.000000000001,
          },
        },
      },
    });

    const chunks = _.chunk(pools, 10);

    for (const chunk of chunks) {
      const poolIds = chunk.map((pool) => pool.id);
      await this.poolSnapshotService.loadAllSnapshotsForPools(poolIds);
    }
  }

  async syncLatestSnapshotsForAllPools(daysToSync?: number) {
    await this.poolSnapshotService.syncLatestSnapshotsForAllPools(daysToSync);
  }

  async updateLifetimeValuesForAllPools() {
    await this.poolUsdDataService.updateLifetimeValuesForAllPools();
  }

  async createPoolSnapshotsForPoolsMissingSubgraphData(poolId: string) {
    await this.poolSnapshotService.createPoolSnapshotsForPoolsMissingSubgraphData(poolId);
  }

  async reloadPoolNestedTokens(poolId: string) {
    await this.poolCreatorService.reloadPoolNestedTokens(poolId);
  }

  async reloadAllTokenNestedPoolIds() {
    await this.poolCreatorService.reloadAllTokenNestedPoolIds();
  }
}
