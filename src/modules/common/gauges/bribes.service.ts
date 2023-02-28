import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { GaugeBribe } from 'src/graphql';
import { Multicaller } from '../../common/web3/multicaller';
import { AccountWeb3 } from '../../common/types';
import { RPC } from '../../common/web3/rpc.provider';
import * as managerABI from '../../abis/BribeManager.json';
import { Fragment, JsonFragment } from '@ethersproject/abi/lib/fragments';
import { getGaugeController } from '../../common/web3/contract';
import { networkConfig } from '../../config/network-config';
import { PrismaToken, PrismaTokenCurrentPrice } from '@prisma/client';
import { formatEther } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { ethNum } from '../../utils/old-big-number';
import * as moment from 'moment-timezone';
import { getPreviousEpoch } from 'src/modules/utils/epoch.utils';

@Injectable()
export class GaugeBribeService {
  constructor(
    @Inject(RPC) private readonly aprServices: AccountWeb3,
    private readonly prisma: PrismaService,
  ) {}

  async getGaugeBribes(epoch?: number): Promise<GaugeBribe[]> {
    const [gauges, tokens] = await Promise.all([
      this.prisma.prismaPoolStakingGauge.findMany({
        where: {
          isKilled: false,
        },
      }),
      this.prisma.prismaToken.findMany({
        include: {
          currentPrice: true,
        },
      }),
    ]);

    // For UI this should show if they vote right now, what they will earn.
    // So epoch timestamp needs to be for the start of, current, week
    let epochStartTime: number;
    if (!epoch) {
      epochStartTime = moment(getPreviousEpoch()).unix();
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

    const bribeResults = await multicall.execute<
      Record<
        string,
        {
          amount: BigNumber;
          epochStartTime: BigNumber;
          briber: string;
          token: string;
          gauge: string;
        }[]
      >
    >('GaugeBribeService:getGaugeBribes');

    let bribesUI = [];
    gauges.forEach((gauge) => {
      const bribes = bribeResults[gauge.gaugeAddress];
      if (bribes.length) {
        bribesUI = bribesUI.concat(this.matchBribesData(tokens, bribes));
      }
    });

    // console.log(bribesUI);

    return bribesUI;
  }

  private matchBribesData(
    tokens: Array<PrismaToken & { currentPrice: PrismaTokenCurrentPrice }>,
    bribes: {
      amount: BigNumber;
      epochStartTime: BigNumber;
      briber: string;
      token: string;
      gauge: string;
    }[],
  ) {
    return bribes.map((bribe) => {
      const token = tokens.find((t) => t.address === bribe.token.toLowerCase());
      const amount = ethNum(bribe.amount);
      const epochStartTime = bribe.epochStartTime.toNumber();
      const format = 'M/DD';
      const epochWeekLabel = `${moment.unix(epochStartTime).utc().format(format)}-${moment
        .unix(epochStartTime)
        .utc()
        .add(6, 'days')
        .format(format)}`;
      return {
        ...bribe,
        token,
        amount: formatEther(bribe.amount),
        epochStartTime,
        valueUSD: amount * token.currentPrice.price,
        epochWeekLabel,
      };
    });
  }
}
