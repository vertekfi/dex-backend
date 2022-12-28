import { Injectable } from '@nestjs/common';
import { CacheService } from '../common/cache.service';
import { FIVE_MINUTES_SECONDS } from '../utils/time';
import { GaugeService } from './gauge.service';

const GAUGE_CACHE_KEY = 'GAUGE_CACHE_KEY';
const GAUGE_APR_KEY = 'GAUGE_APR_KEY';

@Injectable()
export class GaugeSyncService {
  constructor(private gaugeService: GaugeService, private readonly cache: CacheService) {}

  async syncGaugeData() {
    // These do not change often and front end makes its immediate calls to contracts as needed also
    await this.cache.set(
      GAUGE_CACHE_KEY,
      await this.gaugeService.getAllGauges(),
      FIVE_MINUTES_SECONDS,
    );
  }
}
