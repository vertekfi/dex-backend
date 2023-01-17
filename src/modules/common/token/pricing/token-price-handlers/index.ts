import { nestApp } from 'src/main';
import { TokenPriceHandler } from '../../types';
import { BptPriceHandlerService } from './bpt-price-handler.service';
import { CoingeckoPriceHandlerService } from './coingecko-price-handler';
import { DexscreenerPriceHandlerService } from './dexscreener-price-handler.service';
import { LinearWrappedTokenPriceHandlerService } from './linear-wrapped-token-price-handler.service';
import { SwapsPriceHandlerService } from './swaps-price-handler.service';

export const PRICE_HANDLERS = [
  CoingeckoPriceHandlerService,
  DexscreenerPriceHandlerService,
  BptPriceHandlerService,
  LinearWrappedTokenPriceHandlerService,
  SwapsPriceHandlerService,
];

export function getPriceHandlers(): TokenPriceHandler[] {
  if (!nestApp) {
    console.log('nestApp not initialized');
    return;
  }
  return PRICE_HANDLERS.map((handler) => new handler());
}
