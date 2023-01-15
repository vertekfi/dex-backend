import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';

import { BalancerSubgraphService } from '../subgraphs/balancer/balancer-subgraph.service';
import { LatestsSyncedBlocks, ProtocolConfigData, ProtocolMetrics } from './types';
import { PrismaService } from 'nestjs-prisma';
import { PrismaLastBlockSyncedCategory, PrismaUserBalanceType } from '@prisma/client';
import axios from 'axios';
import { RPC } from '../common/web3/rpc.provider';
import { AccountWeb3 } from '../common/types';
import { FIVE_MINUTES_SECONDS, THIRTY_MINUTES_SECONDS } from '../utils/time';
import { CacheDecorator } from '../common/decorators/cache.decorator';

export const PROTOCOL_METRICS_CACHE_KEY = 'protocol:metrics';
export const PROTOCOL_CONFIG_CACHE_KEY = 'protocol:config';
export const PROTOCOL_TOKENLIST_CACHE_KEY = 'protocol:tokenlist';

const MAIN_POOL_IDS = {
  5: '0x3e9f7b85e8ee2107aeca28677b6b416fa60b6200000200000000000000000002',
  56: '',
};

@Injectable()
export class ProtocolService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly balancerSubgraphService: BalancerSubgraphService,
    private readonly prisma: PrismaService,
  ) {}

  getMainPoolId(): string {
    return MAIN_POOL_IDS[this.rpc.chainId];
  }

  @CacheDecorator(PROTOCOL_CONFIG_CACHE_KEY, FIVE_MINUTES_SECONDS)
  async getProtocolConfigDataForChain(): Promise<ProtocolConfigData> {
    const url = 'https://raw.githubusercontent.com/vertekfi/pool-data-config/main/pool-data.json';
    const { data } = await axios.get(url);

    return data[String(this.rpc.chainId)];
  }

  @CacheDecorator(PROTOCOL_TOKENLIST_CACHE_KEY, FIVE_MINUTES_SECONDS)
  async getProtocolTokenList() {
    const url = 'https://raw.githubusercontent.com/vertekfi/token-list/main/tokenlist.json';
    const { data } = await axios.get(url);

    return data[
      'https://raw.githubusercontent.com/0xBriz/token-list/main/tokenlist.json'
    ].tokens.filter((tk) => tk.chainId === this.rpc.chainId);
  }

  async getProtocolTokenListAllChains() {
    const url = 'https://raw.githubusercontent.com/vertekfi/token-list/main/tokenlist.json';
    const { data } = await axios.get(url);
    console.log(data);
    return data['https://raw.githubusercontent.com/0xBriz/token-list/main/tokenlist.json'].tokens;
  }

  @CacheDecorator(PROTOCOL_METRICS_CACHE_KEY, THIRTY_MINUTES_SECONDS)
  async getMetrics(): Promise<ProtocolMetrics> {
    const { totalSwapFee, totalSwapVolume, poolCount } =
      await this.balancerSubgraphService.getProtocolData({});

    const oneDayAgo = moment().subtract(24, 'hours').unix();
    const pools = await this.prisma.prismaPool.findMany({
      where: {
        categories: { none: { category: 'BLACK_LISTED' } },
        type: { notIn: ['LINEAR'] },
        dynamicData: {
          totalSharesNum: {
            gt: 0.000000000001,
          },
        },
      },
      include: { dynamicData: true },
    });
    const swaps = await this.prisma.prismaPoolSwap.findMany({
      where: { timestamp: { gte: oneDayAgo } },
    });
    const filteredSwaps = swaps.filter((swap) => pools.find((pool) => pool.id === swap.poolId));

    const totalLiquidity = _.sumBy(pools, (pool) =>
      !pool.dynamicData ? 0 : pool.dynamicData.totalLiquidity,
    );

    const swapVolume24h = _.sumBy(filteredSwaps, (swap) => swap.valueUSD);
    const swapFee24h = _.sumBy(filteredSwaps, (swap) => {
      const pool = pools.find((pool) => pool.id === swap.poolId);

      return parseFloat(pool?.dynamicData?.swapFee || '0') * swap.valueUSD;
    });

    const protocolData: ProtocolMetrics = {
      totalLiquidity: `${totalLiquidity}`,
      totalSwapFee,
      totalSwapVolume,
      poolCount: `${poolCount}`,
      swapVolume24h: `${swapVolume24h}`,
      swapFee24h: `${swapFee24h}`,
    };

    return protocolData;
  }

  async getLatestSyncedBlocks(): Promise<LatestsSyncedBlocks> {
    const userStakeSyncBlock = await this.prisma.prismaUserBalanceSyncStatus.findUnique({
      where: { type: PrismaUserBalanceType.STAKED },
    });

    const userWalletSyncBlock = await this.prisma.prismaUserBalanceSyncStatus.findUnique({
      where: { type: PrismaUserBalanceType.WALLET },
    });

    const poolSyncBlock = await this.prisma.prismaLastBlockSynced.findUnique({
      where: { category: PrismaLastBlockSyncedCategory.POOLS },
    });

    return {
      userWalletSyncBlock: `${userWalletSyncBlock?.blockNumber}`,
      userStakeSyncBlock: `${userStakeSyncBlock?.blockNumber}`,
      poolSyncBlock: `${poolSyncBlock?.blockNumber}`,
    };
  }
}
