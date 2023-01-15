import { Injectable } from '@nestjs/common';
import { PrismaTokenCurrentPrice, PrismaTokenPrice } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { networkConfig } from 'src/modules/config/network-config';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { TokenPriceHandler } from '../types';
import { GqlTokenChartDataRange } from 'src/gql-addons';
import { CacheDecorator } from '../../decorators/cache.decorator';
import { TokenChartDataService } from '../token-chart-data.service';
import { FIVE_MINUTES_SECONDS } from 'src/modules/utils/time';

const PRICE_CACHE_KEY = 'PRICE_CACHE_KEY';
const TOKEN_PRICES_24H_AGO_CACHE_KEY = 'token:prices:24h-ago';

@Injectable()
export class TokenPriceService {
  constructor(
    private prisma: PrismaService,
    private readonly chartDataService: TokenChartDataService,
  ) {}

  async getProtocolTokenPrice() {
    // return getDexPriceFromPair('bsc', '0x7a09ddf458fda6e324a97d1a8e4304856fb3e702000200000000000000000000-0x0dDef12012eD645f12AEb1B845Cb5ad61C7423F5-0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
    return '7';
  }

  async tryCachePriceForToken(address: string) {
    try {
      return this.getPriceForToken(await this.getCurrentTokenPrices(), address);
    } catch (error) {
      console.error('tryCachePriceForToken failed');
      return 0;
    }
  }

  getPriceForToken(tokenPrices: PrismaTokenCurrentPrice[], tokenAddress: string): number {
    const tokenPrice = tokenPrices.find(
      (tokenPrice) => tokenPrice.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
    );

    return tokenPrice?.price || 0;
  }

  @CacheDecorator(PRICE_CACHE_KEY, 30)
  async getCurrentTokenPrices(): Promise<PrismaTokenCurrentPrice[]> {
    const tokenPrices = await this.prisma.prismaTokenCurrentPrice.findMany({
      orderBy: { timestamp: 'desc' },
      distinct: ['tokenAddress'],
    });

    const wethPrice = tokenPrices.find(
      (tokenPrice) => tokenPrice.tokenAddress === networkConfig.weth.address,
    );

    if (wethPrice) {
      tokenPrices.push({
        ...wethPrice,
        tokenAddress: networkConfig.eth.address,
      });
    }

    return tokenPrices.filter((tokenPrice) => tokenPrice.price > 0.000000001);
  }

  @CacheDecorator(TOKEN_PRICES_24H_AGO_CACHE_KEY, FIVE_MINUTES_SECONDS)
  async getTokenPricesFrom24hAgo(): Promise<PrismaTokenCurrentPrice[]> {
    const oneDayAgo = moment().subtract(24, 'hours').unix();
    const tokenPrices = await this.prisma.prismaTokenPrice.findMany({
      orderBy: { timestamp: 'desc' },
      distinct: ['tokenAddress'],
      where: { timestamp: { lte: oneDayAgo } },
    });

    const wethPrice = tokenPrices.find(
      (tokenPrice) => tokenPrice.tokenAddress === networkConfig.weth.address,
    );

    if (wethPrice) {
      tokenPrices.push({
        ...wethPrice,
        tokenAddress: networkConfig.eth.address,
      });
    }

    return tokenPrices
      .filter((tokenPrice) => tokenPrice.price > 0.000000001)
      .map((tokenPrice) => ({
        id: `${tokenPrice.tokenAddress}-${tokenPrice.timestamp}`,
        ...tokenPrice,
      }));
  }

  async updateTokenPrices(handlers: TokenPriceHandler[]): Promise<void> {
    const tokens = await this.prisma.prismaToken.findMany({
      select: {
        address: true,
        symbol: true,
        useDexscreener: true,
        dexscreenPairAddress: true,
        types: true,
        prices: { take: 1, orderBy: { timestamp: 'desc' } },
      },
    });

    // order by timestamp ascending, so the tokens at the front of the list are the ones with the oldest timestamp
    // this is for instances where a query gets rate limited and does not finish
    let tokensWithTypes: any[] = _.sortBy(tokens, (token) => token.prices[0]?.timestamp || 0).map(
      (token) => ({
        ...token,
        types: token.types.map((type) => type.type),
      }),
    );

    // Break up for dexscreener and coingecko as needed. Currently only need screener for our degen shit

    for (const handler of handlers) {
      const accepted = await handler.getAcceptedTokens(tokensWithTypes);
      const acceptedTokens = tokensWithTypes.filter((token) => accepted.includes(token.address));
      let updated: string[] = [];

      try {
        updated = await handler.updatePricesForTokens(acceptedTokens);
      } catch (e) {
        console.error(e);
        if (handler.exitIfFails) {
          throw e;
        }
      }

      // remove any updated tokens from the list for the next handler
      tokensWithTypes = tokensWithTypes.filter((token) => !updated.includes(token.address));
    }

    await this.chartDataService.updateCandleStickData();

    // we only keep token prices for the last 24 hours
    // const yesterday = moment().subtract(1, 'day').unix();
    // await this.prisma.prismaTokenPrice.deleteMany({ where: { timestamp: { lt: yesterday } } });
  }

  async getDataForRange(
    tokenAddress: string,
    range: GqlTokenChartDataRange,
  ): Promise<PrismaTokenPrice[]> {
    const startTimestamp = this.getStartTimestampFromRange(range);

    return this.prisma.prismaTokenPrice.findMany({
      where: { tokenAddress, timestamp: { gt: startTimestamp } },
      orderBy: { timestamp: 'asc' },
    });
  }

  private getStartTimestampFromRange(range: GqlTokenChartDataRange) {
    return moment()
      .subtract(range === 'SEVEN_DAY' ? 7 : 30, 'days')
      .unix();
  }
}
