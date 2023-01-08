import { Module } from '@nestjs/common';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { PoolGqlLoaderUtils } from './lib/gql-loader-utils.service';
import { PoolAprUpdaterService } from './lib/pool-apr-updater.service';
import { PoolCreatorService } from './lib/pool-creator.service';
import { PoolDataLoaderService } from './lib/pool-data-loader.service';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';
import { PoolOnChainDataService } from '../common/pool/pool-on-chain-data.service';
import { PoolSnapshotService } from './lib/pool-snapshot.service';
import { PoolSyncService } from './lib/pool-sync.service';
import { PoolUsdDataService } from './lib/pool-usd-data.service';
import { PoolMutationResolver } from './pool-mutation.resolver';
import { PoolQueryResolver } from './pool-query.resolver';
import { PoolService } from './pool.service';

@Module({
  imports: [TokenModule, UserModule],
  providers: [
    PoolQueryResolver,
    PoolMutationResolver,
    PoolGqlLoaderService,
    PoolService,
    PoolGqlLoaderUtils,
    PoolSnapshotService,
    PoolCreatorService,
    PoolUsdDataService,
    PoolAprUpdaterService,
    PoolSyncService,
    PoolDataLoaderService,
  ],
  exports: [
    PoolQueryResolver,
    PoolMutationResolver,
    PoolService,
    PoolSyncService,
    PoolDataLoaderService,
  ],
})
export class PoolModule {}
