import * as _ from 'lodash';
import { PrismaLastBlockSyncedCategory } from '@prisma/client';
import { BlockService } from 'src/modules/common/web3/block.service';
import { PrismaService } from 'nestjs-prisma';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { Inject, Injectable } from '@nestjs/common';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { PoolCreatorService } from './pool-creator.service';

@Injectable()
export class PoolSyncService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly poolCreatorService: PoolCreatorService,
    private readonly prisma: PrismaService,
    private readonly blockService: BlockService,
    private readonly contractService: ContractService,
  ) {}

  async syncAllPoolsFromSubgraph(): Promise<string[]> {
    return this.poolCreatorService.syncAllPoolsFromSubgraph(
      await this.rpc.provider.getBlockNumber(),
    );
  }

  async syncChangedPools(): Promise<{
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

  async syncPoolTotalShares() {
    const items = await this.prisma.prismaPoolDynamicData.findMany({});
    for (const item of items) {
      await this.prisma.prismaPoolDynamicData.update({
        where: { id: item.id },
        data: { totalSharesNum: parseFloat(item.totalShares) },
      });
    }
  }
}
