import * as fetch from 'isomorphic-fetch';
import { PoolDataService, SubgraphPoolBase } from '../types';
import { getOnChainBalances } from './onchainData';
import { AccountWeb3 } from 'src/modules/common/types';
import { gql } from 'graphql-request';

const queryWithLinear = gql`
  {
    pools(
      where: { swapEnabled: true, totalShares_gt: "0.000000000001" }
      orderBy: totalLiquidity
      orderDirection: desc
    ) {
      id
      address
      poolType
      swapFee
      totalShares
      tokens {
        address
        balance
        decimals
        weight
        priceRate
      }
      tokensList
      totalWeight
      amp
      expiryTime
      unitSeconds
      principalToken
      baseToken
      swapEnabled
      wrappedIndex
      mainIndex
      lowerTarget
      upperTarget
    }
  }
`;

export const Query: { [chainId: number]: string } = {
  5: queryWithLinear,
  56: queryWithLinear,
};

export class SubgraphPoolDataService implements PoolDataService {
  constructor(
    private readonly rpc: AccountWeb3,
    private readonly subgraphUrl: string,
    private readonly vault: string,
  ) {}

  async getPools(): Promise<SubgraphPoolBase[]> {
    // const blockNumber = await this.rpc.provider.getBlockNumber();
    // const pools = await this.balancerSubgraphService.getAllPools({
    //   block: { number: blockNumber },
    // });

    try {
      const response = await fetch(this.subgraphUrl, {
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
          isV1: false,
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

      return getOnChainBalances(subgraphPools ?? [], this.vault, this.rpc);
    } catch (error) {
      console.log('Error getting subgraph pools');
      return [];
    }
  }
}
