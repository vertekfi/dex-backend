import { NewPath, PoolBase, PoolPairBase, Swap } from '../types';
import { Zero } from '@ethersproject/constants';
import { createNestedSwapPath, getNestedLinearPoolsMap } from './graph';
import { PoolAddressDictionary } from './types';

// Creates a path with pools.length hops
// i.e. tokens[0]>[Pool0]>tokens[1]>[Pool1]>tokens[2]>[Pool2]>tokens[3]
export function createPath(
  tokens: string[],
  pools: PoolBase[],
  allPools: PoolAddressDictionary,
  pathCache?: { [key: string]: { swaps: Swap[]; pairData: PoolPairBase[] } },
): NewPath {
  let tI: string, tO: string;
  let swaps: Swap[] = [];
  let pairData: PoolPairBase[] = [];

  for (let i = 0; i < pools.length; i++) {
    tI = tokens[i];
    tO = tokens[i + 1];

    if (pathCache && pathCache[`${pools[i].id}-${tI}-${tO}`]) {
      const cached = pathCache[`${pools[i].id}-${tI}-${tO}`];

      swaps = [...swaps, ...cached.swaps];
      pairData = [...pairData, ...cached.pairData];

      continue;
    }

    let poolSwaps: Swap[] = [];
    let poolPairData: PoolPairBase[] = [];

    //nested linearPools arrive here with tI or tO mapped to the main token
    //we expand the path to accommodate the additional swaps needed for a nested linear pool
    const nestedLinearPools = getNestedLinearPoolsMap(pools[i], allPools);

    //TODO: if a hop token is a nested BPT (linear of stable phantom), we don't need to unwind it, we can just use the BPT
    if (nestedLinearPools[tI] || nestedLinearPools[tO]) {
      const result = createNestedSwapPath(tI, tO, pools[i], nestedLinearPools, allPools);

      poolSwaps = result.map((item) => item.swap);
      poolPairData = result.map((item) => item.poolPair);
    } else {
      const poolPair = pools[i].parsePoolPairData(tI, tO);
      poolPairData.push(poolPair);

      const swap: Swap = {
        pool: pools[i].id,
        tokenIn: tI,
        tokenOut: tO,
        tokenInDecimals: poolPair.decimalsIn,
        tokenOutDecimals: poolPair.decimalsOut,
      };

      poolSwaps.push(swap);
    }

    if (pathCache) {
      pathCache[`${pools[i].id}-${tI}-${tO}`] = {
        swaps: poolSwaps,
        pairData: poolPairData,
      };
    }

    swaps = [...swaps, ...poolSwaps];
    pairData = [...pairData, ...poolPairData];
  }

  const path: NewPath = {
    id: pairData.map((item) => item.id).join(''),
    swaps,
    limitAmount: Zero,
    poolPairData: pairData,
    pools: pairData.map((data) => allPools[data.address]),
  };

  return path;
}
