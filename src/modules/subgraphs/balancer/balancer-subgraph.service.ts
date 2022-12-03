import { Injectable } from '@nestjs/common';
import {
  BalancerJoinExitsQuery,
  BalancerJoinExitsQueryVariables,
  BalancerPoolFragment,
  BalancerPoolShareFragment,
  BalancerPoolSharesQueryVariables,
  BalancerPoolSnapshotFragment,
  BalancerPoolSnapshotsQueryVariables,
  BalancerPoolsQueryVariables,
  BalancerSwapsQuery,
  BalancerSwapsQueryVariables,
  getSdk,
} from './balancer-subgraph-types';
import { GraphQLClient } from 'graphql-request';
import { networkConfig } from 'src/modules/config/network-config';
import { subgraphLoadAll } from '../utils';
import { BalancerUserPoolShare } from './balancer-types';

@Injectable()
export class BalancerSubgraphService {
  private readonly client: GraphQLClient;

  private get sdk() {
    return getSdk(this.client);
  }

  constructor() {
    this.client = new GraphQLClient(networkConfig.subgraphs.balancer);
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
}
