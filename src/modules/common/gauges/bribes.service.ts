import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { GaugeBribe } from 'src/graphql';
import { Multicaller } from '../../common/web3/multicaller';
import { AccountWeb3 } from '../../common/types';
import { RPC } from '../../common/web3/rpc.provider';
import * as managerABI from '../../abis/BribeManager.json';
import { Fragment, JsonFragment } from '@ethersproject/abi/lib/fragments';
import { networkConfig } from '../../config/network-config';
import { PrismaToken, PrismaTokenCurrentPrice } from '@prisma/client';
import { formatEther } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { ethNum } from '../../utils/old-big-number';
import * as moment from 'moment-timezone';
import { getPreviousEpoch } from 'src/modules/utils/epoch.utils';
import * as fs from 'fs-extra';
import { join } from 'path';
import { getContractAddress } from '../web3/contract';

@Injectable()
export class GaugeBribeService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
  ) {}

  async getUserPendingBribeRewards(user: string, epoch: number) {
    let userClaims = [];

    if (!user) {
      return userClaims;
    }

    const [prices, gauges] = await Promise.all([
      this.prisma.prismaTokenCurrentPrice.findMany({}),
      this.prisma.prismaPoolStakingGauge.findMany({}),
    ]);

    const bribers = fs.readJSONSync(
      join(process.cwd(), 'src/modules/common/gauges/data', epoch.toString(), 'bribers-data.json'),
    );

    // TODO: Multicall to check already claimed **

    bribers.forEach((briber) => {
      briber.bribes
        .filter((b) => b.epochStartTime === epoch)
        .forEach((bribe) => {
          const claims = bribe.userTreeData
            .filter((u) => u.user.toLowerCase() === user.toLowerCase())
            .map((claim) => {
              const claimData = claim.claims[0];
              const priceInfo = prices.find(
                (p) => p.tokenAddress === claimData.token.toLowerCase(),
              );
              const gaugeRecord = gauges.find(
                (g) => g.gaugeAddress.toLowerCase() === claimData.gauge.toLowerCase(),
              );

              // TODO: Multicall to check already claimed *

              const amountOwed = ethNum(claimData.amountOwed);
              const valueUSD = amountOwed * priceInfo.price;

              return {
                // tokenIndex: handle on frontend
                briber: briber.briber,
                distributionId: bribe.distribution.distributionId,
                ...claimData,
                amountOwed: String(amountOwed),
                amountOwedBN: claimData.amountOwed,
                valueUSD,
                gaugeRecord,
              };
            });

          userClaims.push(...claims);
        });
    });

    // TODO: Multicall to check already claimed *

    const multi = new Multicaller(this.rpc, [
      `  function isClaimed(
      address token,
      address briber,
      uint256 distributionId,
      address claimer
  ) public view returns (bool)`,
    ]);

    const orchard = getContractAddress('MerkleOrchard');
    userClaims.forEach((claim, i) => {
      multi.call(`${i}`, orchard, 'isClaimed', [
        claim.token,
        claim.briber,
        claim.distributionId,
        user,
      ]);
    });

    const claimsResult = await multi.execute<Record<string, boolean>>(
      'GaugeBribeService:getUserPendingBribeRewards',
    );

    userClaims = userClaims.filter((claim, idx) => claimsResult[idx.toString()] === false);

    return userClaims;
  }

  async getAllGaugeBribes(epoch?: number): Promise<
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
    if (!epoch) {
      epoch = moment(getPreviousEpoch()).unix();
    }

    const nextEpochTime = moment.unix(epoch).utc().add(1, 'week').unix();

    const abi: string | Array<Fragment | JsonFragment | string> = Object.values(
      Object.fromEntries([...managerABI].map((row) => [row.name, row])),
    );

    const multicall = new Multicaller(this.rpc, abi);

    gauges.forEach((gauge) => {
      multicall.call(
        `${gauge.gaugeAddress}.${epoch}`,
        networkConfig.vertek.bribeManager,
        'getGaugeBribes',
        [gauge.gaugeAddress, epoch],
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
      const currentEpochBribes = bribeResults[gauge.gaugeAddress][epoch];
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
