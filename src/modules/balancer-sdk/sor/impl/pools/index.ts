import { WeightedPool } from './weightedPool/weightedPool';
// import { StablePool } from './stablePool/stablePool';
// import { MetaStablePool } from './metaStablePool/metaStablePool';
// import { LinearPool } from './linearPool/linearPool';
// import { PhantomStablePool } from './phantomStablePool/phantomStablePool';
import { BigNumber as OldBigNumber, INFINITY, scale, ZERO } from '../utils/bignumber';
import { SubgraphPoolBase, PoolBase, SwapTypes, PoolPairBase, PoolTypes } from '../types';
import { StablePool } from './stablePool/stablePool';
import { MetaStablePool } from './metaStablePool/metaStablePool';
import { LinearPool } from './linearPool/linearPool';
import { PhantomStablePool } from './phantomStablePool/phantomStablePool';

export function parseNewPool(
  pool: SubgraphPoolBase,
): WeightedPool | StablePool | LinearPool | MetaStablePool | PhantomStablePool | undefined {
  // We're not interested in any pools which don't allow swapping
  if (!pool.swapEnabled) return undefined;

  let newPool: WeightedPool | StablePool | LinearPool | MetaStablePool | PhantomStablePool;

  try {
    if (pool.poolType === 'Weighted' || pool.poolType === 'Investment') {
      newPool = WeightedPool.fromPool(pool, false);
    } else if (pool.poolType === 'Stable') {
      newPool = StablePool.fromPool(pool);
    } else if (pool.poolType === 'LiquidityBootstrapping') {
      newPool = WeightedPool.fromPool(pool, true);
    } else if (pool.poolType === 'MetaStable') {
      newPool = MetaStablePool.fromPool(pool);
    } else if (pool.poolType.toString().includes('Linear')) {
      newPool = LinearPool.fromPool(pool);
    } else if (pool.poolType === 'StablePhantom' || pool.poolType === 'ComposableStable')
      newPool = PhantomStablePool.fromPool(pool);
    else {
      console.error(`Unknown pool type or type field missing: ${pool.poolType} ${pool.id}`);
      return undefined;
    }
  } catch (err) {
    console.error(`parseNewPool: ${err.message}`);
    return undefined;
  }
  return newPool;
}

// TODO: Add cases for pairType = [BTP->token, token->BTP] and poolType = [weighted, stable]
export function getOutputAmountSwap(
  pool: PoolBase,
  poolPairData: PoolPairBase,
  swapType: SwapTypes,
  amount: OldBigNumber,
): OldBigNumber {
  // TODO: check if necessary to check if amount > limitAmount
  if (swapType === SwapTypes.SwapExactIn) {
    if (poolPairData.poolType !== PoolTypes.Linear && poolPairData.balanceIn.isZero()) {
      return ZERO;
    } else {
      return pool._exactTokenInForTokenOut(poolPairData, amount);
    }
  } else {
    if (poolPairData.balanceOut.isZero()) {
      return ZERO;
    } else if (scale(amount, poolPairData.decimalsOut).gte(poolPairData.balanceOut.toString())) {
      return INFINITY;
    } else {
      return pool._tokenInForExactTokenOut(poolPairData, amount);
    }
  }
  throw Error('Unsupported swap');
}
