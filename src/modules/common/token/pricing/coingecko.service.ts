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
  TokenPrices,
} from '../../../token/token-types-old';
import { isAddress } from 'ethers/lib/utils';
import { MappedToken, TokenDefinition, TokenMarketData } from '../types';
import { ConfigService } from 'src/modules/common/config.service';
import { TokenPricingService } from '../types';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { PrismaToken, PrismaTokenDynamicData } from '@prisma/client';
import { filterForGeckoTokens, isCoinGeckoToken, validateCoinGeckoToken } from './utils';
import { forEach, groupBy, mapKeys } from 'lodash';

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

  readonly coinGecko = true;

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

    const tokenIds = tokens.map((t) => t.coingeckoTokenId);
    const endpoint = `/coins/markets?vs_currency=${this.fiatParam}&ids=${tokenIds}&per_page=100&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C14d%2C30d`;
    const result = await this.get<TokenMarketData[]>(endpoint);

    for (const item of result) {
      const marketData: PrismaTokenDynamicData = {
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
        coingeckoId: item.id,
        dexscreenerPair: null,
        tokenAddress: tokens.find((t) => t.coingeckoTokenId === item.id).address,
      };

      data.push(marketData);
    }

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

    const mapped = this.getMappedTokenDetails(address, tokenDefinitions);

    const endpoint = `/coins/${mapped.platformId}/contract/${mapped.coingGeckoContractAddress}/market_chart/range?vs_currency=${this.fiatParam}&from=${start}&to=${end}`;
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

  async getTokenPrice(token: TokenDefinition): Promise<number> {
    validateCoinGeckoToken(token as unknown as PrismaToken);

    const address = token.coingeckoContractAddress.toLowerCase();
    const endpoint = `/simple/token_price/${token.coingeckoPlatformId}?contract_addresses=${address}&vs_currencies=${this.fiatParam}`;
    const result = await this.get(endpoint);

    return result[address]?.usd;
  }

  async getTokenPrices(
    addresses: string[],
    tokenDefinitions: TokenDefinition[],
    addressesPerRequest = 100,
  ) {
    try {
      if (addresses.length / addressesPerRequest > 10)
        throw new Error('To many requests for rate limit.');

      let mapped = addresses.map((address) =>
        this.getMappedTokenDetails(address, tokenDefinitions),
      );

      mapped = mapped.filter((t) => t !== undefined);

      const groupedByPlatform = groupBy(mapped, 'platformId');
      const requests: Promise<CoingeckoPriceResponse>[] = [];

      forEach(groupedByPlatform, (tokens, platform) => {
        const mappedAddresses = tokens.map((token) => token.coingGeckoContractAddress);
        const pageCount = Math.ceil(mappedAddresses.length / addressesPerRequest);
        const pages = Array.from(Array(pageCount).keys());

        pages.forEach((page) => {
          const addressString = mappedAddresses.slice(
            addressesPerRequest * page,
            addressesPerRequest * (page + 1),
          );
          const endpoint = `/simple/token_price/${platform}?contract_addresses=${addressString}&vs_currencies=${this.fiatParam}`;
          const request = this.get<CoingeckoPriceResponse>(endpoint);
          requests.push(request);
        });
      });

      const paginatedResults = await Promise.all(requests);
      const results = this.parsePaginatedTokens(paginatedResults, mapped);

      // Inject native asset price if included in requested addresses
      if (addresses.includes(this.nativeAssetAddress)) {
        results[this.nativeAssetAddress] = await this.getNativeAssetPrice();
      }

      return results;
    } catch (error: any) {
      throw new Error(`Unable to fetch token prices - ${error.message} - ${error.statusCode}`);
    }
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
    const token = tokens.find((token) => {
      // console.log(`${address.toLowerCase()}: ${token.address.toLowerCase()}`);
      return token.address.toLowerCase() === address.toLowerCase();
    });

    if (token) {
      return {
        platformId: token.coingeckoPlatformId,
        coingGeckoContractAddress: isAddress(token.coingeckoContractAddress)
          ? token.coingeckoContractAddress.toLowerCase()
          : token.coingeckoContractAddress,
        originalAddress: address.toLowerCase(),
        priceProvider: 'GECKO',
      };
    } else {
      console.log('No token: ' + address);
    }

    // else if (token && token.useDexscreener && token.dexScreenerPairAddress) {
    //   return {
    //     platformId: token.dexScreenerPairAddress,
    //     address: isAddress(token.dexScreenerPairAddress)
    //       ? token.dexScreenerPairAddress.toLowerCase()
    //       : token.dexScreenerPairAddress,
    //     originalAddress: address.toLowerCase(),
    //     priceProvider: 'DEXSCREENER',
    //   };
    // }
  }

  private async get<T>(endpoint: string): Promise<T> {
    const remainingRequests = await requestRateLimiter.removeTokens(1);
    console.log('Remaining coingecko requests', remainingRequests);
    const { data } = await axios.get(this.baseUrl + endpoint);
    return data;
  }

  private parsePaginatedTokens(
    paginatedResults: TokenPrices[],
    mappedTokens: MappedToken[],
  ): TokenPrices {
    const results = paginatedResults.reduce((result, page) => ({ ...result, ...page }), {});
    const prices: TokenPrices = mapKeys(results, (val, address) => address);

    const resultAddresses = Object.keys(results);
    for (const mappedToken of mappedTokens) {
      if (mappedToken.originalAddress) {
        const resultAddress = resultAddresses.find(
          (address) =>
            address.toLowerCase() === mappedToken.coingGeckoContractAddress.toLowerCase(),
        );
        if (!resultAddress) {
          console.warn(
            `Matching address for original address ${mappedToken.originalAddress} not found`,
          );
        } else {
          prices[mappedToken.originalAddress] = results[resultAddress];
        }
      }
    }

    // Keep things intact for testnet situation
    mappedTokens.forEach((tk) => {
      delete prices[tk.coingGeckoContractAddress];
    });

    return prices;
  }
}
