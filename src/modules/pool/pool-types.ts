import { PrismaPoolStakingType, PrismaPoolType } from '@prisma/client';
import { BigNumber } from 'ethers';
import { PrismaPoolWithExpandedNesting } from 'prisma/prisma-types';

export interface PoolAprService {
  name: string;
  setPrimaryTokens?: (tokens: string[]) => void;
  updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void>;
}

export interface PoolStakingService {
  syncStakingForPools(): Promise<void>;
  reloadStakingForAllPools(stakingTypes: PrismaPoolStakingType[]): Promise<void>;
}

export interface MulticallExecuteResult {
  amp?: string[];
  swapFee: string;
  totalSupply: string;
  weights?: string[];
  targets?: string[];
  poolTokens: {
    tokens: string[];
    balances: string[];
  };
  wrappedTokenRate?: BigNumber;
  rate?: BigNumber;
  swapEnabled?: boolean;
  tokenRates?: BigNumber[];
  metaPriceRateCache?: [BigNumber, BigNumber, BigNumber][];
  linearPools?: Record<
    string,
    {
      id: string;
      priceRate: string;
      totalSupply: string;
      mainToken: { address: string; index: BigNumber };
      wrappedToken: { address: string; index: BigNumber; rate: string };
    }
  >;
  stablePhantomPools?: Record<
    string,
    {
      id: string;
      totalSupply: string;
      tokenRates: BigNumber[];
      poolTokens: {
        tokens: string[];
        balances: string[];
      };
    }
  >;
}

export const SUPPORTED_POOL_TYPES: PrismaPoolType[] = [
  'WEIGHTED',
  'STABLE',
  'META_STABLE',
  'PHANTOM_STABLE',
  'LINEAR',
  'LIQUIDITY_BOOTSTRAPPING',
  'ELEMENT',
];
