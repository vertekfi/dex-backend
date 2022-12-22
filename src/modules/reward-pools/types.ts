export interface IRewardPool {
  address: string;

  rewardToken: {
    address: string;
    name: string;
    symbol: string;
    logoURI: string;
    rewardPerBlock: string;
  };

  amountAeqStaked: string;
  amountAeqStakedValue: string;
  startBlock: number;
  endBlock: number;
  blocksRemaining: string;

  isPartnerPool: boolean;
  partnerInfo?: {
    siteLink?: string;
  };

  userInfo?: IRewardPoolUserInfo;

  rates: {
    apr: string;
    daily: string;
  };
}

export interface IRewardPoolUserInfo {
  poolAddress: string;
  amountDeposited: string;
  amountDepositedFull: string;
  depositValue: string;
  hasPendingRewards: boolean;
  pendingRewards: string;
  pendingRewardValue: string;
  percentageOwned: string;
}
