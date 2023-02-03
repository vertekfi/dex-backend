export interface MulticallPoolV1Result {
  amp?: string[];
  swapFee: string;
  poolTokens: {
    tokens: string[];
    balances: string[];
  };
}
