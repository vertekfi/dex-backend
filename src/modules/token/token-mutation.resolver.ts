import { Injectable } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { TokenService } from './token.service';

@Injectable()
export class TokenMutationResolver {
  constructor(private readonly tokenService: TokenService) {}

  @Mutation()
  async tokenReloadTokenPrices() {
    await this.tokenService.loadTokenPrices();
    return true;
  }

  @Mutation()
  async tokenSyncTokenDefinitions() {
    await this.tokenService.syncTokenData();
    return 'success';
  }
}
