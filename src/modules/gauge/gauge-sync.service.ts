import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { GaugeService } from '../common/gauges/gauge.service';
import { ProtocolService } from '../protocol/protocol.service';

@Injectable()
export class GaugeSyncService {
  constructor(
    private readonly gaugeService: GaugeService,
    private readonly prisma: PrismaService,
    private readonly protocolService: ProtocolService,
  ) {}

  async syncGaugeBribes() {}

  async syncGaugeVotes() {
    //
  }

  async syncGaugeData(): Promise<void> {
    const protoData = await this.protocolService.getProtocolConfigDataForChain();
    const poolIds = protoData.gauges.map((g) => g.poolId);
    const gaugeAddress = protoData.gauges.map((g) => g.address);

    const pools = await this.prisma.prismaPool.findMany({
      where: {
        id: { in: poolIds },
      },
      include: {
        staking: { include: { gauge: { include: { rewards: true } } } },
      },
    });

    // get rewards and on chain data for each proto gauge instance (could also delete any not found in proto list for whatever reason)
    const [gaugeChainData, rewardTokens] = await Promise.all([
      this.gaugeService.getGaugeAdditionalInfo(
        protoData.gauges.map((g) => {
          return {
            id: g.address,
          };
        }),
      ),
      this.gaugeService.getGaugesRewardData(gaugeAddress),
    ]);

    const operations: any[] = [];

    pools.forEach((pool) => {
      const gaugeInfo = protoData.gauges.find((g) => g.poolId === pool.id);
      const gaugeAddress = gaugeInfo.address;
      const onchain = gaugeChainData[gaugeAddress];

      const rewardData = rewardTokens.find((r) => r[0] === gaugeAddress);
      let rewards = [];
      if (rewardData) {
        rewards = rewardData[1].tokens.map((token) => {
          return {
            id: `${gaugeAddress}-${token.tokenAddress}`,
            rewardPerSecond: token.rewardPerSecond,
            tokenAddress: token.tokenAddress,
          };
        });
      }

      operations.push(
        this.prisma.prismaPoolStaking.create({
          include: {
            gauge: {
              include: {
                rewards: true,
              },
            },
          },
          data: {
            id: gaugeAddress,
            poolId: pool.id,
            type: 'GAUGE',
            address: gaugeAddress,
            gauge: {
              create: {
                id: gaugeAddress,
                gaugeAddress,
                rewards: {
                  create: rewards,
                },
                symbol: onchain.symbol,
                totalSupply: onchain.totalLiquidity,
                isKilled: onchain.isKilled,
                depositFee: onchain.depositFee,
                withdrawFee: onchain.withdrawFee,
              },
            },
          },
        }),
      );
    });

    await prismaBulkExecuteOperations(operations);
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
