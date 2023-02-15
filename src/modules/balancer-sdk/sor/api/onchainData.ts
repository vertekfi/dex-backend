import { formatFixed } from '@ethersproject/bignumber';

// TODO: decide whether we want to trim these ABIs down to the relevant functions
import * as VaultAbi from '../../../abis/Vault.json';
import * as aTokenRateProvider from '../../../abis/StaticATokenRateProvider.json';
import * as WeightedPoolAbi from '../../../abis/WeightedPool.json';
import * as StablePoolAbi from '../../../abis/StablePool.json';
import * as MetaStablePoolAbi from '../../../abis/MetaStablePool.json';
// import ElementPoolAbi from '../../abis/ConvergentCurvePool.json';
import * as LinearPoolAbi from '../../../abis/LinearPool.json';
// import StablePhantomPoolAbi from '../../abis/StablePhantomPool.json';
// import ComposableStablePoolAbi from '../../abis/ComposableStablePool.json';
// import WeightedPoolV2Abi from '../abi/WeightedPoolV2.json';
import * as LiquidityBootstrappingPoolAbi from '../../../abis/LiquidityBootstrappingPool.json';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { Fragment, JsonFragment } from '@ethersproject/abi/lib/fragments';
import { PoolFilter, SubgraphPoolBase } from '../types';
import { isSameAddress } from '@balancer-labs/sdk';
import { AccountWeb3 } from 'src/modules/common/types';

export async function getOnChainBalances(
  subgraphPoolsOriginal: SubgraphPoolBase[],
  vaultAddress: string,
  rpc: AccountWeb3,
): Promise<SubgraphPoolBase[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  const abis: string | Array<Fragment | JsonFragment | string> = Object.values(
    // Remove duplicate entries using their names
    Object.fromEntries(
      [
        ...VaultAbi,
        ...aTokenRateProvider,
        ...WeightedPoolAbi,
        ...StablePoolAbi,
        // ...ElementPoolAbi,
        ...LinearPoolAbi,
        ...MetaStablePoolAbi,
        ...LiquidityBootstrappingPoolAbi,
      ].map((row) => [row.name, row]),
    ),
  );

  const multiPool = new Multicaller(rpc, abis);

  const supportedPoolTypes: string[] = Object.values(PoolFilter);
  const subgraphPools: SubgraphPoolBase[] = [];
  subgraphPoolsOriginal.forEach((pool) => {
    if (!supportedPoolTypes.includes(pool.poolType)) {
      console.error(`Unknown pool type: ${pool.poolType} ${pool.id}`);
      return;
    }

    subgraphPools.push(pool);

    multiPool.call(`${pool.id}.poolTokens`, vaultAddress, 'getPoolTokens', [pool.id]);
    multiPool.call(`${pool.id}.totalSupply`, pool.address, 'totalSupply');

    // TO DO - Make this part of class to make more flexible?
    if (
      pool.poolType === 'Weighted' ||
      pool.poolType === 'LiquidityBootstrapping' ||
      pool.poolType === 'Investment'
    ) {
      // multiPool.call(`${pool.id}.weights`, pool.address, 'getNormalizedWeights');
      multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
    } else if (
      pool.poolType === 'Stable' ||
      pool.poolType === 'MetaStable' ||
      pool.poolType === 'StablePhantom' ||
      pool.poolType === 'ComposableStable'
    ) {
      // MetaStable & StablePhantom is the same as Stable for multicall purposes
      multiPool.call(`${pool.id}.amp`, pool.address, 'getAmplificationParameter');
      multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
    } else if (pool.poolType === 'Element') {
      multiPool.call(`${pool.id}.swapFee`, pool.address, 'percentFee');
    } else if (pool.poolType.toString().includes('Linear')) {
      multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');

      multiPool.call(`${pool.id}.targets`, pool.address, 'getTargets');
      multiPool.call(`${pool.id}.rate`, pool.address, 'getWrappedTokenRate');
    } else if (pool.poolType.toString().includes('Gyro')) {
      multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
    }
  });

  let pools = {} as Record<
    string,
    {
      amp?: string[];
      swapFee: string;
      weights?: string[];
      targets?: string[];
      poolTokens: {
        tokens: string[];
        balances: string[];
      };
      rate?: string;
    }
  >;

  try {
    pools = (await multiPool.execute('getOnChainBalances')) as Record<
      string,
      {
        amp?: string[];
        swapFee: string;
        weights?: string[];
        poolTokens: {
          tokens: string[];
          balances: string[];
        };
        rate?: string;
      }
    >;
  } catch (err) {
    throw `Issue with multicall execution.`;
  }

  const onChainPools: SubgraphPoolBase[] = [];

  Object.entries(pools).forEach(([poolId, onchainData], index) => {
    try {
      const { poolTokens, swapFee, weights } = onchainData;

      if (
        subgraphPools[index].poolType === 'Stable' ||
        subgraphPools[index].poolType === 'MetaStable' ||
        subgraphPools[index].poolType === 'StablePhantom' ||
        subgraphPools[index].poolType === 'ComposableStable'
      ) {
        if (!onchainData.amp) {
          console.error(`Stable Pool Missing Amp: ${poolId}`);
          return;
        } else {
          // Need to scale amp by precision to match expected Subgraph scale
          // amp is stored with 3 decimals of precision
          subgraphPools[index].amp = formatFixed(onchainData.amp[0], 3);
        }
      }

      if (subgraphPools[index].poolType.includes('Linear')) {
        if (!onchainData.targets) {
          console.error(`Linear Pool Missing Targets: ${poolId}`);
          return;
        } else {
          subgraphPools[index].lowerTarget = formatFixed(onchainData.targets[0], 18);
          subgraphPools[index].upperTarget = formatFixed(onchainData.targets[1], 18);
        }

        const wrappedIndex = subgraphPools[index].wrappedIndex;
        if (wrappedIndex === undefined || onchainData.rate === undefined) {
          console.error(`Linear Pool Missing WrappedIndex or PriceRate: ${poolId}`);
          return;
        }
        // Update priceRate of wrappedToken
        subgraphPools[index].tokens[wrappedIndex].priceRate = formatFixed(onchainData.rate, 18);
      }

      subgraphPools[index].swapFee = formatFixed(swapFee, 18);

      poolTokens.tokens.forEach((token, i) => {
        const T = subgraphPools[index].tokens.find((t) => isSameAddress(t.address, token));
        if (!T) throw `Pool Missing Expected Token: ${poolId} ${token}`;
        T.balance = formatFixed(poolTokens.balances[i], T.decimals);
        if (weights) {
          // Only expected for WeightedPools
          T.weight = formatFixed(weights[i], 18);
        }
      });
      onChainPools.push(subgraphPools[index]);
    } catch (err) {
      throw `Issue with pool onchain data: ${err}`;
    }
  });

  return onChainPools;
}

/*
PoolDataService to fetch onchain balances of Gyro3 pool.
(Fetching all pools off a fork is too intensive)
*/
// export class OnChainPoolDataService implements PoolDataService {
//   constructor(
//     private readonly config: {
//       multiAddress: string;
//       vaultAddress: string;
//       provider: JsonRpcProvider;
//       pools: SubgraphPoolBase[];
//     },
//   ) {}

//   public async getPools(): Promise<SubgraphPoolBase[]> {
//     return getOnChainBalances(
//       this.config.pools,
//       this.config.multiAddress,
//       this.config.vaultAddress,
//       this.config.provider,
//     );
//   }
// }
