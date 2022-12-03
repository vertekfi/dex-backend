import { Module } from '@nestjs/common';
import { SubgraphModule } from '../subgraphs/subgraph.module';
import { TokenModule } from '../token/token.module';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolSnapshotService } from './lib/pool-snapshot.service';
import { PoolSwapService } from './lib/pool-swap.service';
import { PoolResolver } from './pool.resolver';
import { PoolService } from './pool.service';

@Module({
  imports: [SubgraphModule, TokenModule],
  providers: [
    PoolResolver,
    PoolGqlLoaderService,
    PoolService,
    PoolGqlLoaderUtils,
    PoolSwapService,
    PoolSnapshotService,
  ],
  exports: [PoolResolver],
})
export class PoolModule {}
