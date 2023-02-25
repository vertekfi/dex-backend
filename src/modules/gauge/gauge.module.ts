import { Module } from '@nestjs/common';
import { GaugeBribeService } from './bribes.service';
import { GaugeMutationResolver } from './gauge-mutation.resolver';
import { GaugeQueryResolver } from './gauge-query.resolver';
import { GaugeSyncService } from './gauge-sync.service';

@Module({
  providers: [GaugeQueryResolver, GaugeMutationResolver, GaugeSyncService, GaugeBribeService],
  exports: [GaugeQueryResolver, GaugeMutationResolver, GaugeSyncService, GaugeBribeService],
})
export class GaugeModule {}
