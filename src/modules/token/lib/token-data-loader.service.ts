import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class TokenDataLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  async syncTokenData() {
    // TODO: Get list from github or something

    await this.syncTokenTypes();
  }

  async syncTokenTypes() {
    const pools = await this.loadPoolData();
    const tokens = await this.prisma.prismaToken.findMany({ include: { types: true } });
    const types: Prisma.PrismaTokenTypeCreateManyInput[] = [];

    for (const token of tokens) {
      const tokenTypes = token.types.map((tokenType) => tokenType.type);
      const pool = pools.find((pool) => pool.address === token.address);

      if (pool && !tokenTypes.includes('BPT')) {
        types.push({
          id: `${token.address}-bpt`,
          type: 'BPT',
          tokenAddress: token.address,
        });
      }

      if (
        (pool?.type === 'PHANTOM_STABLE' || pool?.type === 'LINEAR') &&
        !tokenTypes.includes('PHANTOM_BPT')
      ) {
        types.push({
          id: `${token.address}-phantom-bpt`,
          type: 'PHANTOM_BPT',
          tokenAddress: token.address,
        });
      }

      const linearPool = pools.find(
        (pool) =>
          pool.linearData && pool.tokens[pool.linearData.wrappedIndex].address === token.address,
      );

      if (linearPool && !tokenTypes.includes('LINEAR_WRAPPED_TOKEN')) {
        types.push({
          id: `${token.address}-linear-wrapped`,
          type: 'LINEAR_WRAPPED_TOKEN',
          tokenAddress: token.address,
        });
      }
    }

    await this.prisma.prismaTokenType.createMany({ skipDuplicates: true, data: types });
  }

  private async loadPoolData() {
    return this.prisma.prismaPool.findMany({
      select: {
        address: true,
        symbol: true,
        name: true,
        type: true,
        tokens: { orderBy: { index: 'asc' } },
        linearData: true,
      },
    });
  }
}
