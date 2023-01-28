import { TokenPriceHandler } from '../../types';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { nestApp } from 'src/main';
import { CoingeckoService } from '../coingecko.service';
import { filterForGeckoTokens, isCoinGeckoToken } from '../utils';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { TokenService } from '../../token.service';
import { networkConfig } from 'src/modules/config/network-config';

export class CoingeckoPriceHandlerService implements TokenPriceHandler {
  public readonly exitIfFails = true;
  public readonly id = 'CoingeckoPriceHandlerService';

  private readonly prisma: PrismaService;
  private readonly gecko: CoingeckoService;
  private readonly tokenService: TokenService;
  private readonly weth: string;

  constructor() {
    this.prisma = nestApp.get(PrismaService);
    this.gecko = nestApp.get(CoingeckoService);
    this.tokenService = nestApp.get(TokenService);
    this.weth = networkConfig.weth.address;
  }

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens.filter(isCoinGeckoToken).map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    const timestamp = timestampRoundedUpToNearestHour();
    const nativeAsset = tokens.find((token) => token.address === this.weth);
    const tokensUpdated: string[] = [];

    if (nativeAsset) {
      const price = await this.gecko.getNativeAssetPrice();
      const usdPrice = price.usd;

      if (typeof usdPrice === 'undefined') {
        throw new Error('failed to load native asset price');
      }

      await this.prisma.prismaTokenPrice.upsert({
        where: { tokenAddress_timestamp: { tokenAddress: this.weth, timestamp } },
        update: { price: usdPrice, close: usdPrice },
        create: {
          tokenAddress: this.weth,
          timestamp,
          price: usdPrice,
          high: usdPrice,
          low: usdPrice,
          open: usdPrice,
          close: usdPrice,
        },
      });

      tokensUpdated.push(this.weth);
    }

    const geckoTokens = filterForGeckoTokens(await this.tokenService.getTokenDefinitions());
    const tokenAddresses = geckoTokens.map((item) => item.address);

    const tokenPricesByAddress = await this.gecko.getTokenPrices(tokenAddresses, geckoTokens);

    let operations: any[] = [];
    for (let tokenAddress of Object.keys(tokenPricesByAddress)) {
      const priceUsd = tokenPricesByAddress[tokenAddress].usd;
      const normalizedTokenAddress = tokenAddress.toLowerCase();
      const exists = tokenAddresses.includes(normalizedTokenAddress);

      if (!exists) {
        console.log('skipping token', normalizedTokenAddress);
      }

      if (exists && priceUsd) {
        operations.push(
          this.prisma.prismaTokenPrice.upsert({
            where: { tokenAddress_timestamp: { tokenAddress: normalizedTokenAddress, timestamp } },
            update: { price: priceUsd, close: priceUsd },
            create: {
              tokenAddress: normalizedTokenAddress,
              timestamp,
              price: priceUsd,
              high: priceUsd,
              low: priceUsd,
              open: priceUsd,
              close: priceUsd,
              coingecko: true,
            },
          }),
        );

        operations.push(
          this.prisma.prismaTokenCurrentPrice.upsert({
            where: { tokenAddress: normalizedTokenAddress },
            update: { price: priceUsd },
            create: {
              tokenAddress: normalizedTokenAddress,
              timestamp,
              price: priceUsd,
              coingecko: true,
            },
          }),
        );

        tokensUpdated.push(normalizedTokenAddress);
      }
    }

    await prismaBulkExecuteOperations(operations);

    return tokensUpdated;
  }
}
