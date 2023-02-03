import * as fetch from 'isomorphic-fetch';
import { SubgraphPoolBase } from '../types';
import { formatFixed } from '@ethersproject/bignumber';
import { AccountWeb3 } from 'src/modules/common/types';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { Query } from '../api/constants/queries';
import { PoolDataService } from '../impl/types';

import * as VaultAbi from '../../../abis/Vault.json';
import * as StablePoolAbi from '../../../abis/StablePool.json';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { Fragment, JsonFragment } from '@ethersproject/abi/lib/fragments';
import { isSameAddress } from '@balancer-labs/sdk';
import { MulticallPoolV1Result } from './types';

const STABLE_POOL_ID = '0xb3a07a9cef918b2ccec4bc85c6f2a7975c5e83f9000000000000000000000001';

export class SubgraphPoolV1DataService implements PoolDataService {
  constructor(private readonly rpc: AccountWeb3, private readonly subgraphURL: string) {}

  async getPools(): Promise<SubgraphPoolBase[]> {
    try {
      const response = await fetch(this.subgraphURL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: Query[this.rpc.chainId] }),
      });

      const { data } = await response.json();
      const pools: SubgraphPoolBase[] = data.pools;

      const stablePool = pools.find((p) => p.id === STABLE_POOL_ID);
      const subgraphPools: SubgraphPoolBase[] = [
        {
          id: stablePool.id,
          address: stablePool.address,
          poolType: stablePool.poolType,
          swapFee: stablePool.swapFee,
          swapEnabled: stablePool.swapEnabled,
          totalShares: stablePool.totalShares,
          amp: stablePool.amp,
          tokens: stablePool.tokens.map((t) => {
            return {
              decimals: t.decimals,
              address: t.address,
              balance: t.balance,
              weight: null,
              priceRate: t.priceRate,
            };
          }),
          tokensList: stablePool.tokens.map((t) => t.address),
        },
      ];

      // Provide the stable pool on chain data
      return this.getOnChainBalancesV1(
        subgraphPools ?? [],
        CONTRACT_MAP.VAULT[this.rpc.chainId],
        this.rpc,
      );
    } catch (error) {
      console.log('Error getting subgraph pools');
      return [];
    }
  }

  async getOnChainBalancesV1(
    subgraphPoolsOriginal: SubgraphPoolBase[],
    vaultAddress: string,
    rpc: AccountWeb3,
  ): Promise<SubgraphPoolBase[]> {
    if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

    const abis: string | Array<Fragment | JsonFragment | string> = Object.values(
      // Remove duplicate entries using their names
      Object.fromEntries([...VaultAbi, ...StablePoolAbi].map((row) => [row.name, row])),
    );

    const multiPool = new Multicaller(rpc, abis);

    const subgraphPools: SubgraphPoolBase[] = [];
    subgraphPoolsOriginal.forEach((pool) => {
      if (pool.id !== STABLE_POOL_ID) {
        console.log(`getOnChainBalancesV1: Pool not applicable. Returning.`);
        return;
      } else {
        console.log(`getOnChainBalancesV1: Getting onchain for V1 StablePool..`);
      }

      subgraphPools.push(pool);

      multiPool.call(`${pool.id}.poolTokens`, vaultAddress, 'getPoolTokens', [pool.id]);
      multiPool.call(`${pool.id}.totalSupply`, pool.address, 'totalSupply');
      multiPool.call(`${pool.id}.amp`, pool.address, 'getAmplificationParameter');
      multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
    });

    let pools = {} as Record<string, MulticallPoolV1Result>;

    try {
      pools = (await multiPool.execute()) as Record<string, MulticallPoolV1Result>;
    } catch (err) {
      throw `getOnChainBalancesV1: Issue with multicall execution.`;
    }

    const onChainPools: SubgraphPoolBase[] = [];

    Object.entries(pools).forEach(([poolId, onchainData], index) => {
      try {
        const { poolTokens, swapFee } = onchainData;

        if (subgraphPools[index].poolType === 'Stable') {
          if (!onchainData.amp) {
            console.error(`Stable Pool Missing Amp: ${poolId}`);
            return;
          } else {
            // Need to scale amp by precision to match expected Subgraph scale
            // amp is stored with 3 decimals of precision
            subgraphPools[index].amp = formatFixed(onchainData.amp[0], 3);
          }
        }

        subgraphPools[index].swapFee = formatFixed(swapFee, 18);

        poolTokens.tokens.forEach((token, i) => {
          const T = subgraphPools[index].tokens.find((t) => isSameAddress(t.address, token));

          if (!T) throw `getOnChainBalancesV1: Pool Missing Expected Token: ${poolId} ${token}`;

          T.balance = formatFixed(poolTokens.balances[i], T.decimals);
        });

        onChainPools.push(subgraphPools[index]);
      } catch (err) {
        throw `getOnChainBalancesV1: Issue with pool onchain data: ${err}`;
      }
    });

    return onChainPools;
  }
}
