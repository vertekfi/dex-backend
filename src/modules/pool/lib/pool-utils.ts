import { PrismaPoolType } from '@prisma/client';
import { networkConfig } from '../../config/network-config';
import { isSameAddress } from '@balancer-labs/sdk';

type PoolWithTypeAndFactory = {
  type: PrismaPoolType;
  factory?: string | null;
};

export function isStablePool(poolType: PrismaPoolType) {
  return poolType === 'STABLE' || poolType === 'META_STABLE' || poolType === 'PHANTOM_STABLE';
}

export function isWeightedPoolV2(pool: { type: string; factory: string }) {
  pool.type = pool.type.toUpperCase();
  return (
    pool.type === 'WEIGHTED' &&
    networkConfig.balancer.weightedPoolV2Factories.find((factory) =>
      isSameAddress(pool.factory || '', factory),
    ) !== undefined
  );
}

export function isWeightedPool(pool: { type: string; factory: string }) {
  pool.type = pool.type.toUpperCase();
  return (
    pool.type === 'WEIGHTED' &&
    networkConfig.balancer.weightedPoolFactories.find((factory) =>
      isSameAddress(pool.factory || '', factory),
    ) !== undefined
  );
}

export function isComposableStablePool(pool: { type: string; factory: string }) {
  pool.type = pool.type.toUpperCase();
  return (
    pool.type === 'PHANTOM_STABLE' &&
    networkConfig.balancer.composableStablePoolFactories.find((factory) =>
      isSameAddress(pool.factory || '', factory),
    ) !== undefined
  );
}
