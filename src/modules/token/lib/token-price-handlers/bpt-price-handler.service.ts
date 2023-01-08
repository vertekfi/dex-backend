import { TokenPriceHandler } from '../../token-types';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';

export class BptPriceHandlerService implements TokenPriceHandler {
  public readonly exitIfFails = false;
  public readonly id = 'BptPriceHandlerService';

  constructor(private readonly prisma: PrismaService) {}

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens
      .filter((token) => token.types.includes('BPT') || token.types.includes('PHANTOM_BPT'))
      .map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    const timestamp = timestampRoundedUpToNearestHour();
    const pools = await this.prisma.prismaPool.findMany({
      where: { dynamicData: { totalLiquidity: { gt: 0.1 } } },
      include: { dynamicData: true },
    });
    let updated: string[] = [];
    let operations: any[] = [];

    for (const token of tokens) {
      const pool = pools.find((pool) => pool.address === token.address);

      if (pool?.dynamicData && pool.dynamicData.totalLiquidity !== 0) {
        const price = pool.dynamicData.totalLiquidity / parseFloat(pool.dynamicData.totalShares);
        updated.push(token.address);

        operations.push(
          this.prisma.prismaTokenPrice.upsert({
            where: { tokenAddress_timestamp: { tokenAddress: token.address, timestamp } },
            update: { price: price, close: price },
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
      }
    }

    await Promise.all(operations);

    return updated;
  }
}
