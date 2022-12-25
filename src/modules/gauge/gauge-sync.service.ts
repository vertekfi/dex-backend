import { Injectable } from '@nestjs/common';
import { GaugeService } from './gauge.service';

@Injectable()
export class GaugeSyncService {
  constructor(private gaugeService: GaugeService) {}

  async syncGaugeData() {}
}
