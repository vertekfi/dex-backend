import { PrismaToken, PrismaTokenDynamicData } from '@prisma/client';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { HistoricalPrice } from 'src/modules/token/token-types-old';

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

export interface TokenPricingService {
  coinGecko: boolean;

  getTokenPrice: (token: TokenDefinition) => Promise<number>;

  getCoinCandlestickData: (
    token: PrismaToken,
    days: 1 | 30,
  ) => Promise<[number, number, number, number, number][]>;

  getTokenHistoricalPrices: (
    address: string,
    days: number,
    tokenDefinitions: TokenDefinition[],
  ) => Promise<HistoricalPrice[]>;

  getMarketDataForToken: (tokens: PrismaToken[]) => Promise<PrismaTokenDynamicData[]>;
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
  coingGeckoContractAddress: string;
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

export interface DexScreenerApiResult {
  pairs: TokenDataDexScreener[];
  pair: TokenDataDexScreener | null;
}

export interface TokenMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: Date;
  atl: number;
  atl_change_percentage: number;
  atl_date: Date;
  roi: null;
  last_updated: Date;
  price_change_percentage_14d_in_currency: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  price_change_percentage_7d_in_currency: number;
}
