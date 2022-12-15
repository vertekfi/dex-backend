import fetch from 'isomorphic-fetch';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { PoolDataService, SubgraphPoolBase } from '../types';
import axios from 'axios';
import { PoolOnChainDataService } from 'src/modules/common/pool/pool-on-chain-data.service';
import { getOnChainBalances } from './onchainData';
import { Inject, Injectable } from '@nestjs/common';
import { BalancerSubgraphService } from 'src/modules/subgraphs/balancer/balancer-subgraph.service';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { AccountWeb3 } from 'src/modules/common/types';
import { CONTRACT_MAP } from 'src/modules/data/contracts';

const queryWithLinear = `
      {
        pool0: pools(
          first: 1000,
          where: { swapEnabled: true, totalShares_gt: "0.000000000001" },
          orderBy: totalLiquidity,
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
          sqrtAlpha
          sqrtBeta
          root3Alpha
          alpha
          beta
          c
          s
          lambda
          tauAlphaX
          tauAlphaY
          tauBetaX
          tauBetaY
          u
          v
          w
          z
          dSq
        }
        pool1000: pools(
          first: 1000,
          skip: 1000,
          where: { swapEnabled: true, totalShares_gt: "0.000000000001" },
          orderBy: totalLiquidity,
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
          sqrtAlpha
          sqrtBeta
          root3Alpha
          alpha
          beta
          c
          s
          lambda
          tauAlphaX
          tauAlphaY
          tauBetaX
          tauBetaY
          u
          v
          w
          z
          dSq
        }
      }
    `;

export const Query: { [chainId: number]: string } = {
  5: queryWithLinear,
  56: queryWithLinear,
};

@Injectable()
export class SubgraphPoolDataService implements PoolDataService {
  // constructor(
  //   private readonly config: {
  //     chainId: number;
  //     multiAddress: string;
  //     vaultAddress: string;
  //     subgraphUrl: string;
  //     provider: Provider;
  //     onchain: boolean;
  //   },
  // ) {}

  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly onchainData: PoolOnChainDataService,
    private readonly balancerSubgraphService: BalancerSubgraphService,
  ) {}

  async getPools(): Promise<SubgraphPoolBase[]> {
    const blockNumber = await this.rpc.provider.getBlockNumber();
    const pools = await this.balancerSubgraphService.getAllPools({
      block: { number: blockNumber },
    });

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
            id: t.id,
            symbol: t.symbol,
            name: t.name,
            decimals: t.decimals,
            address: t.address,
            balance: t.balance,
            invested: t.invested,
            weight: poolType === 'Weighted' ? t.weight : null,
            priceRate: t.priceRate,
          };
        }),
        tokensList: pool.tokens.map((t) => t.address),
      };
    });

    const poolsWithChainData = await this.onchainData.updateOnChainData(
      subgraphPools.map((p) => p.id),
      blockNumber,
    );

    // if (config.onchain) {
    return getOnChainBalances(
      poolsWithChainData ?? [],
      CONTRACT_MAP.MULTICALL[this.rpc.chainId],
      CONTRACT_MAP.VAULT[this.rpc.chainId],
      this.rpc.provider,
    );
    //}

    // return subgraphPools ?? [];
  }
}
