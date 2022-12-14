import { Global, Module } from '@nestjs/common';
import { PoolModule } from '../pool/pool.module';
import { BalancerSdkResolver } from './balancer-sdk.resolver';
import { SorApiService } from './sor/api/sor-api.service';
import { BalancerSorService } from './sor/balancer-sor.service';

@Global()
@Module({
  imports: [PoolModule],
  providers: [BalancerSdkResolver, BalancerSorService, SorApiService],
  exports: [BalancerSdkResolver, BalancerSorService, SorApiService],
})
export class BalancerSdkModule {}
