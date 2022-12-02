import { Injectable } from '@nestjs/common';
import {
  BalancerJoinExitsQuery,
  BalancerJoinExitsQueryVariables,
  getSdk,
} from './balancer-subgraph-types';
import { GraphQLClient } from 'graphql-request';
import { networkConfig } from 'src/modules/config/network-config';

@Injectable()
export class BalancerSubgraphService {
  private readonly client: GraphQLClient;

  private get sdk() {
    return getSdk(this.client);
  }
  constructor() {
    this.client = new GraphQLClient(networkConfig.subgraphs.balancer);
  }

  async getPoolJoinExits(args: BalancerJoinExitsQueryVariables): Promise<BalancerJoinExitsQuery> {
    return this.sdk.BalancerJoinExits(args);
  }
}
