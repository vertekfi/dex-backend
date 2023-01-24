import { Injectable } from '@nestjs/common';
import { GraphQLClient } from 'graphql-request';
import { networkConfig } from 'src/modules/config/network-config';
import {
  GaugeLiquidityGaugesQueryVariables,
  GaugeSharesQueryVariables,
  getSdk,
} from './generated/gauge-subgraph-types';

@Injectable()
export class GaugeSubgraphService {
  readonly client: GraphQLClient;

  public get sdk() {
    return getSdk(this.client);
  }

  constructor() {
    this.client = new GraphQLClient(networkConfig.subgraphs.gauges);
  }

  async getAllGauges(args: GaugeLiquidityGaugesQueryVariables) {
    const gaugesQuery = await this.sdk.GaugeLiquidityGauges(args);
    return gaugesQuery.liquidityGauges;
  }

  async getAllGaugeAddresses(): Promise<string[]> {
    const addressesQuery = await this.sdk.GaugeLiquidityGaugeAddresses();
    return addressesQuery.liquidityGauges.map((gauge) => gauge.id);
  }

  async getUserGauges(userAddress: string) {
    const userGaugesQuery = await this.sdk.GaugeUserGauges({ userAddress });
    return userGaugesQuery.user;
  }

  async getAllGaugeShares(args: GaugeSharesQueryVariables) {
    const sharesQuery = await this.sdk.GaugeShares(args);
    return sharesQuery.gaugeShares;
  }

  async getMetadata() {
    const { meta } = await this.sdk.GaugeGetMeta();

    if (!meta) {
      throw new Error('Missing meta data');
    }
    return meta;
  }
}
