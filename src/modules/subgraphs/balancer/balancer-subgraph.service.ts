import { Injectable } from '@nestjs/common';
import {
  Balancer,
  BalancerJoinExitsQuery,
  BalancerJoinExitsQueryVariables,
  BalancerPoolFragment,
  BalancerPoolQuery,
  BalancerPoolQueryVariables,
  BalancerPoolShareFragment,
  BalancerPoolSharesQueryVariables,
  BalancerPoolSnapshotFragment,
  BalancerPoolSnapshotsQueryVariables,
  BalancerPoolsQueryVariables,
  BalancerProtocolDataQueryVariables,
  BalancerSwapFragment,
  BalancerSwapsQuery,
  BalancerSwapsQueryVariables,
  getSdk,
  OrderDirection,
  Swap_OrderBy,
} from './generated/balancer-subgraph-types';
import { GraphQLClient } from 'graphql-request';
import { subgraphLoadAll } from '../utils';
import { BalancerUserPoolShare } from './balancer-types';
import { networkConfig } from 'src/modules/config/network-config';

@Injectable()
export class BalancerSubgraphService {
  readonly client: GraphQLClient;
  readonly v1Client: GraphQLClient;

  private get sdk() {
    return getSdk(this.client);
  }

  private get sdkv1() {
    return getSdk(this.v1Client);
  }

  constructor() {
    this.client = new GraphQLClient(networkConfig.subgraphs.balancer);
    this.v1Client = new GraphQLClient(networkConfig.subgraphs.balancerV1);
  }

  async getMetadata() {
    const { meta } = await this.sdk.BalancerGetMeta();

    if (!meta) {
      throw new Error('Missing meta data');
    }

    return meta;
  }

  async getPoolJoinExits(args: BalancerJoinExitsQueryVariables): Promise<BalancerJoinExitsQuery> {
    return this.sdk.BalancerJoinExits(args);
  }

  async getSwaps(args: BalancerSwapsQueryVariables): Promise<BalancerSwapsQuery> {
    return this.sdk.BalancerSwaps(args);
  }

  async getPool(args: BalancerPoolQueryVariables): Promise<BalancerPoolQuery> {
    return this.sdk.BalancerPool(args);
  }

  async getAllPools(
    args: BalancerPoolsQueryVariables,
    applyTotalSharesFilter = true,
  ): Promise<BalancerPoolFragment[]> {
    return subgraphLoadAll<BalancerPoolFragment>(this.sdk.BalancerPools, 'pools', {
      ...args,
      where: {
        totalShares_not: applyTotalSharesFilter ? '0.00000000001' : undefined,
        ...args.where,
      },
    });
  }

  async getAllPoolsV1(
    args: BalancerPoolsQueryVariables,
    applyTotalSharesFilter = true,
  ): Promise<BalancerPoolFragment[]> {
    return subgraphLoadAll<BalancerPoolFragment>(this.sdkv1.BalancerPools, 'pools', {
      ...args,
      where: {
        totalShares_not: applyTotalSharesFilter ? '0.00000000001' : undefined,
        ...args.where,
      },
    });
  }

  async getAllPoolShares(args: BalancerPoolSharesQueryVariables): Promise<BalancerUserPoolShare[]> {
    const poolShares = await subgraphLoadAll<BalancerPoolShareFragment>(
      this.sdk.BalancerPoolShares,
      'poolShares',
      args,
    );

    return poolShares.map((shares) => ({
      ...shares,
      //ensure the user balance isn't negative, unsure how the subgraph ever allows this to happen
      balance: parseFloat(shares.balance) < 0 ? '0' : shares.balance,
      poolAddress: shares.id.split('-')[0],
      userAddress: shares.id.split('-')[1],
    }));
  }

  async getPoolsWithActiveUpdates(timestamp: number): Promise<string[]> {
    const { ampUpdates, gradualWeightUpdates } = await this.sdk.BalancerGetPoolsWithActiveUpdates({
      timestamp: `${timestamp}`,
    });

    return [...ampUpdates, ...gradualWeightUpdates].map((item) => item.poolId.id);
  }

  async getAllPoolSnapshots(
    args: BalancerPoolSnapshotsQueryVariables,
  ): Promise<BalancerPoolSnapshotFragment[]> {
    return subgraphLoadAll<BalancerPoolSnapshotFragment>(
      this.sdk.BalancerPoolSnapshots,
      'poolSnapshots',
      args,
    );
  }

  async getAllSwapsWithPaging({
    where,
    block,
    startTimestamp,
  }: Pick<BalancerSwapsQueryVariables, 'where' | 'block'> & { startTimestamp: number }): Promise<
    BalancerSwapFragment[]
  > {
    const limit = 1000;
    let timestamp = startTimestamp;
    let hasMore = true;
    let swaps: BalancerSwapFragment[] = [];

    while (hasMore) {
      const response = await this.sdk.BalancerSwaps({
        where: { ...where, timestamp_gt: timestamp },
        block,
        orderBy: Swap_OrderBy.Timestamp,
        orderDirection: OrderDirection.Asc,
        first: limit,
      });

      swaps = [...swaps, ...response.swaps];

      if (response.swaps.length < limit) {
        hasMore = false;
      } else {
        timestamp = response.swaps[response.swaps.length - 1].timestamp;
      }
    }

    return swaps;
  }

  async getProtocolData(args: BalancerProtocolDataQueryVariables): Promise<Balancer> {
    const { balancers } = await this.sdk.BalancerProtocolData(args);

    if (balancers.length === 0) {
      throw new Error('Missing protocol data');
    }

    //There is only ever one
    return balancers[0] as Balancer;
  }
}
