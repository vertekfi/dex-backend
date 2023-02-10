import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { GaugeService } from '../common/gauges/gauge.service';
import { ProtocolService } from '../protocol/protocol.service';

@Injectable()
export class GaugeSyncService {
  constructor(
    private gaugeService: GaugeService,
    private readonly prisma: PrismaService,
    private readonly protocolService: ProtocolService,
  ) {}

  async syncGaugeData(): Promise<void> {
    const protoData = await this.protocolService.getProtocolConfigDataForChain();
    const pools = await this.prisma.prismaPool.findMany({
      where: {
        id: { in: protoData.gauges.map((g) => g.poolId) },
      },
      include: {
        staking: { include: { gauge: { include: { rewards: true } } } },
      },
    });

    // get rewards and on chain data for each proto gauge instance (could also delete any not found in proto list for whatever reason)
    const [gaugeChainData] = await Promise.all([
      this.gaugeService.getGaugeAdditionalInfo(
        protoData.gauges.map((g) => {
          return {
            id: g.address,
          };
        }),
      ),
    ]);

    // Holding off on these for now
    // const rewardTokens = await this.gaugeService.getGaugesRewardData(gaugeInfos)

    const operations: any[] = [];
    pools.forEach((pool, i) => {
      const gaugeInfo = protoData.gauges.find((g) => g.poolId === pool.id);
      const gaugeAddress = gaugeInfo.address;
      const onchain = gaugeChainData[gaugeAddress];

      operations.push(
        this.prisma.prismaPoolStaking.create({
          data: {
            id: gaugeAddress,
            poolId: pool.id,
            type: 'GAUGE',
            address: gaugeAddress,
            gauge: {
              create: {
                id: gaugeAddress,
                gaugeAddress,
                //  rewards: rewardTokens,
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
