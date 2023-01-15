import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { HistoricalPrice } from 'src/modules/token/token-types-old';

export interface TokenPricingService {
  getTokenPrice: (token: TokenDefinition) => Promise<number>;

  getCoinCandlestickData: (
    tokenId: string,
    days: 1 | 30,
  ) => Promise<[number, number, number, number, number][]>;

  getTokenHistoricalPrices: (
    address: string,
    days: number,
    tokenDefinitions: TokenDefinition[],
  ) => Promise<HistoricalPrice[]>;
}

export interface TokenPriceHandler {
  exitIfFails: boolean;
  id: string;

  /**
   * Determines what tokens this price handler is capable of fetching a price for
   * @param tokens tokens needing prices
   */
  getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]>;

  /**
   * Updates prices for the provided tokens, returning an array of addresses of the tokens
   * actually updated.
   * @param tokens tokens needing prices
   */
  updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]>;
}

export interface TokenDefinition {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI?: string | null;
  priority: number;
  coingeckoPlatformId?: string | null;
  coingeckoContractAddress?: string | null;
  coingeckoTokenId?: string | null;
  tradable: boolean;
  useDexscreener?: boolean;
  dexScreenerPairAddress?: string;
}

export interface TokenPriceItem {
  id: string;
  timestamp: number;
  price: number;
}

export type PriceProvider = 'GECKO' | 'DEXSCREENER';

export interface MappedToken {
  platformId: string;
  address: string;
  originalAddress?: string;
  priceProvider: PriceProvider;
}

export interface TokenDataDexScreener {
  dexId: string;
  pairAddress: string;
  priceUsd: string;
  priceNative: string;

  txns: {
    h24: {
      buys: number;
      sells: number;
    };
    h6: {
      buys: number;
      sells: number;
    };
    h1: {
      buys: number;
      sells: number;
    };
    m5: {
      buys: number;
      sells: number;
    };
  };

  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  iquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
}
