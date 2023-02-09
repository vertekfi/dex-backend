import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolWithExpandedNesting } from 'prisma/prisma-types';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { PoolAprService } from '../../pool-types';

export class SwapFeeAprService implements PoolAprService {
  readonly name = 'SwapFeeAprService';

  constructor(
    private readonly prisma: PrismaService,
    private readonly swapProtocolFeePercentage: number,
  ) {}

  async updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void> {
    const operations: any[] = [];

    for (const pool of pools) {
      if (pool.dynamicData) {
        const apr =
          pool.dynamicData.totalLiquidity > 0
            ? (pool.dynamicData.fees24h * 365) / pool.dynamicData.totalLiquidity
            : 0;

        const userApr = apr * (1 - this.swapProtocolFeePercentage);

        operations.push(
          this.prisma.prismaPoolAprItem.upsert({
            where: { id: `${pool.id}-swap-apr` },
            create: {
              id: `${pool.id}-swap-apr`,
              poolId: pool.id,
              title: 'Swap fees APR',
              apr: userApr,
              type: 'SWAP_FEE',
            },
            update: { apr: userApr },
          }),
        );
      }
    }

    await prismaBulkExecuteOperations(operations);
  }
}
