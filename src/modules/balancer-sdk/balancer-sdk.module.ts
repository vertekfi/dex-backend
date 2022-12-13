import { Global, Module } from '@nestjs/common';
import { PoolModule } from '../pool/pool.module';
import { BalancerSdkResolver } from './balancer-sdk.resolver';
import { BalancerSorService } from './sor/balancer-sor.service';

@Global()
@Module({
  imports: [PoolModule],
  providers: [BalancerSdkResolver, BalancerSorService],
  exports: [BalancerSdkResolver, BalancerSorService],
})
export class BalancerSdkModule {}
