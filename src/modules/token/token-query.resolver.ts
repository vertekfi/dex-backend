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
    console.log(data);

    return data.map((item) => ({
      id: `${args.address}-${item.timestamp}`,
      timestamp: item.timestamp,
      price: `${item.price}`,
    }));
  }

  // @Query()
  // async tokenGetRelativePriceChartData() {
  //   // return this.tokenService.getProtocolTokenPrice();
  // }

  // @Query()
  // async tokenGetCandlestickChartData() {
  //   // return this.tokenService.getProtocolTokenPrice();
  // }

  // @Query()
  // async tokenGetTokenData() {
  //   // return this.tokenService.getProtocolTokenPrice();
  // }

  // @Query()
  // async tokenGetTokensData() {
  //   // return this.tokenService.getProtocolTokenPrice();
  // }
}
