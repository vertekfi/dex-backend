import { Injectable } from '@nestjs/common';
import { ProtocolService } from '../protocol/protocol.service';
import { GaugeSubgraphService } from '../subgraphs/gauge-subgraph/gauge-subgraph.service';
import {
  GaugeLiquidityGaugesQueryVariables,
  GaugeSharesQueryVariables,
} from '../subgraphs/gauge-subgraph/generated/gauge-subgraph-types';
import { GaugeShare, GaugeUserShare } from './types';

@Injectable()
export class GaugeService {
  constructor(
    private readonly gaugeSubgraphService: GaugeSubgraphService,
    private readonly protocolService: ProtocolService,
  ) {}

  async getAllGaugeAddresses(): Promise<string[]> {
    return await this.gaugeSubgraphService.getAllGaugeAddresses();
  }

  async getAllGauges(args: GaugeLiquidityGaugesQueryVariables) {
    const [gauges, protoData] = await Promise.all([
      this.gaugeSubgraphService.getAllGauges(args),
      this.protocolService.getProtocolConfigDataForChain(),
    ]);

    return gauges
      .filter((g) => protoData.gauges.includes(g.poolId))
      .map(({ id, poolId, totalSupply, shares, tokens }) => ({
        id,
        address: id,
        poolId,
        totalSupply,
        shares:
          shares?.map((share) => ({
            userAddress: share.user.id,
            amount: share.balance,
          })) ?? [],
        tokens: tokens,
      }));
  }

  async getAllUserShares(userAddress: string): Promise<GaugeUserShare[]> {
    const userGauges = await this.gaugeSubgraphService.getUserGauges(userAddress);
    return (
      userGauges?.gaugeShares?.map((share) => ({
        gaugeAddress: share.gauge.id,
        poolId: share.gauge.poolId,
        amount: share.balance,
        tokens: share.gauge.tokens ?? [],
      })) ?? []
    );
  }

  async getAllGaugeShares(args: GaugeSharesQueryVariables): Promise<GaugeShare[]> {
    return await this.gaugeSubgraphService.getAllGaugeShares(args);
  }

  async getMetadata() {
    return this.gaugeSubgraphService.getMetadata();
  }
}
