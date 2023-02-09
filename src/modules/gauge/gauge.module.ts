import { Module } from '@nestjs/common';
import { GaugeMutationResolver } from './gauge-mutation.resolver';
import { GaugeQueryResolver } from './gauge-query.resolver';
import { GaugeSyncService } from './gauge-sync.service';

@Module({
  providers: [GaugeQueryResolver, GaugeMutationResolver, GaugeSyncService],
  exports: [GaugeQueryResolver, GaugeMutationResolver, GaugeSyncService],
})
export class GaugeModule {}
