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
} from '../token-types-old';
import { networkConfig } from 'src/modules/config/network-config';
import { isAddress } from 'ethers/lib/utils';
import { MappedToken, TokenDefinition } from '../token-types';
import { TokenService } from '../../common/token/token.service';

/* coingecko has a rate limit of 10-50req/minute
   https://www.coingecko.com/en/api/pricing:
   Our free API has a rate limit of 10-50 calls per minute,
   if you exceed that limit you will be blocked until the next 1 minute window.
   Do revise your queries to ensure that you do not exceed our limits should
   that happen.

*/
const requestRateLimiter = new RateLimiter({ tokensPerInterval: 15, interval: 'minute' });

@Injectable()
export class CoingeckoService {
  private readonly baseUrl: string;
  private readonly fiatParam: string;
  private readonly platformId: string;
  private readonly nativeAssetId: string;
  private readonly nativeAssetAddress: string;

  constructor(private readonly tokenService: TokenService) {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.fiatParam = 'usd';
    this.platformId = networkConfig.coingecko.platformId;
    this.nativeAssetId = networkConfig.coingecko.nativeAssetId;
    this.nativeAssetAddress = networkConfig.chain.nativeAssetAddress;
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

  async getTokenHistoricalPrices(address: string, days: number): Promise<HistoricalPrice[]> {
    const now = Math.floor(Date.now() / 1000);
    const end = now;
    const start = end - days * ONE_DAY_SECONDS;
    const tokenDefinitions = await this.tokenService.getTokenDefinitions();
    const mapped = this.getMappedTokenDetails(address, tokenDefinitions);

    const endpoint = `/coins/${mapped.platform}/contract/${mapped.address}/market_chart/range?vs_currency=${this.fiatParam}&from=${start}&to=${end}`;

    const result = await this.get<HistoricalPriceResponse>(endpoint);

    return result.prices.map((item) => ({
      //anchor to the start of the hour
      timestamp:
        moment
          .unix(item[0] / 1000)
          .startOf('hour')
          .unix() * 1000,
      price: item[1],
    }));
  }

  /**
   * Support instances where a token address is not supported by the platform id, provide the option to use a different platform
   */
  getMappedTokenDetails(address: string, tokens: TokenDefinition[]): MappedToken {
    const token = tokens.find((token) => token.address.toLowerCase() === address.toLowerCase());
    if (token && token.coingeckoPlatformId && token.coingeckoContractAddress) {
      return {
        platform: token.coingeckoPlatformId,
        address: isAddress(token.coingeckoContractAddress)
          ? token.coingeckoContractAddress.toLowerCase()
          : token.coingeckoContractAddress,
        originalAddress: address.toLowerCase(),
      };
    }

    return {
      platform: this.platformId,
      address: address.toLowerCase(),
    };
  }

  private async get<T>(endpoint: string): Promise<T> {
    const remainingRequests = await requestRateLimiter.removeTokens(1);
    console.log('Remaining coingecko requests', remainingRequests);
    const { data } = await axios.get(this.baseUrl + endpoint);
    return data;
  }
}
