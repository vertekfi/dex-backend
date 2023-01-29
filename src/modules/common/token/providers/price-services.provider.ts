import { Provider } from '@nestjs/common';
import { TokenPricingService } from '../types';
import { CoingeckoService } from '../pricing/coingecko.service';
import { DexScreenerService } from '../pricing/dex-screener.service';
import { PoolPricingService } from '../pricing/pool-pricing.service';

export const PRICE_SERVICES = 'PRICE_HANDLERS';

export const TokenPriceServicesProvider: Provider = {
  provide: PRICE_SERVICES,
  useFactory: (
    gecko: CoingeckoService,
    screener: DexScreenerService,
    poolPricing: PoolPricingService,
  ): TokenPricingService[] => {
    return [gecko, screener, poolPricing];
  },
  inject: [CoingeckoService, DexScreenerService, PoolPricingService],
};
