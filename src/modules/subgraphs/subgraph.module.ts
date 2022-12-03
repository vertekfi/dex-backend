import { Global } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { BalancerSubgraphService } from './balancer/balancer-subgraph.service';

@Global()
@Module({
  providers: [BalancerSubgraphService],
  exports: [BalancerSubgraphService],
})
export class SubgraphModule {}
