import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  GqlPoolSnapshotDataRange,
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetJoinExitsArgs,
  QueryPoolGetPoolsArgs,
  QueryPoolGetUserSwapVolumeArgs,
} from 'src/gql-addons';
import { AdminGuard } from '../common/guards/admin.guard';
import { PoolService } from './pool.service';

@Resolver()
export class PoolMutationResolver {
  constructor(private poolService: PoolService) {}

  @Mutation()
  @UseGuards(AdminGuard)
  async poolSyncAllPoolsFromSubgraph() {
    return this.poolService.syncAllPoolsFromSubgraph();
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
  async poolUpdateLiquidityValuesForAllPools() {}

  @Mutation()
  async poolUpdateVolumeAndFeeValuesForAllPools() {}

  @Mutation()
  async poolSyncSwapsForLast48Hours() {}

  @Mutation()
  async poolLoadOnChainDataForPoolsWithActiveUpdates() {}

  @Mutation()
  async poolUpdateAprs() {}

  @Mutation()
  async poolSyncPoolAllTokensRelationship() {}

  @Mutation()
  async poolReloadAllPoolAprs() {}

  @Mutation()
  async poolSyncTotalShares() {}

  @Mutation()
  async poolReloadStakingForAllPools() {}

  @Mutation()
  async poolSyncStakingForPools() {}

  @Mutation()
  async poolUpdateLiquidity24hAgoForAllPools() {}

  @Mutation()
  async poolLoadSnapshotsForAllPools() {}

  @Mutation()
  async poolSyncLatestSnapshotsForAllPools() {}

  @Mutation()
  async poolUpdateLifetimeValuesForAllPools() {}

  @Mutation()
  async poolInitializeSnapshotsForPool() {}

  @Mutation()
  async poolSyncPool() {}

  @Mutation()
  async poolReloadPoolNestedTokens() {}

  @Mutation()
  async poolReloadAllTokenNestedPoolIds() {}
}
