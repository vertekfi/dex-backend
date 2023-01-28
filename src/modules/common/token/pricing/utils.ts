import { PrismaToken } from '@prisma/client';
import { sortBy } from 'lodash';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { TokenDefinition } from '../types';

export function isCoinGeckoToken(token: PrismaToken | TokenDefinition): boolean {
  return !!(token && token.coingeckoTokenId && token.coingeckoTokenId);
}

export function isDexscreenerToken(token: PrismaToken | TokenDefinition): boolean {
  return !!(token && token.useDexscreener && token.dexscreenPairAddress);
}

export function validateCoinGeckoToken(token: PrismaToken | TokenDefinition) {
  if (!token || !token.coingeckoTokenId || !token.coingeckoContractAddress) {
    throw new Error('Missing token or token is missing coingecko data');
  }
}

export function validateDexscreenerToken(token: PrismaToken) {
  if (!token || !token.useDexscreener || !token.dexscreenPairAddress) {
    throw new Error('Missing token or token is missing dexscreener data');
  }
}

export function filterForGeckoTokens(tokens: TokenDefinition[]) {
  return tokens.filter(
    (tk) => isCoinGeckoToken(tk) && parseInt(process.env.CHAIN_ID) === tk.chainId,
  );
}

export async function getTokensWithTypes(prisma: PrismaService): Promise<PrismaTokenWithTypes[]> {
  const tokens = await prisma.prismaToken.findMany({
    select: {
      address: true,
      symbol: true,
      chainId: true,
      useDexscreener: true,
      usePoolPricing: true,
      dexscreenPairAddress: true,
      coingeckoContractAddress: true,
      coingeckoPlatformId: true,
      coingeckoTokenId: true,
      types: true,
      prices: { take: 1, orderBy: { timestamp: 'desc' } },
    },
  });

  // order by timestamp ascending, so the tokens at the front of the list are the ones with the oldest timestamp
  // this is for instances where a query gets rate limited and does not finish
  let tokensWithTypes: any[] = sortBy(tokens, (token) => token.prices[0]?.timestamp || 0).map(
    (token) => ({
      ...token,
      types: token.types.map((type) => type.type),
    }),
  );

  return tokensWithTypes;
}
