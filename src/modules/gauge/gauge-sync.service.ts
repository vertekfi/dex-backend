import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { GaugeService } from './gauge.service';

@Injectable()
export class GaugeSyncService {
  constructor(private gaugeService: GaugeService, private readonly prisma: PrismaService) {}

  async syncGaugeData(): Promise<void> {
    const gauges = await this.gaugeService.getCoreGauges();

    const pools = await this.prisma.prismaPool.findMany({
      include: {
        staking: { include: { gauge: { include: { rewards: true } } } },
      },
    });

    const operations: any[] = [];
    const gaugeStakingEntities: any[] = [];
    const gaugeStakingRewardOperations: any[] = [];

    for (const gauge of gauges) {
      const pool = pools.find((pool) => pool.id === gauge.poolId);
      if (!pool) {
        continue;
      }

      if (!pool.staking) {
        operations.push(
          this.prisma.prismaPoolStaking.create({
            data: {
              id: gauge.address,
              poolId: pool.id,
              type: 'GAUGE',
              address: gauge.address,
            },
          }),
        );
      }

      gaugeStakingEntities.push({
        id: gauge.address,
        stakingId: gauge.address,
        gaugeAddress: gauge.address,
      });

      for (let rewardToken of gauge.rewardTokens) {
        const id = `${gauge.address}-${rewardToken.address}`;

        gaugeStakingRewardOperations.push(
          this.prisma.prismaPoolStakingGaugeReward.upsert({
            create: {
              id,
              gaugeId: gauge.address,
              tokenAddress: rewardToken.address,
              rewardPerSecond: `${rewardToken.rewardsPerSecond}`,
            },
            update: {
              rewardPerSecond: `${rewardToken.rewardsPerSecond}`,
            },
            where: { id },
          }),
        );
      }
    }

    operations.push(
      this.prisma.prismaPoolStakingGauge.createMany({
        data: gaugeStakingEntities,
        skipDuplicates: true,
      }),
    );

    operations.push(...gaugeStakingRewardOperations);

    await prismaBulkExecuteOperations(operations, true, undefined);
  }

  async reloadStakingForAllPools(): Promise<void> {
    await this.prisma.prismaUserStakedBalance.deleteMany({
      where: { staking: { type: 'GAUGE' } },
    });
    await this.prisma.prismaPoolStakingGaugeReward.deleteMany({});
    await this.prisma.prismaPoolStakingGauge.deleteMany({});
    await this.prisma.prismaPoolStaking.deleteMany({});
    await this.syncGaugeData();
  }
}
