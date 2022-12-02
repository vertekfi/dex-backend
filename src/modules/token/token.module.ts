import { Module } from '@nestjs/common';
import { CoingeckoService } from './lib/coingecko.service';
import { TokenPriceService } from './lib/token-price.service';
import { TokenService } from './token.service';

@Module({
  providers: [TokenService, CoingeckoService, TokenPriceService],
  exports: [TokenService, CoingeckoService, TokenPriceService],
})
export class TokenModule {}
