import { Injectable } from '@nestjs/common';
import { PrismaTokenCurrentPrice, PrismaTokenPrice } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { networkConfig } from 'src/modules/config/network-config';
import * as moment from 'moment-timezone';
import { TokenPriceItem } from '../types';
import { GqlTokenChartDataRange } from 'src/gql-addons';
import { CacheDecorator } from '../../decorators/cache.decorator';
import { TokenChartDataService } from '../token-chart-data.service';
import { FIVE_MINUTES_SECONDS } from 'src/modules/utils/time';

const PRICE_CACHE_KEY = 'PRICE_CACHE_KEY';
const TOKEN_PRICES_24H_AGO_CACHE_KEY = 'token:prices:24h-ago';

@Injectable()
export class TokenPriceService {
  constructor(
    private readonly prisma: PrismaService,
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

  // @CacheDecorator(TOKEN_PRICES_24H_AGO_CACHE_KEY, FIVE_MINUTES_SECONDS)
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

  async getRelativeDataForRange(
    tokenIn: string,
    tokenOut: string,
    range: GqlTokenChartDataRange,
  ): Promise<TokenPriceItem[]> {
    tokenIn = tokenIn.toLowerCase();
    tokenOut = tokenOut.toLowerCase();
    const startTimestamp = this.getStartTimestampFromRange(range);

    const data = await this.prisma.prismaTokenPrice.findMany({
      where: {
        tokenAddress: { in: [tokenIn, tokenOut] },
        timestamp: { gt: startTimestamp },
      },
      orderBy: { timestamp: 'asc' },
    });

    const tokenInData = data.filter((item) => item.tokenAddress === tokenIn);
    const tokenOutData = data.filter((item) => item.tokenAddress === tokenOut);
    const items: TokenPriceItem[] = [];

    for (const tokenInItem of tokenInData) {
      const tokenOutItem = tokenOutData.find(
        (tokenOutItem) => tokenOutItem.timestamp == tokenInItem.timestamp,
      );

      if (tokenOutItem) {
        items.push({
          id: `${tokenIn}-${tokenOut}-${tokenInItem.timestamp}`,
          timestamp: tokenInItem.timestamp,
          price: tokenInItem.close / tokenOutItem.close,
        });
      }
    }

    return items;
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
