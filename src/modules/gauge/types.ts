export type GaugeRewardToken = { address: string; name: string; decimals: number; symbol: string };
export type GaugeRewardTokenWithEmissions = GaugeRewardToken & { rewardsPerSecond: number };

export type GaugeShare = {
  id: string;
  balance: string;
  gauge: { id: string; poolId: string; poolAddress: string };
  user: { id: string };
};

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
