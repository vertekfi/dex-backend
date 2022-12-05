import { Module } from '@nestjs/common';
import { GaugeService } from './gauge.service';

@Module({
  providers: [GaugeService],
  exports: [GaugeService],
})
export class GaugeModule {}
