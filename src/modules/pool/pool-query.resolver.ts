import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  GqlPoolSnapshotDataRange,
  QueryPoolGetBatchSwapsArgs,
  QueryPoolGetJoinExitsArgs,
  QueryPoolGetPoolsArgs,
  QueryPoolGetSwapsArgs,
  QueryPoolGetUserSwapVolumeArgs,
} from 'src/gql-addons';
import { PoolService } from './pool.service';

@Resolver()
export class PoolQueryResolver {
  constructor(private poolService: PoolService) {}

  @Query()
  async poolGetPool(@Args('id') id: string) {
    return this.poolService.getGqlPool(id);
  }

  @Query()
  async poolGetPools(@Args() args: QueryPoolGetPoolsArgs) {
    return this.poolService.getGqlPools(args);
  }

  @Query()
  async poolGetPoolsCount(@Args() args: QueryPoolGetPoolsArgs) {
    return this.poolService.getPoolsCount(args);
  }

  @Query()
  async poolGetPoolFilters() {
    return this.poolService.getPoolFilters();
  }

  @Query()
  async poolGetSwaps(@Args() args: QueryPoolGetSwapsArgs) {
    return this.poolService.getPoolSwaps(args);
  }

  @Query()
  async poolGetBatchSwaps(@Args() args: QueryPoolGetBatchSwapsArgs) {
    return this.poolService.getPoolBatchSwaps(args);
  }

  @Query()
  async poolGetJoinExits(@Args() args: QueryPoolGetJoinExitsArgs) {
    return this.poolService.getPoolJoinExits(args);
  }

  @Query()
  async poolGetUserSwapVolume(@Args() args: QueryPoolGetUserSwapVolumeArgs) {
    return this.poolService.getPoolUserSwapVolume(args);
  }

  @Query()
  async poolGetFeaturedPoolGroups() {
    return this.poolService.getFeaturedPoolGroups();
  }

  @Query()
  async poolGetSnapshots(@Args() args) {
    const snapshots = await this.poolService.getSnapshotsForPool(args.id, args.range);

    return snapshots.map((snapshot) => ({
      ...snapshot,
      totalLiquidity: `${snapshot.totalLiquidity}`,
      sharePrice: `${snapshot.sharePrice}`,
      volume24h: `${snapshot.volume24h}`,
      fees24h: `${snapshot.fees24h}`,
      totalSwapVolume: `${snapshot.totalSwapVolume}`,
      totalSwapFee: `${snapshot.totalSwapFee}`,
      swapsCount: `${snapshot.swapsCount}`,
      holdersCount: `${snapshot.holdersCount}`,
    }));
  }

  @Query()
  async poolGetAllPoolsSnapshots(@Args() args: GqlPoolSnapshotDataRange) {
    const snapshots = await this.poolService.getSnapshotsForAllPools(args);

    return snapshots.map((snapshot) => ({
      ...snapshot,
      totalLiquidity: `${snapshot.totalLiquidity}`,
      sharePrice: `${snapshot.sharePrice}`,
      volume24h: `${snapshot.volume24h}`,
      fees24h: `${snapshot.fees24h}`,
      totalSwapVolume: `${snapshot.totalSwapVolume}`,
      totalSwapFee: `${snapshot.totalSwapFee}`,
      swapsCount: `${snapshot.swapsCount}`,
      holdersCount: `${snapshot.holdersCount}`,
    }));
  }

  @Query()
  async poolGetLinearPools() {
    return this.poolService.getGqlLinearPools();
  }
}
