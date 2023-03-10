import { Global, Module } from '@nestjs/common';
import { PoolModule } from '../pool/pool.module';
import { BalancerSdkResolver } from './balancer-sdk.resolver';
import { BalTokenAdmin } from './contracts/bal-token-admin';
import { SorPriceService } from './sor/api/sor-price.service';
import { SubgraphPoolDataService } from './sor/api/subgraphPoolDataService';
import { BalancerSorService } from './sor/balancer-sor.service';

@Global()
@Module({
  imports: [PoolModule],
  providers: [
    BalancerSdkResolver,
    BalancerSorService,
    SubgraphPoolDataService,
    SorPriceService,
    BalTokenAdmin,
  ],
  exports: [BalancerSdkResolver, BalancerSorService, BalTokenAdmin],
})
export class BalancerSdkModule {}
