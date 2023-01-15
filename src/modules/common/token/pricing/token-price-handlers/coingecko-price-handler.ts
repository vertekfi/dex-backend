import { TokenPriceHandler } from '../../types';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { getDexPriceFromPair } from 'src/modules/common/token/pricing/dexscreener';

export class CoingeckoPriceHandlerService implements TokenPriceHandler {
  public readonly exitIfFails = false;
  public readonly id = 'DexscreenerPriceHandlerService';

  constructor(private readonly prisma: PrismaService) {}

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens
      .filter((token) => token.coingeckoContractAddress && token.coingeckoPlatformId)
      .map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    const timestamp = timestampRoundedUpToNearestHour();

    let updated: string[] = [];
    let operations: any[] = [];

    for (const token of tokens) {
      // We know the token has thecoingecko data at this point
      // const screenerPrice = await getDexPriceFromPair('bsc', token.dexscreenPairAddress);
      // const price = screenerPrice.priceNum;
      // updated.push(token.address);
      // operations.push(
      //   this.prisma.prismaTokenPrice.upsert({
      //     where: { tokenAddress_timestamp: { tokenAddress: token.address, timestamp } },
      //     update: { price: price, close: price },
      //     create: {
      //       // create a history record
      //       tokenAddress: token.address,
      //       timestamp,
      //       price,
      //       high: price,
      //       low: price,
      //       open: price,
      //       close: price,
      //     },
      //   }),
      // );
      // operations.push(
      //   this.prisma.prismaTokenCurrentPrice.upsert({
      //     where: { tokenAddress: token.address },
      //     update: { price: price },
      //     create: {
      //       tokenAddress: token.address,
      //       timestamp,
      //       price,
      //     },
      //   }),
      // );
    }

    await Promise.all(operations);

    return updated;
  }
}
