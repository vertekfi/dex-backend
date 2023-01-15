import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { TokenDefinition } from 'src/modules/common/token/types';
import { HistoricalPrice } from 'src/modules/token/token-types-old';
import { AccountWeb3 } from '../../types';
import { RPC } from '../../web3/rpc.provider';
import { TokenPricingService } from '../types';
import { DS_CHAIN_MAP, getDexPriceFromPair } from './dexscreener';
import { validateDexscreenerToken } from './utils';

@Injectable()
export class DexScreenerService implements TokenPricingService {
  constructor(@Inject(RPC) private rpc: AccountWeb3, private readonly prisma: PrismaService) {}

  async getTokenPrice(token: TokenDefinition): Promise<number> {
    validateDexscreenerToken(token as unknown as PrismaToken);

    const { priceNum } = await getDexPriceFromPair(
      DS_CHAIN_MAP[this.rpc.chainId],
      token.dexScreenerPairAddress,
    );

    return priceNum;
  }

  async getCoinCandlestickData(
    tokenId: string,
    days: 1 | 30,
  ): Promise<[number, number, number, number, number][]> {
    // TODO: from database
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
}
