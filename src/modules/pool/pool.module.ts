import { Module } from '@nestjs/common';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolResolver } from './pool.resolver';
import { PoolService } from './pool.service';

@Module({
  imports: [],
  providers: [PoolResolver, PoolGqlLoaderService, PoolService],
  exports: [PoolResolver],
})
export class PoolModule {}
