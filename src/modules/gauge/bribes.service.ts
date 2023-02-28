import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { GaugeBribe } from 'src/graphql';
import { Multicaller } from '../common/web3/multicaller';
import { AccountWeb3 } from '../common/types';
import { RPC } from '../common/web3/rpc.provider';
import * as managerABI from '../abis/BribeManager.json';
import { Fragment, JsonFragment } from '@ethersproject/abi/lib/fragments';
import { getGaugeController } from '../common/web3/contract';
import { networkConfig } from '../config/network-config';

@Injectable()
export class GaugeBribeService {
  constructor(
    @Inject(RPC) private readonly aprServices: AccountWeb3,
    private readonly prisma: PrismaService,
  ) {}

  async getGaugeBribes(epoch: number): Promise<GaugeBribe[]> {
    const gauges = await this.prisma.prismaPoolStakingGauge.findMany({
      where: {
        isKilled: false,
      },
    });

    // type GaugeBribe {
    //   token: GqlToken!
    //   briber: String!
    //   amount: String!
    //   epochStartTime: Int!
    //   gauge: String!
    // }

    let epochStartTime: number;

    if (!epoch) {
      const controller = await getGaugeController();
      epochStartTime = (await controller.time_total()).toNumber();
    }

    const abi: string | Array<Fragment | JsonFragment | string> = Object.values(
      Object.fromEntries([...managerABI].map((row) => [row.name, row])),
    );

    const multicall = new Multicaller(this.aprServices, abi);

    gauges.forEach((gauge) =>
      multicall.call(`${gauge.gaugeAddress}`, networkConfig.vertek.bribeManager, 'getGaugeBribes', [
        gauge.gaugeAddress,
        epochStartTime,
      ]),
    );

    const bribes = await multicall.execute('GaugeBribeService:getGaugeBribes');
    console.log(bribes);

    return [];
  }

  private async getGaugeOnChainBribes(gauges: string[], epoch: number): Promise<GaugeBribe[]> {
    // getGaugeBribes
    // get gauge addresses
    // an epoch
    //

    // const timestamp = moment().utc()

    return [];
  }
}
