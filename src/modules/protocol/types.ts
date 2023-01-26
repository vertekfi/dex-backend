import { RewardPool } from 'src/graphql';

export type ProtocolMetrics = {
  poolCount: string;
  swapFee24h: string;
  swapVolume24h: string;
  totalLiquidity: string;
  totalSwapFee: string;
  totalSwapVolume: string;
};

export type LatestsSyncedBlocks = {
  userWalletSyncBlock: string;
  userStakeSyncBlock: string;
  poolSyncBlock: string;
};

export interface PoolFilter {
  id: string;
  title: string;
  pools: string[];
}

export interface ProtocolConfigData {
  featuredPools: string[];
  incentivizedPools: string[];
  blacklistedPools: string[];
  poolFilters: PoolFilter[];
  rewardPools: RewardPool[];
  gauges: {
    address: string;
    poolId: string;
  }[];
}
