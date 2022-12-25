import { Module } from '@nestjs/common';
import { GaugeMutationResolver } from './gauge-mutation.resolver';
import { GaugeQueryResolver } from './gauge-query.resolver';
import { GaugeSyncService } from './gauge-sync.service';
import { GaugeService } from './gauge.service';
import { GaugeAprService } from './lib/gauge-apr.service';
import { VeBalHelpers } from './lib/ve-helpers';
import { VeBalAprCalc } from './lib/vebal-apr.calc';

@Module({
  providers: [
    GaugeService,
    GaugeQueryResolver,
    GaugeMutationResolver,
    GaugeSyncService,
    VeBalHelpers,
    VeBalAprCalc,
    GaugeAprService,
  ],
  exports: [GaugeService, GaugeQueryResolver, GaugeMutationResolver, GaugeSyncService],
})
export class GaugeModule {}
