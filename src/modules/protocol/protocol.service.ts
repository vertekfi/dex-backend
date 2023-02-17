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
import { networkConfig } from '../config/network-config';

export const PROTOCOL_METRICS_CACHE_KEY = 'protocol:metrics';
export const PROTOCOL_CONFIG_CACHE_KEY = 'protocol:config';
export const PROTOCOL_TOKENLIST_CACHE_KEY = 'protocol:tokenlist';

@Injectable()
export class ProtocolService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly balancerSubgraphService: BalancerSubgraphService,
    private readonly prisma: PrismaService,
  ) {}

  getMainPoolId(): string {
    return networkConfig.balancer.votingEscrow.lockablePoolId;
  }

  async getProtocolConfigDataForChain(): Promise<ProtocolConfigData> {
    const url = networkConfig.protocol.poolDataUrl;
    const { data } = await axios.get(url);

    return data[String(this.rpc.chainId)];
  }

  async getProtocolTokenList() {
    // const url = this.getTokenListUri();
    const { data } = await axios.get(networkConfig.protocol.tokenListUrl);

    const tokens = data[networkConfig.protocol.tokenListMappingKey].tokens.filter(
      (tk) => tk.chainId === this.rpc.chainId,
    );

    return tokens;
  }

  async getProtocolTokenListAllChains() {
    const { data } = await axios.get(networkConfig.protocol.tokenListUrl);

    const tokens = data[networkConfig.protocol.tokenListMappingKey].tokens;
    return tokens;
  }

  async getMetrics(): Promise<ProtocolMetrics> {
    try {
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

      // TODO: Add gauge fees

      const protocolData: ProtocolMetrics = {
        totalLiquidity: `${totalLiquidity}`,
        totalSwapFee,
        totalSwapVolume,
        poolCount: `${poolCount}`,
        swapVolume24h: `${swapVolume24h}`,
        swapFee24h: `${swapFee24h}`,
      };

      return protocolData;
    } catch (error) {
      console.error('getMetrics: failed');
    }
  }

  async getLatestSyncedBlocks(): Promise<LatestsSyncedBlocks> {
    try {
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
    } catch (error) {
      console.error('getLatestSyncedBlocks: failed');
    }
  }
}
