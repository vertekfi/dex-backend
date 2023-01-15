import { Provider } from '@nestjs/common';
import { TokenPricingService } from '../types';
import { CoingeckoService } from './coingecko.service';
import { DexScreenerService } from './dex-screener.service';

export const PRICE_SERVICES = 'PRICE_HANDLERS';

export const TokenPriceServicesProvider: Provider = {
  provide: PRICE_SERVICES,
  useFactory: (gecko: CoingeckoService, screener: DexScreenerService): TokenPricingService[] => {
    return [gecko, screener];
  },
  inject: [CoingeckoService, DexScreenerService],
};
