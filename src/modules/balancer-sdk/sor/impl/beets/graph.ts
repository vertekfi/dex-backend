import { PoolBase, PoolPairBase, PoolTypes, Swap, SwapTypes } from '../types';
import _, { keyBy, mapValues } from 'lodash';
import { MultiUndirectedGraph } from 'graphology';
import { BigNumber as OldBigNumber } from '../../utils/bignumber';
import { LinearPool } from '../pools/linearPool/linearPool';
import { PoolAddressDictionary } from './types';

export interface GraphEdgeData {
  poolId: string;
  poolAddress: string;
  normalizedLiquidity: OldBigNumber;
  poolPair: PoolPairBase;
  reversePoolPair: PoolPairBase;
  reverseNormalizedLiquidity: OldBigNumber;
  pool: PoolBase;
}

export interface PathSegment extends GraphEdgeData {
  tokenIn: string;
  tokenOut: string;
}

export function createGraph(
  poolsMap: PoolAddressDictionary,
): MultiUndirectedGraph<any, GraphEdgeData> {
  const pools = Object.values(poolsMap);
  const graph = new MultiUndirectedGraph<any, GraphEdgeData>();

  const tokens = _.uniqBy(_.flatten(pools.map((pool) => pool.tokensList)), (token) => token);

  for (const token of tokens) {
    graph.addNode(token);
  }

  for (const pool of pools) {
    const map = getMainTokenToPoolTokenMap(pool, poolsMap);
    // We sort the main tokens to ensure that the order is always the same across all pools
    // This is specifically important for instances where linear pool bpts are being mapped down
    const mainTokens = Object.keys(map).sort();

    for (let i = 0; i < mainTokens.length - 1; i++) {
      for (let j = i + 1; j < mainTokens.length; j++) {
        //don't include linear pools in the path
        if (pool.poolType === PoolTypes.Linear) {
          continue;
        }

        const poolPair = pool.parsePoolPairData(map[mainTokens[i]], map[mainTokens[j]]);

        const reversePoolPair = pool.parsePoolPairData(map[mainTokens[j]], map[mainTokens[i]]);

        graph.addUndirectedEdgeWithKey(
          `${pool.id}-${mainTokens[i]}-${mainTokens[j]}`,
          mainTokens[i],
          mainTokens[j],
          {
            poolId: pool.id,
            poolAddress: pool.address,
            poolPair,
            normalizedLiquidity: pool.getNormalizedLiquidity(poolPair),
            reversePoolPair,
            reverseNormalizedLiquidity: pool.getNormalizedLiquidity(reversePoolPair),
            pool,
          },
        );
      }
    }

    const isPhantomStable =
      pool.poolType === PoolTypes.MetaStable && pool.tokensList.includes(pool.address);

    //we need to create the edges between the phantom BPTs to support the relayer routes
    if (pool.poolType === PoolTypes.Linear || isPhantomStable) {
      const tokens = pool.tokensList;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === pool.address) {
          continue;
        }

        const poolPair = pool.parsePoolPairData(pool.address, tokens[i]);

        const reversePoolPair = pool.parsePoolPairData(tokens[i], pool.address);

        graph.addUndirectedEdgeWithKey(
          `${pool.id}-${pool.address}-${tokens[i]}}`,
          pool.address,
          tokens[i],
          {
            poolId: pool.id,
            poolAddress: pool.address,
            poolPair,
            normalizedLiquidity: pool.getNormalizedLiquidity(poolPair),
            reversePoolPair,
            reverseNormalizedLiquidity: pool.getNormalizedLiquidity(reversePoolPair),
            pool,
          },
        );
      }
    }
  }

  return graph;
}

export function findPaths(
  graph: MultiUndirectedGraph<any, GraphEdgeData>,
  allPools: PoolAddressDictionary,
  token: string,
  tokenOut: string,
  path: string[],
  depth: number,
  maxDepth: number,
  isRelayerRoute: boolean,
  callback: (paths: PathSegment[][]) => void,
) {
  //either the token in or token out are not in the graph
  if (!graph.hasNode(token) || !graph.hasNode(tokenOut)) {
    return;
  }

  const neighbors = graph.neighbors(token);

  for (const neighbor of neighbors) {
    if (neighbor === tokenOut) {
      const expanded = expandPath(graph, allPools, isRelayerRoute, [...path, tokenOut]);

      if (expanded.length > 0) {
        callback(expanded);
      }
    }

    if (depth < maxDepth && !path.includes(neighbor)) {
      findPaths(
        graph,
        allPools,
        neighbor,
        tokenOut,
        [...path, neighbor],
        depth + 1,
        maxDepth,
        isRelayerRoute,
        callback,
      );
    }
  }
}

