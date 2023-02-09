import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolWithExpandedNesting } from 'prisma/prisma-types';
import { PoolAprService } from '../../pool-types';
import { isComposableStablePool } from '../pool-utils';

export class PhantomStableAprService implements PoolAprService {
  readonly name = 'PhantomStableAprService';

  constructor(
    private readonly prisma: PrismaService,
    private readonly yieldProtocolFeePercentage: number,
  ) {}

  public async updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void> {
    const phantomStablePools = pools.filter((pool) => pool.type === 'PHANTOM_STABLE');

    for (const pool of phantomStablePools) {
      const collectsYieldFee = isComposableStablePool(pool);
      const linearPoolTokens = pool.tokens.filter((token) => token.nestedPool?.type === 'LINEAR');
      const linearPoolIds = linearPoolTokens.map((token) => token.nestedPool?.id || '');
      const aprItems = await this.prisma.prismaPoolAprItem.findMany({
        where: { poolId: { in: linearPoolIds }, type: 'LINEAR_BOOSTED' },
      });

      for (const token of linearPoolTokens) {
        const aprItem = aprItems.find((item) => item.poolId === token.nestedPoolId);

        if (aprItem && token.dynamicData && pool.dynamicData && token.dynamicData.balanceUSD > 0) {
          const itemId = `${pool.id}-${token.token.address}-${token.index}`;
          const apr =
            aprItem.apr * (token.dynamicData.balanceUSD / pool.dynamicData.totalLiquidity);
          const userApr = collectsYieldFee ? apr * (1 - this.yieldProtocolFeePercentage) : apr;

          await this.prisma.prismaPoolAprItem.upsert({
            where: { id: itemId },
            create: {
              id: itemId,
              poolId: pool.id,
              apr: userApr,
              title: aprItem.title,
              group: aprItem.group,
              type: 'PHANTOM_STABLE_BOOSTED',
            },
            update: { apr: userApr, title: aprItem.title, type: 'PHANTOM_STABLE_BOOSTED' },
          });
        }
      }
    }
  }
}
