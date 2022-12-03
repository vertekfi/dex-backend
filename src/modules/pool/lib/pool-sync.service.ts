import * as _ from 'lodash';
import { PrismaLastBlockSyncedCategory } from '@prisma/client';
import { networkConfig } from '../../config/network-config';
import VaultAbi from '../abi/Vault.json';
import { getContractAt } from 'src/modules/common/web3/contract';
import { BlockService } from 'src/modules/common/web3/block.service';
import { PrismaService } from 'nestjs-prisma';

export class PoolSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockService: BlockService,
  ) {}

  public async syncChangedPools(): Promise<{
    startBlock: number;
    endBlock: number;
    latestBlock: number;
  }> {
    let lastSync = await this.prisma.prismaLastBlockSynced.findUnique({
      where: { category: PrismaLastBlockSyncedCategory.POOLS },
    });
    const lastSyncBlock = lastSync?.blockNumber ?? 0;
    const latestBlock = await this.blockService.getBlockNumber();

    const startBlock = lastSyncBlock + 1;
    const endBlock = latestBlock - startBlock > 2_000 ? startBlock + 2_000 : latestBlock;

    await this.prisma.prismaLastBlockSynced.upsert({
      where: { category: PrismaLastBlockSyncedCategory.POOLS },
      update: {
        blockNumber: latestBlock,
      },
      create: {
        category: PrismaLastBlockSyncedCategory.POOLS,
        blockNumber: latestBlock,
      },
    });

    return {
      startBlock,
      endBlock,
      latestBlock,
    };
  }

  async getChangedPoolIds(startBlock: number, endBlock: number) {
    const contract = getContractAt(networkConfig.balancer.vault, VaultAbi);
    const events = await contract.queryFilter(
      { address: networkConfig.balancer.vault },
      startBlock,
      endBlock,
    );

    const filteredEvents = events.filter((event) =>
      ['PoolBalanceChanged', 'PoolBalanceManaged', 'Swap'].includes(event.event!),
    );
    const poolIds: string[] = _.uniq(filteredEvents.map((event) => event.args!.poolId));

    return poolIds;
  }
}
