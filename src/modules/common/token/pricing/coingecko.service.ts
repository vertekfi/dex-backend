import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { RateLimiter } from 'limiter';
import axios from 'axios';

import { ONE_DAY_SECONDS } from 'src/modules/utils/time';
import {
  CoingeckoPriceResponse,
  HistoricalPrice,
  HistoricalPriceResponse,
  Price,
} from '../../../token/token-types-old';
import { isAddress } from 'ethers/lib/utils';
import { MappedToken, TokenDefinition, TokenMarketData } from '../types';
import { ConfigService } from 'src/modules/common/config.service';
import { TokenPricingService } from '../types';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { PrismaToken, PrismaTokenDynamicData } from '@prisma/client';
import { isCoinGeckoToken, validateCoinGeckoToken } from './utils';

/* coingecko has a rate limit of 10-50req/minute
   https://www.coingecko.com/en/api/pricing:
   Our free API has a rate limit of 10-50 calls per minute,
   if you exceed that limit you will be blocked until the next 1 minute window.
   Do revise your queries to ensure that you do not exceed our limits should
   that happen.

*/
const requestRateLimiter = new RateLimiter({ tokensPerInterval: 15, interval: 'minute' });

@Injectable()
export class CoingeckoService implements TokenPricingService {
  readonly baseUrl: string;
  readonly fiatParam: string;
  private readonly platformId: string;
  private readonly nativeAssetId: string;
  private readonly nativeAssetAddress: string;

  exitIfFails: boolean = false;
  readonly id = 'CoingeckoService';

  constructor(
    private readonly config: ConfigService, // private readonly tokenService: TokenService,
  ) {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.fiatParam = 'usd';
    this.platformId = this.config.env.COINGECKO_PLATFORM_ID;
    this.nativeAssetId = this.config.env.COINGECKO_NATIVE_ASSET_ID;
    this.nativeAssetAddress = this.config.env.NATIVE_ASSET_ADDRESS;
  }

  async getMarketDataForToken(tokens: PrismaToken[]): Promise<PrismaTokenDynamicData[]> {
    tokens = tokens.filter(isCoinGeckoToken);
    const data: PrismaTokenDynamicData[] = [];

    for (const token of tokens) {
      // These are the fields actualy used to store this
      const item: any = {};
      const marketData: PrismaTokenDynamicData = {
        // id: token.dexscreenPairAddress,
        price: item.current_price,
        ath: item.ath,
        atl: item.atl,
        marketCap: item.market_cap,
        fdv: item.fully_diluted_valuation,
        high24h: item.high_24h ?? undefined,
        low24h: item.low_24h ?? undefined,
        priceChange24h: item.price_change_24h ?? undefined,
        priceChangePercent24h: item.price_change_percentage_24h,
        priceChangePercent7d: item.price_change_percentage_7d_in_currency,
        priceChangePercent14d: item.price_change_percentage_14d_in_currency,
        priceChangePercent30d: item.price_change_percentage_30d_in_currency,
        updatedAt: item.last_updated,
        coingeckoId: null,
        dexscreenerPair: token.dexscreenPairAddress,
        tokenAddress: token.address,
      };

      // if (moment(item.last_updated).isAfter(moment().subtract(10, 'minutes'))) {
      //   const data = {
      //     price: item.current_price,
      //     ath: item.ath,
      //     atl: item.atl,
      //     marketCap: item.market_cap,
      //     fdv: item.fully_diluted_valuation,
      //     high24h: item.high_24h ?? undefined,
      //     low24h: item.low_24h ?? undefined,
      //     priceChange24h: item.price_change_24h ?? undefined,
      //     priceChangePercent24h: item.price_change_percentage_24h,
      //     priceChangePercent7d: item.price_change_percentage_7d_in_currency,
      //     priceChangePercent14d: item.price_change_percentage_14d_in_currency,
      //     priceChangePercent30d: item.price_change_percentage_30d_in_currency,
      //     updatedAt: item.last_updated,
      //   };

      //   operations.push(
      //     this.prisma.prismaTokenDynamicData.upsert({
      //       where: { tokenAddress: token.address },
      //       update: data,
      //       create: {
      //         coingeckoId: item.id,
      //         tokenAddress: token.address,
      //         ...data,
      //       },
      //     }),
      //   );
      // }
    }

    const tokenIds = tokens.map((t) => t.coingeckoTokenId);
    const endpoint = `/coins/markets?vs_currency=${this.fiatParam}&ids=${tokenIds}&per_page=100&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C14d%2C30d`;

    const result = await this.get<TokenMarketData[]>(endpoint);
    console.log(result);

    return data;
  }

