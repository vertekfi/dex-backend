import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { CoingeckoService } from './pricing/coingecko.service';
import { groupBy } from 'lodash';
import { TokenPricingService } from './types';
import { PRICE_SERVICES } from './pricing/price-services.provider';
import { validateCoinGeckoToken } from './pricing/utils';

@Injectable()
export class TokenChartDataService {
  constructor(
    @Inject(PRICE_SERVICES) private readonly pricingServices: TokenPricingService[],
    private readonly prisma: PrismaService,
  ) {}

  async initTokenChartData(tokenAddress: string) {
    const latestTimestamp = timestampRoundedUpToNearestHour();
    tokenAddress = tokenAddress.toLowerCase();

    const operations: any[] = [];
    const token = await this.prisma.prismaToken.findUnique({ where: { address: tokenAddress } });

    // gecko screener check

    validateCoinGeckoToken(token);

    for (const pricing of this.pricingServices) {
      const monthData = await pricing.getCoinCandlestickData(token.coingeckoTokenId, 30);
      const twentyFourHourData = await pricing.getCoinCandlestickData(token.coingeckoTokenId, 1);

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

      operations.push(this.prisma.prismaTokenPrice.deleteMany({ where: { tokenAddress } }));

      operations.push(
        this.prisma.prismaTokenPrice.createMany({
          data: monthData
            .filter((item) => item[0] / 1000 <= latestTimestamp)
            .map((item) => ({
              tokenAddress,
              timestamp: item[0] / 1000,
              open: item[1],
              high: item[2],
              low: item[3],
              close: item[4],
              price: item[4],
              coingecko: true,
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
          })),
          skipDuplicates: true,
        }),
      );

      await prismaBulkExecuteOperations(operations, true);
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

    await Promise.all(operations);
  }
}
