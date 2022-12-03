import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { ZERO_ADDRESS } from 'src/modules/common/web3/utils';
import { BalancerSubgraphService } from 'src/modules/subgraphs/balancer/balancer-subgraph.service';
import { BalancerUserPoolShare } from 'src/modules/subgraphs/balancer/balancer-types';

@Injectable()
export class UserSyncWalletBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balancerSubgraphService: BalancerSubgraphService,
  ) {}

  async initBalancesForPool(poolId: string) {
    const { block } = await this.balancerSubgraphService.getMetadata();
    const shares = await this.balancerSubgraphService.getAllPoolShares({
      where: { poolId, userAddress_not: ZERO_ADDRESS, balance_not: '0' },
    });

    await prismaBulkExecuteOperations(
      [
        this.prisma.prismaUser.createMany({
          data: shares.map((share) => ({ address: share.userAddress })),
          skipDuplicates: true,
        }),
        ...shares.map((share) => this.getPrismaUpsertForPoolShare(poolId, share)),
        this.prisma.prismaUserBalanceSyncStatus.upsert({
          where: { type: 'WALLET' },
          create: { type: 'WALLET', blockNumber: block.number },
          update: { blockNumber: block.number },
        }),
      ],
      true,
    );
  }

  private getPrismaUpsertForPoolShare(poolId: string, share: BalancerUserPoolShare) {
    return this.prisma.prismaUserWalletBalance.upsert({
      where: { id: `${poolId}-${share.userAddress}` },
      create: {
        id: `${poolId}-${share.userAddress}`,
        userAddress: share.userAddress,
        poolId,
        tokenAddress: share.poolAddress.toLowerCase(),
        balance: share.balance,
        balanceNum: parseFloat(share.balance),
      },
      update: { balance: share.balance, balanceNum: parseFloat(share.balance) },
    });
  }
}
