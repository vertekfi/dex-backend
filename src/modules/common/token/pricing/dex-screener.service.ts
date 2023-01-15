import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { TokenDefinition } from 'src/modules/common/token/types';
import { HistoricalPrice } from 'src/modules/token/token-types-old';
import { TokenPricingService } from '../types';

@Injectable()
export class DexScreenerService implements TokenPricingService {
  constructor(private readonly prisma: PrismaService) {}

  getTokenPrice: (token: TokenDefinition) => Promise<number>;

  getCoinCandlestickData: (
    tokenId: string,
    days: 1 | 30,
  ) => Promise<[number, number, number, number, number][]>;

  getTokenHistoricalPrices: (address: string, days: number) => Promise<HistoricalPrice[]>;
}
