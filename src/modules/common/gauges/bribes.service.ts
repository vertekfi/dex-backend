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

  async getGaugeBribes(epoch?: number): Promise<
    {
      gauge: string;
      currentEpochBribes: GaugeBribe[];
      nextEpochBribes: GaugeBribe[];
    }[]
  > {
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

    const nextEpochTime = moment.unix(epochStartTime).utc().add(1, 'week').unix();

    const abi: string | Array<Fragment | JsonFragment | string> = Object.values(
      Object.fromEntries([...managerABI].map((row) => [row.name, row])),
    );

    const multicall = new Multicaller(this.aprServices, abi);

    gauges.forEach((gauge) => {
      multicall.call(
        `${gauge.gaugeAddress}.${epochStartTime}`,
        networkConfig.vertek.bribeManager,
        'getGaugeBribes',
        [gauge.gaugeAddress, epochStartTime],
      );

      multicall.call(
        `${gauge.gaugeAddress}.${nextEpochTime}`,
        networkConfig.vertek.bribeManager,
        'getGaugeBribes',
        [gauge.gaugeAddress, nextEpochTime],
      );
    });

    const bribeResults = await multicall.execute<Record<string, any>>(
      'GaugeBribeService:getGaugeBribes',
    );

    let bribesUI = [];
    let currents = [];
    let nexts = [];
    gauges.forEach((gauge) => {
      const currentEpochBribes = bribeResults[gauge.gaugeAddress][epochStartTime];
      const nextEpochBribes = bribeResults[gauge.gaugeAddress][nextEpochTime];

      if (currentEpochBribes.length) {
        currents = currents.concat(this.matchBribesData(tokens, currentEpochBribes));
      }

      if (nextEpochBribes.length) {
        nexts = nexts.concat(this.matchBribesData(tokens, nextEpochBribes));
      }

      bribesUI.push({
        gauge: gauge.gaugeAddress,
        currentEpochBribes: currents,
        nextEpochBribes: nexts,
      });

      currents = [];
      nexts = [];
    });

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
