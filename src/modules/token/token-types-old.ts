export type Price = { usd: number };
export type CoingeckoPriceResponse = { [id: string]: Price };
export type TokenPrices = { [address: string]: Price };

export interface HistoricalPriceResponse {
  market_caps: number[][];
  prices: number[][];
  total_volumes: number[][];
}

export type HistoricalPrice = { timestamp: number; price: number };
export type TokenHistoricalPrices = { [address: string]: HistoricalPrice[] };

export interface TokenInfo {
  readonly chainId: number;
  readonly address: string;
  readonly name: string;
  readonly decimals: number;
  readonly symbol: string;
  readonly logoURI?: string;
  readonly tags?: string[];
  readonly useDexscreener?: boolean;
  readonly extensions?: {
    readonly [key: string]: string | number | boolean | null;
  };
}

export type TokenInfoMap = { [address: string]: TokenInfo };
