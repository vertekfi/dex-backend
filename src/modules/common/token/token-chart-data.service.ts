import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { TokenPricingService } from './types';
import { PRICE_SERVICES } from './providers/price-services.provider';
import { getTokensWithTypes } from './pricing/utils';
import { isSameAddress } from '@balancer-labs/sdk';

@Injectable()
export class TokenChartDataService {
  constructor(
    @Inject(PRICE_SERVICES) private readonly pricingServices: TokenPricingService[],
    private readonly prisma: PrismaService,
  ) {}

  async initTokenChartData(tokenAddress: string) {
    tokenAddress = tokenAddress.toLowerCase();

    const tokens = (await getTokensWithTypes(this.prisma)).filter((t) =>
      isSameAddress(t.address, tokenAddress),
    );

    if (!tokens.length) {
      throw new Error(`initTokenChartData: Token not found`);
    }

    for (const pricing of this.pricingServices) {
      await pricing.updateCoinCandlestickData(tokens[0]);
    }
  }

  async updateCandleStickData() {
    const timestamp = timestampRoundedUpToNearestHour();
    const tokenPrices = await this.prisma.prismaTokenPrice.findMany({ where: { timestamp } });
    let operations: any[] = [];

    for (const tokenPrice of tokenPrices) {
      operations.push(
        this.prisma.prismaTokenPrice.update({
          where: { tokenAddress_timestamp: { tokenAddress: tokenPrice.tokenAddress, timestamp } },
          data: {
            high: Math.max(tokenPrice.high, tokenPrice.price),
            low: Math.min(tokenPrice.low, tokenPrice.price),
          },
        }),
      );
    }

    await prismaBulkExecuteOperations(operations);
  }
}
