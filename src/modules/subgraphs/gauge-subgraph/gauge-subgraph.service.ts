import { Injectable } from '@nestjs/common';
import { gql, GraphQLClient } from 'graphql-request';
import { ConfigService } from 'src/modules/common/config.service';
import {
  GaugeLiquidityGaugesQueryVariables,
  GaugeSharesQueryVariables,
  getSdk,
} from './generated/gauge-subgraph-types';

@Injectable()
export class GaugeSubgraphService {
  private readonly client: GraphQLClient;

  public get sdk() {
    return getSdk(this.client);
  }

  constructor(private readonly config: ConfigService) {
    this.client = new GraphQLClient(this.config.env.GAUGES_SUBGRAPH);
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
