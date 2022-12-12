import { Module } from '@nestjs/common';
import { GaugeMutationResolver } from './gauge-mutation.resolver';
import { GaugeQueryResolver } from './gauge-query.resolver';
import { GaugeService } from './gauge.service';

@Module({
  providers: [GaugeService, GaugeQueryResolver, GaugeMutationResolver],
  exports: [GaugeService, GaugeQueryResolver, GaugeMutationResolver],
})
export class GaugeModule {}
