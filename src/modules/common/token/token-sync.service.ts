import { isSameAddress } from '@balancer-labs/sdk';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { ProtocolService } from 'src/modules/protocol/protocol.service';
import { getPriceHandlers } from './pricing/token-price-handlers';
import { getTokensWithTypes } from './pricing/utils';
import { TokenChartDataService } from './token-chart-data.service';

@Injectable()
export class TokenSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chartDataService: TokenChartDataService,
    private readonly protocolService: ProtocolService,
  ) {}

  // TODO: Finish this
  async syncTokenDynamicData() {
    let tokensWithTypes = await getTokensWithTypes(this.prisma);

    // This syncs up 24 hour price changes and such. Dexscreener provides a 24 hour change.
    // So need to schedule sync job times as needed for this
  }

  async syncTokenDefinitions() {
    const tokens = await this.protocolService.getProtocolTokenListAllChains();

    for (const token of tokens) {
      const tokenAddress = token.address.toLowerCase();
      let tokenData = {
        chainId: token.chainId,
        useDexscreener: token.useDexscreener,
        dexscreenPairAddress: token.dexscreenPairAddress,
      };

      await this.prisma.prismaToken.upsert({
        where: { address: tokenAddress },
        create: {
          name: token.name,
          address: tokenAddress,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logoURI,
          priority: token.priority || 0,
          coingeckoPlatformId: token.coingeckoPlatformId?.toLowerCase(),
          coingeckoContractAddress: token.coingeckoContractAddress?.toLowerCase(),
          coingeckoTokenId: token.coingeckoTokenId?.toLowerCase(),
          ...tokenData,
        },
        update: {
          name: token.name,
          symbol: token.symbol,
          // use set to ensure we overwrite the underlying value if it is removed from list
          logoURI: { set: token.logoURI || null },
          priority: token.priority,
          coingeckoPlatformId: { set: token.coingeckoPlatformId?.toLowerCase() || null },
          coingeckoContractAddress: { set: token.coingeckoContractAddress?.toLowerCase() || null },
          coingeckoTokenId: { set: token.coingeckoTokenId?.toLowerCase() || null },
          ...tokenData,
        },
      });
    }

    const whiteListedTokens = await this.prisma.prismaTokenType.findMany({
      where: {
        type: 'WHITE_LISTED',
      },
    });

    const addToWhitelist = tokens.filter((token) => {
      return !whiteListedTokens.some((dbToken) =>
        isSameAddress(token.address, dbToken.tokenAddress),
      );
    });

    const removeFromWhitelist = whiteListedTokens.filter((dbToken) => {
      return !tokens.some((token) => isSameAddress(dbToken.tokenAddress, token.address));
    });

    await this.prisma.prismaTokenType.createMany({
      data: addToWhitelist.map((token) => ({
        id: `${token.address}-white-listed`,
        tokenAddress: token.address.toLowerCase(),
        type: 'WHITE_LISTED' as const,
      })),
      skipDuplicates: true,
    });

    await this.prisma.prismaTokenType.deleteMany({
      where: { id: { in: removeFromWhitelist.map((token) => token.id) } },
    });

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

  async syncTokenPrices(): Promise<void> {
    let tokensWithTypes = await getTokensWithTypes(this.prisma);

    for (const handler of getPriceHandlers(this.prisma)) {
      const accepted = await handler.getAcceptedTokens(tokensWithTypes);
      const acceptedTokens: PrismaTokenWithTypes[] = tokensWithTypes.filter((token) =>
        accepted.includes(token.address),
      );

      let updated: string[] = [];
      try {
        updated = await handler.updatePricesForTokens(acceptedTokens);
      } catch (e) {
        console.error(e);
        if (handler.exitIfFails) {
          throw e;
        }
      }

      // remove any updated tokens from the list for the next handler
      tokensWithTypes = tokensWithTypes.filter((token) => !updated.includes(token.address));
    }

    await this.chartDataService.updateCandleStickData();

    // we only keep token prices for the last 24 hours
    // const yesterday = moment().subtract(1, 'day').unix();
    // await this.prisma.prismaTokenPrice.deleteMany({ where: { timestamp: { lt: yesterday } } });
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
