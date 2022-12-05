import { Module } from '@nestjs/common';
import { CoingeckoService } from './lib/coingecko.service';
import { TokenDataLoaderService } from './lib/token-data-loader.service';
import { TokenPriceService } from './lib/token-price.service';
import { TokenMutationResolver } from './token-mutation.resolver';
import { TokenQueryResolver } from './token-query.resolver';
import { TokenService } from './token.service';

@Module({
  providers: [
    TokenService,
    CoingeckoService,
    TokenPriceService,
    TokenQueryResolver,
    TokenMutationResolver,
    TokenDataLoaderService,
  ],
  exports: [
    TokenService,
    CoingeckoService,
    TokenPriceService,
    TokenQueryResolver,
    TokenMutationResolver,
  ],
})
export class TokenModule {}
