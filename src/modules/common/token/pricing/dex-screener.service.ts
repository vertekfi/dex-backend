import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken, PrismaTokenDynamicData } from '@prisma/client';
import { chunk, uniq } from 'lodash';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { TokenDefinition } from 'src/modules/common/token/types';
import { HistoricalPrice } from 'src/modules/token/token-types-old';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { AccountWeb3 } from '../../types';
import { PROTOCOL_TOKEN } from '../../web3/contract.service';
import { RPC } from '../../web3/rpc.provider';
import { TokenPricingService } from '../types';
import { DS_ADDRESS_CAP, DS_CHAIN_MAP, getDexPairInfo, getDexPriceFromPair } from './dexscreener';
import { isDexscreenerToken, validateDexscreenerToken } from './utils';

@Injectable()
export class DexScreenerService implements TokenPricingService {
  exitIfFails: boolean = false;
  readonly id = 'DexScreenerService';

  constructor(@Inject(RPC) private rpc: AccountWeb3, private readonly prisma: PrismaService) {}

  async getMarketDataForToken(tokens: PrismaToken[]): Promise<PrismaTokenDynamicData[]> {
    tokens = tokens.filter(isDexscreenerToken);

    const data: PrismaTokenDynamicData[] = [];

    // Account for future growth now instead of an issue popping up later
    const chunks = chunk(tokens, DS_ADDRESS_CAP);
    for (const chunk of chunks) {
      let pairAddresses = uniq(chunk.map((t) => t.dexscreenPairAddress));
      // if (pairAddresses.length > DS_ADDRESS_CAP) {
      //   pairAddresses = pairAddresses.slice(0, DS_ADDRESS_CAP);
      // }

      const result = await getDexPairInfo(DS_CHAIN_MAP[this.rpc.chainId], pairAddresses.join(','));

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
      token.dexScreenerPairAddress,
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
    //   coingecko: true,
    // }
    return [];
  }

  async getTokenHistoricalPrices(address: string, days: number): Promise<HistoricalPrice[]> {
    // Retrieve from database
    return [];
  }

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens
      .filter((token) => token.useDexscreener && token.dexscreenPairAddress)
      .map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    const timestamp = timestampRoundedUpToNearestHour();

    let updated: string[] = [];
    let operations: any[] = [];

    for (const token of tokens) {
      // We know the token has the pair address at this point
      let price: number;
      const chainId = parseInt(process.env.CHAIN_ID);
      if (chainId === 5 && token.address === PROTOCOL_TOKEN[chainId]) {
        // TODO: For testing only
        price = 7;
      } else {
        const screenerPrice = await getDexPriceFromPair('bsc', token.dexscreenPairAddress);
        price = screenerPrice.priceNum;
      }

      updated.push(token.address);

      operations.push(
        this.prisma.prismaTokenPrice.upsert({
          where: { tokenAddress_timestamp: { tokenAddress: token.address, timestamp } },
          update: { price: price, close: price },
          create: {
            // create a history record
            tokenAddress: token.address,
            timestamp,
            price,
            high: price,
            low: price,
            open: price,
            close: price,
          },
        }),
      );

      operations.push(
        this.prisma.prismaTokenCurrentPrice.upsert({
          where: { tokenAddress: token.address },
          update: { price: price },
          create: {
            tokenAddress: token.address,
            timestamp,
            price,
          },
        }),
      );
    }

    await Promise.all(operations);

    return updated;
  }
}
