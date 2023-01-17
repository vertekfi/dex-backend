import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { TokenPriceService } from '../common/token/pricing/token-price.service';
import { TokenService } from '../common/token/token.service';

@Injectable()
export class TokenQueryResolver {
  constructor(
    private readonly tokenService: TokenService,
    private readonly pricingService: TokenPriceService,
  ) {}

  @Query()
  async tokenGetTokens() {
    return this.tokenService.getTokenDefinitions();
  }

  @Query()
  async tokenGetCurrentPrices() {
    return this.tokenService.getWhiteListedCurrentTokenPrices();
  }

  @Query()
  async beetsGetBeetsPrice() {
    return this.pricingService.getProtocolTokenPrice();
  }

  // @Query()
  // async tokenGetHistoricalPrices() {
  //   // return this.tokenService.getProtocolTokenPrice();
  // }

  // @Query()
  // async tokenGetTokenDynamicData() {
  //   // return this.tokenService.getProtocolTokenPrice();
  // }

  // @Query()
  // async tokenGetTokensDynamicData() {
  //   // return this.tokenService.getProtocolTokenPrice();
  // }

  @Query()
  async tokenGetPriceChartData(@Args() args) {
    const data = await this.pricingService.getDataForRange(args.address, args.range);

    return data.map((item) => ({
      id: `${args.address}-${item.timestamp}`,
      timestamp: item.timestamp,
      price: `${item.price}`,
    }));
  }

  @Query()
  async tokenGetRelativePriceChartData(@Args() args) {
    const data = await this.pricingService.getRelativeDataForRange(
      args.tokenIn,
      args.tokenOut,
      args.range,
    );

    return data.map((item) => ({
      id: `${args.tokenIn}-${args.tokenOut}-${item.timestamp}`,
      timestamp: item.timestamp,
      price: `${item.price}`,
    }));
  }

  @Query()
  async tokenGetCandlestickChartData(@Args() args) {
    const data = await this.pricingService.getDataForRange(args.address, args.range);

    return data.map((item) => ({
      id: `${args.address}-${item.timestamp}`,
      timestamp: item.timestamp,
      open: `${item.open}`,
      high: `${item.high}`,
      low: `${item.low}`,
      close: `${item.close}`,
    }));
  }

  @Query()
  async tokenGetTokenData(@Args('address') address: string) {
    const token = await this.tokenService.getToken(address);
    if (token) {
      return {
        ...token,
        id: token.address,
        tokenAddress: token.address,
      };
    }
    return null;
  }

  @Query()
  async tokenGetTokensData(@Args('addresses') addresses: string[]) {
    const tokens = await this.tokenService.getTokens(addresses);
    return tokens.map((token) => ({ ...token, id: token.address, tokenAddress: token.address }));
  }
}
