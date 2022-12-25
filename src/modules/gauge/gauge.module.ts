import { Module } from '@nestjs/common';
import { GaugeMutationResolver } from './gauge-mutation.resolver';
import { GaugeQueryResolver } from './gauge-query.resolver';
import { GaugeSyncService } from './gauge-sync.service';
import { GaugeService } from './gauge.service';

@Module({
  providers: [GaugeService, GaugeQueryResolver, GaugeMutationResolver, GaugeSyncService],
  exports: [GaugeService, GaugeQueryResolver, GaugeMutationResolver, GaugeSyncService],
})
export class GaugeModule {}
