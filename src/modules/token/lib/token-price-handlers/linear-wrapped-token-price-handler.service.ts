import { PrismaService } from 'nestjs-prisma/dist/prisma.service';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { TokenPriceHandler } from '../../token-types';

export class LinearWrappedTokenPriceHandlerService implements TokenPriceHandler {
  public readonly exitIfFails = false;
  public readonly id = 'LinearWrappedTokenPriceHandlerService';

  constructor(private readonly prisma: PrismaService) {}

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens
      .filter((token) => token.types.includes('LINEAR_WRAPPED_TOKEN'))
      .map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    let operations: any[] = [];
    const tokensUpdated: string[] = [];
    const timestamp = timestampRoundedUpToNearestHour();
    const pools = await this.prisma.prismaPool.findMany({
      where: { type: 'LINEAR' },
      include: {
        linearData: true,
        tokens: { orderBy: { index: 'asc' }, include: { dynamicData: true } },
      },
    });
    const mainTokenPrices = await this.prisma.prismaTokenPrice.findMany({
      where: {
        tokenAddress: {
          in: pools.map((pool) => pool.tokens[pool.linearData?.mainIndex || 0].address),
        },
        timestamp,
      },
    });

    for (const token of tokens) {
      const pool = pools.find(
        (pool) =>
          pool.linearData && token.address === pool.tokens[pool.linearData.wrappedIndex].address,
      );

      if (pool && pool.linearData) {
        const mainToken = pool.tokens[pool.linearData.mainIndex];
        const wrappedToken = pool.tokens[pool.linearData.wrappedIndex];
        const mainTokenPrice = mainTokenPrices.find(
          (tokenPrice) => tokenPrice.tokenAddress == mainToken.address,
        );

        if (mainTokenPrice && wrappedToken.dynamicData) {
          const price = mainTokenPrice.price * parseFloat(wrappedToken.dynamicData.priceRate);

          operations.push(
            this.prisma.prismaTokenPrice.upsert({
              where: { tokenAddress_timestamp: { tokenAddress: token.address, timestamp } },
              update: { price, close: price },
              create: {
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

          tokensUpdated.push(token.address);
        }
      }
    }

    await Promise.all(operations);

    return tokensUpdated;
  }
}
