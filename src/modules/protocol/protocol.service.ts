import { Inject, Injectable } from '@nestjs/common';

import { LatestsSyncedBlocks, ProtocolConfigData } from './types';
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
    @Inject(RPC) private readonly rpc: AccountWeb3,

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
