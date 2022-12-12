import { Injectable } from '@nestjs/common';
import { Query } from '@nestjs/graphql';
import { TokenService } from '../common/token/token.service';

@Injectable()
export class TokenQueryResolver {
  constructor(private readonly tokenService: TokenService) {}

  @Query()
  async tokenGetTokens() {
    return this.tokenService.getTokenDefinitions();
  }

  @Query()
  async tokenGetCurrentPrices() {
    return this.tokenService.getWhiteListedCurrentTokenPrices();
  }

  @Query()
  beetsGetBeetsPrice() {
    return this.tokenService.getProtocolTokenPrice();
  }
}
