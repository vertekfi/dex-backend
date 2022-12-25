import { BigNumber } from 'ethers';

export type Address = string;

export enum PoolType {
  Weighted = 'Weighted',
  Investment = 'Investment',
  Stable = 'Stable',
  MetaStable = 'MetaStable',
  StablePhantom = 'StablePhantom',
  LiquidityBootstrapping = 'LiquidityBootstrapping',
  Linear = 'Linear',
}

export interface Pool {
  id: string;
  address: string;
  poolType: PoolType;
  swapFee: string;
  owner: string;
  factory: string;
  tokens: PoolToken[];
  tokensList: string[];
  totalLiquidity: string;
  totalShares: string;
  totalSwapFee: string;
  totalSwapVolume: string;
  createTime: number;
  onchain?: OnchainPoolData;
  //mainTokens?: string[];
  wrappedTokens?: string[];
  linearPoolTokensMap?: Record<string, PoolToken>;
  unwrappedTokens?: string[];
  isNew?: boolean;
  volumeSnapshot?: string;
  feesSnapshot?: string;
  apr?: PoolAPRs;
  boost?: string;
}

export interface PoolToken {
  address: string;
  balance: string;
  weight: string;
  priceRate: string | null;
  symbol?: string;
}

export interface LinearPoolToken {
  address: string;
  index: number;
  balance: string;
}

export interface WrappedLinearPoolToken extends LinearPoolToken {
  priceRate: string;
}

export interface LinearPoolData {
  id: string;
  priceRate: string;
  mainToken: LinearPoolToken;
  wrappedToken: WrappedLinearPoolToken;
  unwrappedTokenAddress: string;
  totalSupply: string;
}
export type LinearPoolDataMap = Record<Address, LinearPoolData>;

export interface OnchainTokenData {
  balance: string;
  weight: number;
  decimals: number;
  logoURI: string | undefined;
  name: string;
  symbol: string;
}

export interface OnchainPoolData {
  tokens: Record<Address, OnchainTokenData>;
  totalSupply: string;
  decimals: number;
  swapFee: string;
  amp?: string;
  swapEnabled: boolean;
  linearPools?: Record<Address, LinearPoolData>;
  tokenRates?: string[];
}

export type OnchainPoolDataMap = Record<string, OnchainPoolData>;

export type GaugeRewardToken = { address: string; name: string; decimals: number; symbol: string };
export type GaugeRewardTokenWithEmissions = GaugeRewardToken & { rewardsPerSecond: number };

export type GaugeShare = {
  id: string;
  balance: string;
  gauge: { id: string; poolId: string; poolAddress: string };
  user: { id: string };
};

export interface SubgraphGauge {
  id: string;
  symbol: string;
  poolId: string;
  totalSupply: string;
  factory: {
    id: string;
  };
}

export type GaugeStreamer = {
  address: string;
  gaugeAddress: string;
  totalSupply: string;
  poolId: string;
  rewardTokens: GaugeRewardTokenWithEmissions[];
};

export type GaugeUserShare = {
  gaugeAddress: string;
  poolId: string;
  amount: string;
  tokens: GaugeRewardToken[];
};

export type AprRange = { min: string; max: string };
export interface PoolAPRs {
  total: {
    unstaked: string;
    staked: {
      calc: (boost?: string) => string;
      max: string;
      min: string;
    };
  };
  swap: string;
  yield: {
    total: string;
    breakdown: { [address: string]: string };
  };
  staking?: {
    bal: {
      min: string;
      max: string;
    };
    rewards: string;
  };
  veBal?: string;
}

export enum FiatCurrency {
  usd = 'usd',
}

export enum FiatSymbol {
  usd = '$',
}

export const MAX_REWARD_TOKENS = 8;

export type RewardTokenData = {
  distributor: string;
  integral: BigNumber;
  last_update: BigNumber;
  period_finish: BigNumber;
  rate: BigNumber;
  token: string;
};
