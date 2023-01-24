import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { RateLimiter } from 'limiter';
import axios from 'axios';

import { ONE_DAY_SECONDS, timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import {
  CoingeckoPriceResponse,
  HistoricalPrice,
  HistoricalPriceResponse,
  Price,
  TokenPrices,
} from '../../../token/token-types-old';
import { isAddress } from 'ethers/lib/utils';
import { MappedToken, TokenDefinition, TokenMarketData } from '../types';
import { TokenPricingService } from '../types';
import { PrismaToken, PrismaTokenDynamicData } from '@prisma/client';
import { isCoinGeckoToken, validateCoinGeckoToken } from './utils';
import { forEach, groupBy, mapKeys } from 'lodash';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { networkConfig } from 'src/modules/config/network-config';

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
  readonly coinGecko = true;

  constructor(private readonly prisma: PrismaService) {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.fiatParam = 'usd';
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
        `/simple/price?ids=${networkConfig.coingecko.nativeAssetId}&vs_currencies=${this.fiatParam}`,
      );
      return response[networkConfig.coingecko.nativeAssetId];
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
      if (
        addresses.includes(networkConfig.eth.address) ||
        addresses.includes(networkConfig.eth.addressFormatted)
      ) {
        results[networkConfig.eth.address] = await this.getNativeAssetPrice();
      }

      return results;
    } catch (error: any) {
      throw new Error(`Unable to fetch token prices - ${error.message} - ${error.statusCode}`);
    }
  }

  async updateCoinCandlestickData(token: PrismaToken) {
    validateCoinGeckoToken(token);

    const monthUrl = `/coins/${token.coingeckoTokenId}/ohlc?vs_currency=usd&days=${30}`;
    const twentyFourHourUrl = `/coins/${token.coingeckoTokenId}/ohlc?vs_currency=usd&days=${1}`;

    const monthData = await this.get<[number, number, number, number, number][]>(monthUrl);
    const twentyFourHourData = await this.get<[number, number, number, number, number][]>(
      twentyFourHourUrl,
    );

    // Merge 30 min data into hourly data
    const hourlyData = Object.values(
      groupBy(twentyFourHourData, (item) =>
        timestampRoundedUpToNearestHour(moment.unix(item[0] / 1000)),
      ),
    ).map((hourData) => {
      if (hourData.length === 1) {
        const item = hourData[0];
        item[0] = timestampRoundedUpToNearestHour(moment.unix(item[0] / 1000)) * 1000;

        return item;
      }

      const thirty = hourData[0];
      const hour = hourData[1];

      return [
        hour[0],
        thirty[1],
        Math.max(thirty[2], hour[2]),
        Math.min(thirty[3], hour[3]),
        hour[4],
      ];
    });

    const tokenAddress = token.address.toLowerCase();
    const operations: any[] = [];
    operations.push(this.prisma.prismaTokenPrice.deleteMany({ where: { tokenAddress } }));

    operations.push(
      this.prisma.prismaTokenPrice.createMany({
        data: monthData
          .filter((item) => item[0] / 1000 <= timestampRoundedUpToNearestHour())
          .map((item) => ({
            tokenAddress,
            timestamp: item[0] / 1000,
            open: item[1],
            high: item[2],
            low: item[3],
            close: item[4],
            price: item[4],
            coingecko: true,
            dexscreener: false,
          })),
      }),
    );

    operations.push(
      this.prisma.prismaTokenPrice.createMany({
        data: hourlyData.map((item) => ({
          tokenAddress,
          timestamp: Math.floor(item[0] / 1000),
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          price: item[4],
          coingecko: true,
          dexscreener: false,
        })),
        skipDuplicates: true,
      }),
    );

    await prismaBulkExecuteOperations(operations, true);
  }

  /**
   * Support instances where a token address is not supported by the platform id, provide the option to use a different platform
   */
  getMappedTokenDetails(address: string, tokens: TokenDefinition[]): MappedToken {
    const token = tokens.find((token) => {
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
