import { Global } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { BalancerSubgraphService } from './balancer/balancer-subgraph.service';
import { BlocksSubgraphService } from './blocks-subgraph/blocks-subgraph.service';
import { BlocksResolver } from './blocks-subgraph/blocks.resolvers';
import { GaugeSubgraphService } from './gauge-subgraph/gauge-subgraph.service';

@Global()
@Module({
  providers: [BalancerSubgraphService, GaugeSubgraphService, BlocksSubgraphService, BlocksResolver],
  exports: [BalancerSubgraphService, GaugeSubgraphService, BlocksSubgraphService, BlocksResolver],
})
export class SubgraphModule {}
