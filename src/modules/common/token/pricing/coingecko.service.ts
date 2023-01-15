import { Inject, Injectable } from '@nestjs/common';
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
import { MappedToken, TokenDefinition } from '../types';
import { TokenService } from '../token.service';
import { ConfigService } from 'src/modules/common/config.service';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { AccountWeb3 } from 'src/modules/common/types';
import { getDexPairInfo } from 'src/modules/common/token/pricing/dexscreener';
import { PROTOCOL_TOKEN } from 'src/modules/common/web3/contract.service';
import { TokenPricingService } from '../types';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';

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

  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly config: ConfigService, // private readonly tokenService: TokenService,
  ) {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.fiatParam = 'usd';
    this.platformId = this.config.env.COINGECKO_PLATFORM_ID;
    this.nativeAssetId = this.config.env.COINGECKO_NATIVE_ASSET_ID;
    this.nativeAssetAddress = this.config.env.NATIVE_ASSET_ADDRESS;
  }
  exitIfFails: boolean;
  id: string;

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
    if (!token.coingeckoPlatformId || !token.coingeckoContractAddress) {
      throw new Error(`token ${token.address} not a coingecko price token`);
    }

    const address = token.coingeckoContractAddress.toLowerCase();
    const endpoint = `/simple/token_price/${token.coingeckoPlatformId}?contract_addresses=${address}&vs_currencies=${this.fiatParam}`;
    const result = await this.get(endpoint);

    return result[address]?.usd;
  }

  async getCoinCandlestickData(
    tokenId: string,
    days: 1 | 30,
  ): Promise<[number, number, number, number, number][]> {
    const endpoint = `/coins/${tokenId}/ohlc?vs_currency=usd&days=${days}`;

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
