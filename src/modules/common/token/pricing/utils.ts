import { PrismaToken } from '@prisma/client';
import { TokenDefinition } from 'src/modules/common/token/types';

export function validateCoinGeckoToken(token: PrismaToken) {
  if (!token || !token.coingeckoTokenId || !token.coingeckoContractAddress) {
    throw new Error('Missing token or token is missing coingecko data');
  }
}

export function validateDexscreenerToken(token: PrismaToken) {
  if (!token || !token.useDexscreener || !token.dexscreenPairAddress) {
    throw new Error('Missing token or token is missing dexscreener data');
  }
}
