import * as fetch from 'isomorphic-fetch';
import { SubgraphPoolBase } from '../types';
import { getOnChainBalances } from './onchainData';
import { AccountWeb3 } from 'src/modules/common/types';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { Query } from './constants/queries';
import { PoolDataService } from '../impl/types';

export class SubgraphPoolDataService implements PoolDataService {
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

      const subgraphPools: SubgraphPoolBase[] = pools.map((pool): SubgraphPoolBase => {
        const poolType = pool.poolType;
        return {
          id: pool.id,
          address: pool.address,
          poolType: pool.poolType,
          swapFee: pool.swapFee,
          swapEnabled: pool.swapEnabled,
          totalShares: pool.totalShares,
          amp: poolType === 'Stable' ? pool.amp : null,
          tokens: pool.tokens.map((t) => {
            return {
              decimals: t.decimals,
              address: t.address,
              balance: t.balance,
              weight: poolType === 'Weighted' ? t.weight : null,
              priceRate: t.priceRate,
            };
          }),
          tokensList: pool.tokens.map((t) => t.address),
          totalWeight: pool.totalWeight,
        };
      });

      // Uses WeightedV2 ABI
      return getOnChainBalances(
        subgraphPools ?? [],
        CONTRACT_MAP.VAULT[this.rpc.chainId],
        this.rpc,
      );
    } catch (error) {
      console.log('Error getting subgraph pools');
      return [];
    }
  }
}
