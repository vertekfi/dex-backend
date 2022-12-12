import { Injectable } from '@nestjs/common';
import { PrismaTokenCurrentPrice } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { networkConfig } from 'src/modules/config/network-config';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { TokenPriceHandler } from '../../token/token-types';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { getDexPriceFromPair } from './dexscreener';

@Injectable()
export class TokenPriceService {
  constructor(private prisma: PrismaService) {}

  getPriceForToken(tokenPrices: PrismaTokenCurrentPrice[], tokenAddress: string): number {
    const tokenPrice = tokenPrices.find(
      (tokenPrice) => tokenPrice.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
    );

    return tokenPrice?.price || 0;
  }

  async getCurrentTokenPrices(): Promise<PrismaTokenCurrentPrice[]> {
    const tokenPrices = await this.prisma.prismaTokenCurrentPrice.findMany({
      orderBy: { timestamp: 'desc' },
      distinct: ['tokenAddress'],
    });

    const wethPrice = tokenPrices.find(
      (tokenPrice) => tokenPrice.tokenAddress === networkConfig.weth.address,
    );

    if (wethPrice) {
      tokenPrices.push({
        ...wethPrice,
        tokenAddress: networkConfig.eth.address,
      });
    }

    return tokenPrices.filter((tokenPrice) => tokenPrice.price > 0.000000001);
  }

  async getTokenPriceFrom24hAgo(): Promise<PrismaTokenCurrentPrice[]> {
    const oneDayAgo = moment().subtract(24, 'hours').unix();
    const tokenPrices = await this.prisma.prismaTokenPrice.findMany({
      orderBy: { timestamp: 'desc' },
      distinct: ['tokenAddress'],
      where: { timestamp: { lte: oneDayAgo } },
    });

    const wethPrice = tokenPrices.find(
      (tokenPrice) => tokenPrice.tokenAddress === networkConfig.weth.address,
    );

    if (wethPrice) {
      tokenPrices.push({
        ...wethPrice,
        tokenAddress: networkConfig.eth.address,
      });
    }

    return tokenPrices
      .filter((tokenPrice) => tokenPrice.price > 0.000000001)
      .map((tokenPrice) => ({
        id: `${tokenPrice.tokenAddress}-${tokenPrice.timestamp}`,
        ...tokenPrice,
      }));
  }

  async updateTokenPrices(handlers: TokenPriceHandler[]): Promise<void> {
    const tokens = await this.prisma.prismaToken.findMany({
      include: {
        types: true,
        // fetch the last price stored
        prices: { take: 1, orderBy: { timestamp: 'desc' } },
      },
    });

    // order by timestamp ascending, so the tokens at the front of the list are the ones with the oldest timestamp
    // this is for instances where a query gets rate limited and does not finish
    let tokensWithTypes = _.sortBy(tokens, (token) => token.prices[0]?.timestamp || 0).map(
      (token) => ({
        ...token,
        types: token.types.map((type) => type.type),
      }),
    );

    // Break up for dexscreener and coingecko as needed. Currently only need screener for our degen shit

    for (const handler of handlers) {
      const accepted = await handler.getAcceptedTokens(tokensWithTypes);
      const acceptedTokens = tokensWithTypes.filter((token) => accepted.includes(token.address));
      let updated: string[] = [];

      try {
        updated = await handler.updatePricesForTokens(acceptedTokens);
      } catch (e) {
        console.error(e);
        // Sentry.captureException(e, (scope) => {
        //     scope.setTag('handler.exitIfFails', handler.exitIfFails);
        //     return scope;
        // });
        if (handler.exitIfFails) {
          throw e;
        }
      }

      // remove any updated tokens from the list for the next handler
      tokensWithTypes = tokensWithTypes.filter((token) => !updated.includes(token.address));
    }

    await this.updateCandleStickData();

    // we only keep token prices for the last 24 hours
    // const yesterday = moment().subtract(1, 'day').unix();
    // await prisma.prismaTokenPrice.deleteMany({ where: { timestamp: { lt: yesterday } } });
  }

  private async updateCandleStickData() {
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
