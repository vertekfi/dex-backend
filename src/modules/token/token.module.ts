import { Module } from '@nestjs/common';
import { TokenMutationResolver } from './token-mutation.resolver';
import { TokenQueryResolver } from './token-query.resolver';

@Module({
  providers: [TokenQueryResolver, TokenMutationResolver],
  exports: [TokenQueryResolver, TokenMutationResolver],
})
export class TokenModule {}
