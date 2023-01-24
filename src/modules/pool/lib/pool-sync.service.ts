import * as _ from 'lodash';
import { PrismaLastBlockSyncedCategory } from '@prisma/client';
import { BlockService } from 'src/modules/common/web3/block.service';
import { PrismaService } from 'nestjs-prisma';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PoolSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockService: BlockService,
    private readonly contractService: ContractService,
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
    const vault = this.contractService.getVault();
    const events = await vault.queryFilter({ address: vault.address }, startBlock, endBlock);

    const filteredEvents = events.filter((event) =>
      ['PoolBalanceChanged', 'PoolBalanceManaged', 'Swap'].includes(event.event!),
    );
    const poolIds: string[] = _.uniq(filteredEvents.map((event) => event.args!.poolId));

    return poolIds;
  }
}
