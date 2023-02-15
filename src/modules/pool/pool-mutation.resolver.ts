import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { AccountWeb3 } from '../common/types';
import { RPC } from '../common/web3/rpc.provider';
import { PoolDataLoaderService } from './lib/pool-data-loader.service';
import { PoolSyncService } from './lib/pool-sync.service';
import { PoolService } from './pool.service';

@Resolver()
@UseGuards(AdminGuard)
export class PoolMutationResolver {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly poolService: PoolService,
    private readonly poolDataSync: PoolDataLoaderService,
    private readonly poolSyncService: PoolSyncService,
  ) {}

  @Mutation()
  async poolSyncAllPoolsFromSubgraph() {
    return this.poolSyncService.syncAllPoolsFromSubgraph();
  }

  @Mutation()
  async poolSyncNewPoolsFromSubgraph() {
    return this.poolService.syncNewPoolsFromSubgraph();
  }

  @Mutation()
  async poolLoadOnChainDataForAllPools() {
    await this.poolService.loadOnChainDataForAllPools();
    return 'success';
  }

  @Mutation()
  async poolLoadOnChainDataForPoolsWithActiveUpdates() {
    await this.poolService.loadOnChainDataForPoolsWithActiveUpdates();
    return 'success';
  }

  @Mutation()
  async poolSyncSanityPoolData() {
    await this.poolDataSync.syncPoolConfigData();
    return 'success';
  }

  @Mutation()
  async poolUpdateLiquidityValuesForAllPools() {
    await this.poolService.updateLiquidityValuesForPools();
    return 'success';
  }

  @Mutation()
  async poolUpdateVolumeAndFeeValuesForAllPools() {
    await this.poolService.updateVolumeAndFeeValuesForPools();
    return 'success';
  }

  @Mutation()
  async poolSyncSwapsForLast48Hours() {
    await this.poolService.syncSwapsForLast48Hours();
    return 'success';
  }

  @Mutation()
  async poolUpdateAprs() {
    await this.poolService.updatePoolAprs();
    return 'success';
  }

  @Mutation()
  async poolSyncPoolAllTokensRelationship() {
    await this.poolService.syncPoolAllTokensRelationship();
    return 'success';
  }

  @Mutation()
  async poolReloadAllPoolAprs() {
    await this.poolService.reloadAllPoolAprs();
    return 'success';
  }

  @Mutation()
  async poolSyncTotalShares() {
    await this.poolSyncService.syncPoolTotalShares();
    return 'success';
  }

  @Mutation()
  async poolUpdateLiquidity24hAgoForAllPools() {
    await this.poolService.updateLiquidity24hAgoForAllPools();
    return 'success';
  }

  @Mutation()
  async poolLoadSnapshotsForAllPools() {
    await this.poolService.loadSnapshotsForAllPools();
    return 'success';
  }

  @Mutation()
  async poolSyncLatestSnapshotsForAllPools(@Args('daysToSync') daysToSync) {
    await this.poolService.syncLatestSnapshotsForAllPools(daysToSync || undefined);
    return 'success';
  }

  @Mutation()
  async poolUpdateLifetimeValuesForAllPools() {
    await this.poolService.updateLifetimeValuesForAllPools();
    return 'success';
  }

  @Mutation()
  async poolInitializeSnapshotsForPool(@Args('poolId') poolId) {
    await this.poolService.createPoolSnapshotsForPoolsMissingSubgraphData(poolId);
    return 'success';
  }

  @Mutation()
  async poolSyncPool(@Args('poolId') poolId) {
    const latestBlockNumber = await this.rpc.provider.getBlockNumber();
    await this.poolService.updateOnChainDataForPools([poolId], latestBlockNumber);

    return 'success';
  }

  @Mutation()
  async poolReloadPoolNestedTokens(@Args('poolId') poolId) {
    await this.poolService.reloadPoolNestedTokens(poolId);
    return 'success';
  }

  @Mutation()
  async poolReloadAllTokenNestedPoolIds() {
    await this.poolService.reloadAllTokenNestedPoolIds();
    return 'success';
  }
}
