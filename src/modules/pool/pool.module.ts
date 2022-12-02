import { Module } from '@nestjs/common';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolResolver } from './pool.resolver';
import { PoolService } from './pool.service';

@Module({
  imports: [],
  providers: [PoolResolver, PoolGqlLoaderService, PoolService, PoolGqlLoaderUtils],
  exports: [PoolResolver],
})
export class PoolModule {}