function expandPath(
  graph: MultiUndirectedGraph<any, GraphEdgeData>,
  allPools: PoolAddressDictionary,
  isRelayerRoute: boolean,
  path: string[],
): PathSegment[][] {
  const parts: PathSegment[][] = [];

  for (let i = 0; i < path.length - 1; i++) {
    parts[i] = [];

    const edgeEntries = graph.edgeEntries(path[i], path[i + 1]);

    for (const edge of edgeEntries) {
      parts[i].push({
        tokenIn: path[i],
        tokenOut: path[i + 1],
        ...edge.attributes,
      });
    }
  }

  const merged: PathSegment[][] = cartesian(parts);

  return merged.filter((path) => {
    //does not hop through the same pool multiple times
    const uniqueSegments = _.uniqBy(path, (segment) => segment.poolId);

    if (path.length !== uniqueSegments.length) {
      return false;
    }

    //does not use the same tokenIn twice
    const uniqueTokensIn = _.uniqBy(path, (segment) => segment.tokenIn);

    if (path.length !== uniqueTokensIn.length) {
      return false;
    }

    //does not use the same tokenOut twice
    const uniqueTokensOut = _.uniqBy(path, (segment) => segment.tokenOut);

    if (path.length !== uniqueTokensOut.length) {
      return false;
    }

    //if the poolPair tokenIn === tokenOut, it means the segment is irrelavent, its hopping through the same nested pool twice
    if (
      path.filter((segment) => segment.poolPair.tokenIn === segment.poolPair.tokenOut).length > 0
    ) {
      return false;
    }

    if (isRelayerRoute) {
      //for relayer routes, we're only concerned with paths that go exclusively through phantom pools
      return (
        path.filter((segment) => {
          const pool = allPools[segment.poolAddress];

          return (
            pool.poolType === PoolTypes.Linear ||
            (pool.poolType === PoolTypes.MetaStable &&
              pool.tokensList.includes(segment.poolAddress))
          );
        }).length === path.length
      );
    } else {
      //if a pool in the path contains the bpt of another pool, the same pool appears twice in the path
      for (let i = 0; i < path.length - 1; i++) {
        const pool = allPools[path[i].poolAddress];

        //TODO: path.length - 1 here doesn't look right
        for (let j = i + 1; j < path.length - 1; j++) {
          const otherPool = allPools[path[j].poolAddress];

          if (pool.tokensList.includes(otherPool.address)) {
            return false;
          } else if (otherPool.tokensList.includes(pool.address)) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

export function sortAndFilterPaths(
  paths: PathSegment[][],
  poolsMap: PoolAddressDictionary,
  maxPools: number,
): PathSegment[][] {
  const directPaths = paths.filter((path) => path.length === 1);
  const hopPaths = paths.filter((path) => path.length > 1);

  if (maxPools === 1) {
    return directPaths;
  }

  //group by the hopToken-poolId of the last hop
  const grouped = _.groupBy(hopPaths, (path) => {
    const lastSegment = path[path.length - 1];

    return `${lastSegment.tokenIn}-${lastSegment.poolId}`;
  });

  //select the path with the most liquid first hop from each group
  const filtered = _.map(grouped, (paths) => {
    return _.orderBy(
      paths,
      (path) => {
        const map = getMainTokenToPoolTokenMap(path[0].pool, poolsMap);

        //getNormalizedLiquidity is calculated in tokenOut, so for consistency
        //we pass the tokenIn as the tokenOut since path[0].tokenIn will always be the same
        return map[path[0].tokenIn] === path[0].poolPair.tokenOut
          ? path[0].normalizedLiquidity.toNumber()
          : path[0].reverseNormalizedLiquidity.toNumber();
      },
      ['desc'],
    )[0];
  });

  let seenPools: string[] = [];
  const orderedPaths = _.orderBy(
    [...directPaths, ...filtered],
    [
      (path) => {
        const lastSegment = path[path.length - 1];
        const pathPoolIds = path.map((segment) => segment.poolId);
        const map = getMainTokenToPoolTokenMap(lastSegment.pool, poolsMap);
        const normalizedLiquidity =
          map[lastSegment.tokenIn] === lastSegment.poolPair.tokenIn
            ? lastSegment.normalizedLiquidity.toNumber()
            : lastSegment.reverseNormalizedLiquidity.toNumber();

        //apply at 25% penalty if one of the pools has already been seen
        if (_.intersection(seenPools, pathPoolIds).length > 0) {
          return normalizedLiquidity * 0.75;
        }

        seenPools = [...seenPools, ...pathPoolIds];

        return normalizedLiquidity;
      },
    ],
    ['desc'],
  );

  const uniquePaths = _.uniqBy(orderedPaths, (path) =>
    path.map((segment) => `${segment.poolId}-${segment.tokenIn}-${segment.tokenOut}`).join(),
  );

  return uniquePaths.slice(0, 50);
}

function pathHasDuplicateHop(pathToCheck: PathSegment[], paths: PathSegment[][]): boolean {
  const keysToCheck = pathToCheck.map(
    (segment) => `${segment.poolId}-${segment.tokenIn}-${segment.tokenOut}`,
  );

  for (const path of paths) {
    for (const segment of path) {
      const pathKey = `${segment.poolId}-${segment.tokenIn}-${segment.tokenOut}`;

      if (keysToCheck.includes(pathKey)) {
        return true;
      }
    }
  }

  return false;
}

export function getPoolPairDataCacheKey(poolPairData: PoolPairBase, swapType: SwapTypes) {
  return `${poolPairData.tokenIn}-${poolPairData.tokenOut}-${swapType}`;
}

export function getMainTokenToPoolTokenMap(
  pool: PoolBase,
  poolsMap: PoolAddressDictionary,
): { [mainToken: string]: string } {
  let map: { [mainToken: string]: string } = {};

  for (const token of pool.tokensList) {
    //skip the phantom bpt
    if (token === pool.address) {
      continue;
    }

    const tokenPool = poolsMap[token];

    if (
      tokenPool &&
      tokenPool.poolType === PoolTypes.Linear &&
      typeof tokenPool.mainIndex === 'number'
    ) {
      //nested linear pool
      map[tokenPool.tokensList[tokenPool.mainIndex]] = token;
    } else if (tokenPool && tokenPool.poolType === PoolTypes.MetaStable) {
      //nested phantom stable
      map = {
        ...map,
        //nested main tokens map to the phantom bpt
        ...mapValues(getMainTokenToPoolTokenMap(tokenPool, poolsMap), () => tokenPool.address),
      };
    } else {
      map[token] = token;
    }
  }

  return map;
}

export function getNestedLinearPoolsMap(
  pool: PoolBase,
  poolsMap: PoolAddressDictionary,
): { [mainToken: string]: { pool: LinearPool; parentPoolAddress: string } } {
  const nested: { pool: LinearPool; parentPoolAddress: string }[] = [];

  for (const token of pool.tokensList) {
    if (poolsMap[token] && poolsMap[token].poolType === PoolTypes.Linear) {
      const linearPool = poolsMap[token] as LinearPool;

      nested.push({ pool: linearPool, parentPoolAddress: pool.address });
    } else if (poolsMap[token] && poolsMap[token].poolType === PoolTypes.MetaStable) {
      //only support one level deep
      for (const nestedToken of poolsMap[token].tokensList) {
        if (poolsMap[nestedToken] && poolsMap[nestedToken].poolType === PoolTypes.Linear) {
          nested.push({
            pool: poolsMap[nestedToken] as LinearPool,
            parentPoolAddress: poolsMap[token].address,
          });
        }
      }
    }
  }

  if (nested.length === 0) {
    return {};
  }

  return keyBy(nested, (item) => item.pool.tokensList[item.pool.mainIndex]);
}

export function createNestedSwapPath(
  tokenIn: string,
  tokenOut: string,
  pool: PoolBase,
  linearPoolsMap: {
    [mainToken: string]: { pool: LinearPool; parentPoolAddress: string };
  },
  allPoolsMap: PoolAddressDictionary,
): { swap: Swap; poolPair: PoolPairBase }[] {
  if (pool.tokensList.includes(tokenIn) && pool.tokensList.includes(tokenOut)) {
    return [getSwapAndPoolPair(pool, tokenIn, tokenOut)];
  }

  const path: { swap: Swap; poolPair: PoolPairBase }[] = [];
  let poolTokenIn = tokenIn;

  if (linearPoolsMap[tokenIn]) {
    const linearPool = linearPoolsMap[tokenIn];

    //swap token in for linear BPT (ie: USDC -> bb-a-USDC)
    path.push(getSwapAndPoolPair(linearPool.pool, tokenIn, linearPool.pool.address));

    if (linearPool.parentPoolAddress !== pool.address) {
      //the linear pool is nested in a sub-phantom pool (ie:  bb-a-USD in bb-a-USD / bb-a-TUSD)
      const parentPool = allPoolsMap[linearPool.parentPoolAddress];

      //swap linear BPT for the sub-phantom BPT (ie: bb-a-USDC -> bb-a-USD)
      path.push(getSwapAndPoolPair(parentPool, linearPool.pool.address, parentPool.address));

      //the tokenIn for the top level pool is the sub-phantom BPT (bb-a-USD)
      poolTokenIn = parentPool.address;
    } else {
      //the tokenIn for the top level pool is the linear pool (ie: bb-a-USDC in bb-a-USD)
      poolTokenIn = linearPool.pool.address;
    }
  }

  let poolTokenOut = tokenOut;

  if (linearPoolsMap[tokenOut]) {
    const linearPool = linearPoolsMap[tokenOut];

    if (linearPool.parentPoolAddress === pool.address) {
      //the linear bpt is nested in the top level pool (ie: bb-a-USDT in bb-a-USD)
      poolTokenOut = linearPool.pool.address;
    } else {
      //the poolTokenOut is a sub-phantom BPT (ie: bb-a-USD in bb-a-USD / bb-a-TUSD)
      poolTokenOut = linearPool.parentPoolAddress;
    }
  }

  //top level token swap (ie: bb-a-USD -> bb-a-TUSD)
  path.push(getSwapAndPoolPair(pool, poolTokenIn, poolTokenOut));

  if (linearPoolsMap[tokenOut]) {
    const linearPool = linearPoolsMap[tokenOut];

    if (linearPool.parentPoolAddress !== pool.address) {
      //the linear pool is nested in a sub-phantom pool (ie:  bb-a-USD in bb-a-USD / bb-a-TUSD)
      const parentPool = allPoolsMap[linearPool.parentPoolAddress];

      //swap sub-phantom BPT for the linear BPT  (ie: bb-a-USD -> bb-a-USDC)
      path.push(getSwapAndPoolPair(parentPool, parentPool.address, linearPool.pool.address));
    }

    //swap linear BPT for the main token out  (ie: bb-a-USDC -> USDC)
    path.push(getSwapAndPoolPair(linearPool.pool, linearPool.pool.address, tokenOut));
  }

  return path;
}

function getSwapAndPoolPair(
  pool: PoolBase,
  tokenIn: string,
  tokenOut: string,
): { swap: Swap; poolPair: PoolPairBase } {
  const poolPair = pool.parsePoolPairData(tokenIn, tokenOut);

  return {
    poolPair,
    swap: {
      pool: pool.id,
      tokenIn: poolPair.tokenIn,
      tokenOut: poolPair.tokenOut,
      tokenInDecimals: poolPair.decimalsIn,
      tokenOutDecimals: poolPair.decimalsOut,
    },
  };
}

function cartesian(args) {
  const r: any[] = [],
    max = args.length - 1;
  function helper(arr, i) {
    for (let j = 0, l = args[i].length; j < l; j++) {
      const a = arr.slice(0); // clone arr
      a.push(args[i][j]);
      if (i == max) r.push(a);
      else helper(a, i + 1);
    }
  }
  helper([], 0);
  return r;
}
