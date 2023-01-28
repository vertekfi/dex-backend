import { Inject, Injectable } from '@nestjs/common';
import { PrismaTokenCurrentPrice, PrismaTokenPrice } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { networkConfig } from 'src/modules/config/network-config';
import * as moment from 'moment-timezone';
import { PoolPricingMap, TokenPriceItem } from '../types';
import { GqlTokenChartDataRange } from 'src/gql-addons';
import { CacheDecorator } from '../../decorators/cache.decorator';
import { TokenChartDataService } from '../token-chart-data.service';
import { FIVE_MINUTES_SECONDS } from 'src/modules/utils/time';
import { RPC } from '../../web3/rpc.provider';
import { AccountWeb3 } from '../../types';
import { PoolPricingService } from './pool-pricing.service';
import { ContractService } from '../../web3/contract.service';
import { CoingeckoService } from './coingecko.service';
import { getPoolPricingMap, getPricingAssets } from './data';
import { toLowerCase } from 'src/modules/utils/general.utils';

const PRICE_CACHE_KEY = 'PRICE_CACHE_KEY';
const TOKEN_PRICES_24H_AGO_CACHE_KEY = 'token:prices:24h-ago';

const protocolTokenMap: PoolPricingMap = {};

@Injectable()
export class TokenPriceService {
  readonly poolPricing: PoolPricingService;
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly contractService: ContractService,
    private readonly gecko: CoingeckoService,
  ) {
    this.poolPricing = new PoolPricingService({
      rpc: this.rpc,
      vault: this.contractService.getVault(),
      gecko: this.gecko,
    });
  }

  async getProtocolTokenPrice(): Promise<string> {
    const tokenAddress = toLowerCase(this.contractService.getProtocolToken().address);
    const price = await this.poolPricing.getTokenPoolPrices(
      [tokenAddress],
      getPoolPricingMap(this.rpc.chainId),
      getPricingAssets(this.rpc.chainId),
    );

    return String(price[tokenAddress]);
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
