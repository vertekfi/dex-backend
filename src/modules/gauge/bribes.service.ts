import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { GaugeBribe } from 'src/graphql';
import * as moment from 'moment';

@Injectable()
export class GaugeBribeService {
  constructor(private readonly prisma: PrismaService) {}

  async getGaugeBribes(epoch: number): Promise<GaugeBribe[]> {
    const gauges = await this.prisma.prismaPoolStakingGauge.findMany({
      where: {
        isKilled: false,
      },
    });

    const bribes = await this.getGaugeOnChainBribes(
      gauges.map((g) => g.gaugeAddress),
      epoch,
    );

    return bribes;
  }

  private async getGaugeOnChainBribes(gauges: string[], epoch: number): Promise<GaugeBribe[]> {
    const fakeMap = {
      // ASHARE-BUSD
      '0xE7A9d3F14A19E6CF1C482aB0e8c7aE40b40a61c0': [],
      // VRTK-BUSD
      '0x8601DFCeE55E9e238f7ED7c42f8E46a7779e3f6f': [],
    };

    // const timestamp = moment().utc()

    return [];
  }
}
