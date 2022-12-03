import { Injectable } from '@nestjs/common';
import { PrismaTokenCurrentPrice } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { networkConfig } from 'src/modules/config/network-config';
import * as moment from 'moment-timezone';

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
}
