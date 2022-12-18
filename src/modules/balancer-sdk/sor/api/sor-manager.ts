import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Pool } from 'src/modules/subgraphs/balancer/balancer-subgraph-types';
import { SubgraphPoolBase } from '../impl/types';
import { SOR } from '../impl/wrapper';

interface FetchStatus {
  v2finishedFetch: boolean;
  v2success: boolean;
}

export class SorManager {
  private sorV2: SOR;
  private weth: string;
  private fetchStatus: FetchStatus = {
    v2finishedFetch: false,
    v2success: false,
  };
  private isFetching: boolean;
  maxPools: number;
  gasPrice: BigNumber;
  selectedPools: (SubgraphPoolBase | Pool)[] = [];

  constructor(
    provider: JsonRpcProvider,
    gasPrice: BigNumber,
    maxPools: number,
    chainId: number,
    weth: string,
  ) {}
}
