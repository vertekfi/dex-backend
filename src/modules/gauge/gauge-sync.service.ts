import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { Multicaller } from '../common/web3/multicaller';
import { logging } from '../utils/logger';
import * as LGV5Abi from '../abis/LiquidityGaugeV5.json';
import { GaugeService } from './gauge.service';
import { AccountWeb3 } from '../common/types';
import { RPC } from '../common/web3/rpc.provider';
import { ProtocolService } from '../protocol/protocol.service';

@Injectable()
export class GaugeSyncService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private gaugeService: GaugeService,
    private readonly prisma: PrismaService,
    private readonly protocolService: ProtocolService,
  ) {}

  async syncGaugeData(): Promise<void> {
    const protoData = await this.protocolService.getProtocolConfigDataForChain();
    const operations: any[] = [];

    const poolIds = protoData.gauges.map((g) => g.poolId);

    const pools = await this.prisma.prismaPool.findMany({
      where: {
        id: { in: poolIds },
      },
      include: {
        staking: { include: { gauge: { include: { rewards: true } } } },
      },
    });

    // get rewards amd additional info for each proto gauge instance (could also delete any not found in proto list for whatever reason)
    const gaugeInfos = pools.filter((p) => p.staking).map((p) => p.staking.gauge);

    const [gaugeChainData, rewardTokens] = await Promise.all([
      this.gaugeService.getGaugeAdditionalInfo(gaugeInfos),
      this.gaugeService.getGaugesRewardData(gaugeInfos),
    ]);

    console.log(gaugeChainData);
    console.log(rewardTokens);

    pools.forEach((pool, i) => {
      if (!pool.staking) {
        const gaugeAddress = protoData.gauges[i].address;
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
                },
              },
            },
          }),
        );
      }
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
