import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { groupBy } from 'lodash';
import { TokenPricingService } from './types';
import { PRICE_SERVICES } from './pricing/price-services.provider';
import { getTokensWithTypes } from './pricing/utils';
import { isSameAddress } from '@balancer-labs/sdk';

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
    const tokens = (await getTokensWithTypes(this.prisma)).filter((t) =>
      isSameAddress(t.address, tokenAddress),
    );

    if (!tokens.length) {
      throw new Error(`initTokenChartData: Token not found`);
    }

    for (const pricing of this.pricingServices) {
      // TODO: Do the getAcceptedTokens pattern here
      // const acceptedTokens = pricing.getAcceptedTokens(token);

      // If not for the proper type
      const monthData = await pricing.getCoinCandlestickData(tokens[0], 30);
      const twentyFourHourData = await pricing.getCoinCandlestickData(tokens[0], 1);

      console.log(twentyFourHourData);

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

      const coingecko = pricing.id === 'DexScreenerService' ? false : true;

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
              coingecko,
              dexscreener: !coingecko,
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
            coingecko,
            dexscreener: !coingecko,
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