  async getNativeAssetPrice(): Promise<Price> {
    try {
      const response = await this.get<CoingeckoPriceResponse>(
        `/simple/price?ids=${this.nativeAssetId}&vs_currencies=${this.fiatParam}`,
      );
      return response[this.nativeAssetId];
    } catch (error) {
      //console.error('Unable to fetch Ether price', error);
      throw error;
    }
  }

  async getTokenHistoricalPrices(
    address: string,
    days: number,
    tokenDefinitions: TokenDefinition[],
  ): Promise<HistoricalPrice[]> {
    const now = Math.floor(Date.now() / 1000);
    const end = now;
    const start = end - days * ONE_DAY_SECONDS;
    // const tokenDefinitions = await this.tokenService.getTokenDefinitions();

    const mapped = this.getMappedTokenDetails(address, tokenDefinitions);

    if (mapped.priceProvider === 'GECKO') {
      const endpoint = `/coins/${mapped.platformId}/contract/${mapped.address}/market_chart/range?vs_currency=${this.fiatParam}&from=${start}&to=${end}`;
      const result = await this.get<HistoricalPriceResponse>(endpoint);
      return result.prices.map((item) => ({
        // anchor to the start of the hour
        timestamp:
          moment
            .unix(item[0] / 1000)
            .startOf('hour')
            .unix() * 1000,
        price: item[1],
      }));
    }

    // TODO: Need to store some of these ourself since gecko won't have them listed
    // if (mapped.priceProvider === 'DEXSCREENER') {
    //   // TODO: token price testing
    //   if (mapped.address !== PROTOCOL_TOKEN[this.rpc.chainId]) {
    //     const tokenInfo = await getDexPairInfo('bsc', mapped.platformId);
    //     console.log(tokenInfo);
    //   }
    // }

    return [];
  }

  async getTokenPrice(token: TokenDefinition): Promise<number> {
    validateCoinGeckoToken(token as unknown as PrismaToken);

    const address = token.coingeckoContractAddress.toLowerCase();
    const endpoint = `/simple/token_price/${token.coingeckoPlatformId}?contract_addresses=${address}&vs_currencies=${this.fiatParam}`;
    const result = await this.get(endpoint);

    return result[address]?.usd;
  }

  async getCoinCandlestickData(
    token: PrismaToken,
    days: 1 | 30,
  ): Promise<[number, number, number, number, number][]> {
    if (!isCoinGeckoToken(token)) {
      throw new Error(`getCoinCandlestickData: missing coingeckoTokenId`);
    }
    const endpoint = `/coins/${token.coingeckoTokenId}/ohlc?vs_currency=usd&days=${days}`;

    return this.get(endpoint);
  }

  /**
   * Support instances where a token address is not supported by the platform id, provide the option to use a different platform
   */
  getMappedTokenDetails(address: string, tokens: TokenDefinition[]): MappedToken {
    const token = tokens.find((token) => token.address.toLowerCase() === address.toLowerCase());
    if (token && token.coingeckoPlatformId && token.coingeckoContractAddress) {
      return {
        platformId: token.coingeckoPlatformId,
        address: isAddress(token.coingeckoContractAddress)
          ? token.coingeckoContractAddress.toLowerCase()
          : token.coingeckoContractAddress,
        originalAddress: address.toLowerCase(),
        priceProvider: 'GECKO',
      };
    } else if (token && token.useDexscreener && token.dexScreenerPairAddress) {
      return {
        platformId: token.dexScreenerPairAddress,
        address: isAddress(token.dexScreenerPairAddress)
          ? token.dexScreenerPairAddress.toLowerCase()
          : token.dexScreenerPairAddress,
        originalAddress: address.toLowerCase(),
        priceProvider: 'DEXSCREENER',
      };
    }
  }

  private async get<T>(endpoint: string): Promise<T> {
    const remainingRequests = await requestRateLimiter.removeTokens(1);
    console.log('Remaining coingecko requests', remainingRequests);
    const { data } = await axios.get(this.baseUrl + endpoint);
    return data;
  }

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens
      .filter((token) => token.coingeckoContractAddress && token.coingeckoPlatformId)
      .map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
}
