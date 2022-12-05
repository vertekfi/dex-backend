import { Module } from '@nestjs/common';
import { CoingeckoService } from './lib/coingecko.service';
import { TokenMutationResolver } from './token-mutation.resolver';
import { TokenQueryResolver } from './token-query.resolver';

@Module({
  providers: [CoingeckoService, TokenQueryResolver, TokenMutationResolver],
  exports: [CoingeckoService, TokenQueryResolver, TokenMutationResolver],
})
export class TokenModule {}
