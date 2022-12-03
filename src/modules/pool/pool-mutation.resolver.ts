import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  GqlPoolSnapshotDataRange,
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetJoinExitsArgs,
  QueryPoolGetPoolsArgs,
  QueryPoolGetUserSwapVolumeArgs,
} from 'src/gql-addons';
import { PoolService } from './pool.service';

@Resolver()
export class PoolMutationResolver {
  constructor(private poolService: PoolService) {}

  @Mutation()
  async poolSyncAllPoolsFromSubgraph() {}

  @Mutation()
  async poolSyncNewPoolsFromSubgraph() {}

  @Mutation()
  async poolLoadOnChainDataForAllPools() {}

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
