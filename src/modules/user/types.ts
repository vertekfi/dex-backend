import { BigNumber } from 'ethers';

export type VeBalLockInfo = {
  lockedEndDate: number;
  lockedAmount: string;
  totalSupply: string;
  currentBalance: string;
  epoch: string;
  hasExistingLock: boolean;
  isExpired: boolean;
  percentOwned: string;
};

export type VeBalLockInfoResult = {
  locked: BigNumber[];
  epoch: BigNumber;
  totalSupply: BigNumber;
  balanceOf: BigNumber;
};
