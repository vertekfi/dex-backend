import * as fetch from 'isomorphic-fetch';
import { PoolDataService, SubgraphPoolBase } from '../types';
import { getOnChainBalances } from './onchainData';
import { AccountWeb3 } from 'src/modules/common/types';
import { gql } from 'graphql-request';
import { PrismaService } from 'nestjs-prisma';
import { convertPoolTypeForSubgraph } from './utils';

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

export class DatabasePoolDataService implements PoolDataService {
  constructor(
    private readonly rpc: AccountWeb3,
    private readonly vault: string,
    private readonly prisma: PrismaService,
  ) {}

  async getPools(): Promise<SubgraphPoolBase[]> {
    try {
      const pools = await this.prisma.prismaPool.findMany({
        where: {
          isV1: false,
          categories: {
            none: { category: 'BLACK_LISTED' },
          },
        },
        include: {
          dynamicData: true,
          stableDynamicData: true,
          tokens: {
            include: {
              dynamicData: true,
              token: true,
            },
          },
        },
      });

      const subgraphPools: SubgraphPoolBase[] = pools.map((pool): SubgraphPoolBase => {
        const poolType = convertPoolTypeForSubgraph(pool.type);
        return {
          id: pool.id,
          address: pool.address,
          poolType,
          swapFee: pool.dynamicData.swapFee,
          swapEnabled: pool.dynamicData.swapEnabled,
          totalShares: pool.dynamicData.totalShares,
          amp: poolType === 'Stable' ? pool.stableDynamicData.amp : null,
          tokens: pool.tokens.map((t) => {
            return {
              decimals: t.token.decimals,
              address: t.address,
              balance: t.dynamicData.balance,
              weight: poolType === 'Weighted' ? t.dynamicData.weight : null,
              priceRate: t.dynamicData.priceRate,
            };
          }),
          tokensList: pool.tokens.map((t) => t.address),
          totalWeight: '1',
        };
      });

      // Pool data in synced with database at fairly frequent intervals
      // But for purposes of trades we will get certain values fresh each time on chain
      // A multicall is used and we have fast RPC's.
      // So this should be sufficient while still fast.
      for (const pool of subgraphPools) {
        console.log(pool.id);
        console.log(`
        `);
        await getOnChainBalances([pool], this.vault, this.rpc);
      }
      // return getOnChainBalances(subgraphPools, this.vault, this.rpc);
      return [];
    } catch (error) {
      console.log('Error getting subgraph pools');
      return [];
    }
  }
}
