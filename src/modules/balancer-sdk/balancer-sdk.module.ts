import { Global, Module } from '@nestjs/common';
import { PoolModule } from '../pool/pool.module';
import { BalancerSdkResolver } from './balancer-sdk.resolver';
import { BalTokenAdmin } from './contracts/bal-token-admin';
import { SorPriceService } from './sor/api/sor-price.service';
import { SubgraphPoolDataService } from './sor/api/subgraphPoolDataService';
import { BalancerSorV2Service } from './sor/balancer-sor-v2.service';
import { BalancerSorV1Service } from './sor/v1/balancer-sor-v1.service';
import { SorSplitterService } from './sor/v1/sor-splitter.service';

@Global()
@Module({
  imports: [PoolModule],
  providers: [
    BalancerSdkResolver,
    BalancerSorV2Service,
    SubgraphPoolDataService,
    SorPriceService,
    BalTokenAdmin,
    BalancerSorV1Service,
    SorSplitterService,
  ],
  exports: [
    BalancerSdkResolver,
    BalancerSorV2Service,
    BalTokenAdmin,
    BalancerSorV1Service,
    SorSplitterService,
  ],
})
export class BalancerSdkModule {}
