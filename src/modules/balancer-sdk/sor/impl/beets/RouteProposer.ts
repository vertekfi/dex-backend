import { parseToPoolsDict } from '../routeProposal/filtering';
import { calculatePathLimits } from '../routeProposal/pathLimits';
import {
  NewPath,
  PoolDictionary,
  PoolPairBase,
  SorConfig,
  SubgraphPoolBase,
  Swap,
  SwapOptions,
  SwapTypes,
} from '../types';
import { mapKeys } from 'lodash';
import { createGraph, findPaths, GraphEdgeData, PathSegment, sortAndFilterPaths } from './graph';
import { createPath } from './createPath';
import { MultiUndirectedGraph } from 'graphology';

export class RouteProposer {
  graph: MultiUndirectedGraph<any, GraphEdgeData> | null = null;
  cache: Record<string, { paths: NewPath[] }> = {};

  constructor(private readonly config: SorConfig) {}

  initGraph(pools: SubgraphPoolBase[]) {
    const poolsAllDict = parseToPoolsDict(pools);
    const poolsAllAddressDict = mapKeys(poolsAllDict, (pool) => pool.address);

    this.graph = createGraph(poolsAllAddressDict);
    //clear the cache
    this.cache = {};
  }

  /**
   * Given a list of pools and a desired input/output, returns a set of possible paths to route through
   */
  getCandidatePaths(
    tokenIn: string,
    tokenOut: string,
    swapType: SwapTypes,
    pools: SubgraphPoolBase[],
    swapOptions: SwapOptions,
  ): NewPath[] {
    tokenIn = tokenIn.toLowerCase();
    tokenOut = tokenOut.toLowerCase();
    if (pools.length === 0) return [];

    // If token pair has been processed before that info can be reused to speed up execution
    const cache = this.cache[`${tokenIn}${tokenOut}${swapType}${swapOptions.timestamp}`];

    // forceRefresh can be set to force fresh processing of paths/prices
    if (!swapOptions.forceRefresh && !!cache) {
      // Using pre-processed data from cache
      return cache.paths;
    }

    const poolsAllDict = parseToPoolsDict(pools);
    const pathsWithLimits = this.getCandidatePathsFromDict(
      tokenIn,
      tokenOut,
      swapType,
      poolsAllDict,
      swapOptions.maxPools,
    );

    this.cache[`${tokenIn}${tokenOut}${swapType}${swapOptions.timestamp}`] = {
      paths: pathsWithLimits,
    };

    return pathsWithLimits;
  }

  /**
   * Given a pool dictionary and a desired input/output, returns a set of possible paths to route through.
   * @param {string} tokenIn - Address of tokenIn
   * @param {string} tokenOut - Address of tokenOut
   * @param {SwapTypes} swapType - SwapExactIn where the amount of tokens in (sent to the Pool) is known or SwapExactOut where the amount of tokens out (received from the Pool) is known.
   * @param {PoolDictionary} poolsAllDict - Dictionary of pools.
   * @param {number }maxPools - Maximum number of pools to hop through.
   * @returns {NewPath[]} Array of possible paths sorted by liquidity.
   */
  getCandidatePathsFromDict(
    tokenIn: string,
    tokenOut: string,
    swapType: SwapTypes,
    poolsAllDict: PoolDictionary,
    maxPools: number,
  ): NewPath[] {
    tokenIn = tokenIn.toLowerCase();
    tokenOut = tokenOut.toLowerCase();
    if (Object.keys(poolsAllDict).length === 0) return [];

    const poolsAllAddressDict = mapKeys(poolsAllDict, (pool) => pool.address);

    if (this.graph === null) {
      this.graph = createGraph(poolsAllAddressDict);
    }

    let graphPaths: PathSegment[][] = [];
    const isRelayerRoute = !!(poolsAllAddressDict[tokenIn] || poolsAllAddressDict[tokenOut]);

    findPaths(
      this.graph,
      poolsAllAddressDict,
      tokenIn,
      tokenOut,
      [tokenIn],
      1,
      2,
      isRelayerRoute,
      (foundPaths) => {
        graphPaths = [...graphPaths, ...foundPaths];
      },
    );

    if (graphPaths.length < 3) {
      findPaths(
        this.graph,
        poolsAllAddressDict,
        tokenIn,
        tokenOut,
        [tokenIn],
        1,
        3,
        isRelayerRoute,
        (foundPaths) => {
          graphPaths = [...graphPaths, ...foundPaths];
        },
      );
    }

    const sortedPaths = sortAndFilterPaths(graphPaths, poolsAllAddressDict, maxPools);

    const pathCache: {
      [key: string]: { swaps: Swap[]; pairData: PoolPairBase[] };
    } = {};

    const paths = sortedPaths.map((path) => {
      const tokens = [path[0].tokenIn, ...path.map((segment) => segment.tokenOut)];

      // this returns same hop twice in a path
      // it expands the nested pools but doesn't check for duplicate pools again
      // need to filter later
      return createPath(
        tokens,
        path
          //TODO: look into why this is possible
          // .filter((segment) => poolsAllDict[segment.poolId])  //no need to filter first
          .map((segment) => poolsAllDict[segment.poolId]),
        poolsAllAddressDict,
        pathCache,
      );
    });

    const nonDuplicatePaths: NewPath[] = [];

    for (const path of paths) {
      const poolsSeen: string[] = [];
      let hasDuplicate = false;
      for (const pool of path.pools) {
        if (poolsSeen.includes(pool.id)) {
          hasDuplicate = true;
        } else {
          poolsSeen.push(pool.id);
        }
      }
      if (!hasDuplicate) {
        nonDuplicatePaths.push(path);
      }
    }

    const [pathsWithLimits] = calculatePathLimits(nonDuplicatePaths, swapType);
    return pathsWithLimits;
  }
}
