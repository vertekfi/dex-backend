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
    const prices = await this.tokenService.getWhiteListedCurrentTokenPrices();
    return prices.map((price) => ({
      address: price.tokenAddress,
      price: price.price,
    }));
  }

  @Query()
  async beetsGetBeetsPrice() {
    return this.pricingService.getProtocolTokenPrice();
  }

  // @Query()
  // async tokenGetHistoricalPrices(@Args('addresses') addresses: string[]) {
  //   const tokenPrices = await this.pricingService.getHistoricalTokenPrices();
  //   const filtered = _.pickBy(tokenPrices, (entries, address) => addresses.includes(address));

  //   return _.map(filtered, (entries, address) => ({
  //       address,
  //       prices: entries.map((entry) => ({
  //           timestamp: `${entry.timestamp}`,
  //           price: entry.price,
  //       })),
  //   }));
  // }

  @Query()
  async tokenGetTokenDynamicData(@Args('address') address: string) {
    const data = await this.tokenService.getTokenDynamicData(address);

    return data
      ? {
          ...data,
          id: data.coingeckoId,
          fdv: data.fdv ? `${data.fdv}` : null,
          marketCap: data.marketCap ? `${data.marketCap}` : null,
          updatedAt: data.updatedAt.toUTCString(),
        }
      : null;
  }

  @Query()
  async tokenGetTokensDynamicData(@Args('addresses') addresses: string[]) {
    const items = await this.tokenService.getTokensDynamicData(addresses);

    return items.map((item) => ({
      ...item,
      id: item.coingeckoId,
      fdv: item.fdv ? `${item.fdv}` : null,
      marketCap: item.marketCap ? `${item.marketCap}` : null,
      updatedAt: item.updatedAt.toUTCString(),
    }));
  }

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
