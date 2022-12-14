export const COINGECKO_BASEURL = 'https://api.coingecko.com/api/v3';
export const COINGECKO_MAX_TOKENS_PER_PAGE = 100;
export const COINGECKO_MAX_TPS = 10;

export const MAX_BATCH_WRITE_SIZE = 20;
export const MAX_DYNAMODB_PRECISION = 38;

export const HOUR_IN_MS = 60 * 60 * 1000;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const WEEK_IN_MS = DAY_IN_MS * 7;

export const Network: Record<string, number> = {
  GOERLI: 5,
  BSC: 56,
};

export const NativeAssetAddress = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  BSC: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
};

export const NativeAssetId = {
  ETH: 'ethereum',
  BSC: 'binancecoin',
};

export const NativeAssetPriceSymbol = {
  ETH: 'eth',
  BSC: 'bnb',
};

export const TEST_NETWORKS: Record<string, number> = Object.fromEntries(
  Object.entries(Network).filter(([, id]) => {
    return [Network.GOERLI].includes(id);
  }),
);

export const PRODUCTION_NETWORKS: Record<string, number> = Object.fromEntries(
  Object.entries(Network).filter(([name]) => {
    return TEST_NETWORKS[name] == null;
  }),
);
