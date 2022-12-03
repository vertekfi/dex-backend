import { Module } from '@nestjs/common';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolCreatorService } from './lib/pool-creator.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolSnapshotService } from './lib/pool-snapshot.service';
import { PoolSwapService } from './lib/pool-swap.service';
import { PoolResolver } from './pool.resolver';
import { PoolService } from './pool.service';

@Module({
  imports: [TokenModule, UserModule],
  providers: [
    PoolResolver,
    PoolGqlLoaderService,
    PoolService,
    PoolGqlLoaderUtils,
    PoolSwapService,
    PoolSnapshotService,
    PoolCreatorService,
  ],
  exports: [PoolResolver],
})
export class PoolModule {}
