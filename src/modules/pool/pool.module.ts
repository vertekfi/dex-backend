import { Module } from '@nestjs/common';
import { SubgraphModule } from '../subgraphs/subgraph.module';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolSwapService } from './lib/pool-swap.service';
import { PoolResolver } from './pool.resolver';
import { PoolService } from './pool.service';

@Module({
  imports: [SubgraphModule],
  providers: [PoolResolver, PoolGqlLoaderService, PoolService, PoolGqlLoaderUtils, PoolSwapService],
  exports: [PoolResolver],
})
export class PoolModule {}
