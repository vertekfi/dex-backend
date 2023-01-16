import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken, PrismaTokenDynamicData } from '@prisma/client';
import { chunk, uniq } from 'lodash';
import * as moment from 'moment-timezone';
import { PrismaService } from 'nestjs-prisma';
import { TokenDefinition } from 'src/modules/common/token/types';
import { HistoricalPrice } from 'src/modules/token/token-types-old';
import { AccountWeb3 } from '../../types';
import { RPC } from '../../web3/rpc.provider';
import { TokenPricingService } from '../types';
import { DS_ADDRESS_CAP, DS_CHAIN_MAP, getDexPairInfo, getDexPriceFromPair } from './dexscreener';
import { isDexscreenerToken, validateDexscreenerToken } from './utils';

@Injectable()
export class DexScreenerService implements TokenPricingService {
  readonly coinGecko = false;

  constructor(@Inject(RPC) private rpc: AccountWeb3, private readonly prisma: PrismaService) {}

  async getMarketDataForToken(tokens: PrismaToken[]): Promise<PrismaTokenDynamicData[]> {
    tokens = tokens.filter(isDexscreenerToken);

    const data: PrismaTokenDynamicData[] = [];

    // Account for future growth now instead of an issue popping up later
    const chunks = chunk(tokens, DS_ADDRESS_CAP);
    for (const chunk of chunks) {
      let pairAddresses = uniq(chunk.map((t) => t.dexscreenPairAddress));

      const result = await getDexPairInfo(DS_CHAIN_MAP[this.rpc.chainId], pairAddresses.join(','));

      // Could multicall the total supply get market cap if it's really needed

      for (const item of result.pairs) {
        const marketData: PrismaTokenDynamicData = {
          price: parseFloat(item.priceUsd),
          ath: 0, // db
          atl: 0, // db
          marketCap: 0, // Have to manually call the contract for total supply (then * current price)
          fdv: item.fdv,
          high24h: 0, // db
          low24h: 0, // db
          priceChange24h: item.priceChange.h24,
          priceChangePercent24h: item.priceChange.h24,
          priceChangePercent7d: 0, // db
          priceChangePercent14d: 0, // db
          priceChangePercent30d: 0, // db
          updatedAt: new Date(new Date().toUTCString()), // correct format?
          coingeckoId: null,
          dexscreenerPair: item.pairAddress,
        };

        data.push(marketData);
      }
    }

    return data;
  }

  async getTokenPrice(token: TokenDefinition): Promise<number> {
    validateDexscreenerToken(token as unknown as PrismaToken);

    const { priceNum } = await getDexPriceFromPair(
      DS_CHAIN_MAP[this.rpc.chainId],
      token.dexscreenPairAddress,
    );

    return priceNum;
  }

  async getCoinCandlestickData(
    token: PrismaToken,
    days: 1 | 30,
  ): Promise<[number, number, number, number, number][]> {
    // "tokenId" should be the dexscreener pair address instead of coingecko id
    // validateDexscreenerToken(token as unknown as PrismaToken);

    if (!isDexscreenerToken(token)) {
      return [];
    }

    // TODO: from database
    // Structure of the gecko chart data returned:
    // [
    //   [ 1673739000000, 1549.98, 1550.79, 1549.16, 1550.79 ],
    //   [ 1673740800000, 1550.63, 1554.25, 1549.11, 1549.11 ],
    //   [ 1673742600000, 1553.17, 1553.91, 1548.63, 1549.88 ],
    // ]

    // need to run the sync as scheduled job to get the data
    //
    // {
    //   tokenAddress,
    //   timestamp: item[0] / 1000,
    //   open: item[1],
    //   high: item[2],
    //   low: item[3],
    //   close: item[4],
    //   price: item[4],
    //   coingecko: false,
    // }
    return [];
  }

  async getTokenHistoricalPrices(
    address: string,
    days: number,
    tokens: TokenDefinition[],
  ): Promise<HistoricalPrice[]> {
    tokens = tokens.filter(isDexscreenerToken);
    // Retrieve from database

    // gecko flow
    // const now = Math.floor(Date.now() / 1000);
    // const end = now;
    // const start = end - days * ONE_DAY_SECONDS;

    // const mapped = this.getMappedTokenDetails(address, tokenDefinitions);

    // const endpoint = `/coins/${mapped.platformId}/contract/${mapped.coingGeckoContractAddress}/market_chart/range?vs_currency=${this.fiatParam}&from=${start}&to=${end}`;
    // const result = await this.get<HistoricalPriceResponse>(endpoint);
    // return result.prices.map((item) => ({
    //   // anchor to the start of the hour
    //   timestamp:
    //     moment
    //       .unix(item[0] / 1000)
    //       .startOf('hour')
    //       .unix() * 1000,
    //   price: item[1],
    // }));

    // Get screener tokens price history data that was created by the scheduled job
    const timestamp = moment().subtract();
    // So a prisma.tokenthingie.findMany({ where: { timestamp: { gt: } }})

    return [];
  }
}
