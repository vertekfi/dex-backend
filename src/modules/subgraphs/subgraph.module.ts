import { Global } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { BalancerSubgraphService } from './balancer/balancer-subgraph.service';
import { GaugeSubgraphService } from './gauge-subgraph/gauge-subgraph.service';

@Global()
@Module({
  providers: [BalancerSubgraphService, GaugeSubgraphService],
  exports: [BalancerSubgraphService, GaugeSubgraphService],
})
export class SubgraphModule {}
