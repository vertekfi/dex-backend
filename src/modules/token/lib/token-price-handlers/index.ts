import { PrismaService } from 'nestjs-prisma';
import { TokenPriceHandler } from '../../../common/token/types';
import { BptPriceHandlerService } from './bpt-price-handler.service';
import { DexscreenerPriceHandlerService } from './dexscreener-price-handler.service';
import { LinearWrappedTokenPriceHandlerService } from './linear-wrapped-token-price-handler.service';
import { PoolPriceHandler } from './pool-price-handler';
import { SwapsPriceHandlerService } from './swaps-price-handler.service';

export const PRICE_HANDLERS = [
  DexscreenerPriceHandlerService,
  BptPriceHandlerService,
  LinearWrappedTokenPriceHandlerService,
  SwapsPriceHandlerService,
  PoolPriceHandler,
];

export function getPriceHandlers(prisma: PrismaService): TokenPriceHandler[] {
  return PRICE_HANDLERS.map((handler) => new handler(prisma));
}
