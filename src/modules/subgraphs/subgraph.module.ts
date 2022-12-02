import { Module } from '@nestjs/common';
import { BalancerSubgraphService } from './balancer/balancer-subgraph.service';

@Module({
  providers: [BalancerSubgraphService],
  exports: [BalancerSubgraphService],
})
export class SubgraphModule {}
