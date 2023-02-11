import { UserPoolBalance } from '../user-types';
import * as _ from 'lodash';
import { formatEther, parseUnits } from 'ethers/lib/utils';
import { formatFixed } from '@ethersproject/bignumber';
import { PrismaPoolStaking } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { Inject, Injectable } from '@nestjs/common';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { AccountWeb3 } from 'src/modules/common/types';
import { GaugeService } from 'src/modules/common/gauges/gauge.service';

@Injectable()
export class UserBalanceService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly gaugeService: GaugeService,
  ) {}

  async getUserPoolBalances(userAddress: string): Promise<UserPoolBalance[]> {
    // const user = await this.prisma.prismaUser.findUnique({
    //   where: { address: userAddress.toLowerCase() },
    //   include: {
    //     walletBalances: { where: { poolId: { not: null }, balanceNum: { gt: 0 } } },
    //     stakedBalances: {
    //       where: { poolId: { not: null }, balanceNum: { gt: 0 } },
    //     },
    //   },
    // });

    // const poolIds = _.uniq([
    //   ...user.stakedBalances.map((balance) => balance.poolId),
    //   ...user.walletBalances.map((balance) => balance.poolId),
    // ]) as string[];

    // const data = poolIds.map((poolId) => {
    //   const stakedBalance = user.stakedBalances.find((balance) => balance.poolId === poolId);
    //   const walletBalance = user.walletBalances.find((balance) => balance.poolId === poolId);
    //   const stakedNum = parseUnits(stakedBalance?.balance || '0', 18);
    //   const walletNum = parseUnits(walletBalance?.balance || '0', 18);

    //   return {
    //     poolId,
    //     tokenAddress: stakedBalance?.tokenAddress || walletBalance?.tokenAddress || '',
    //     totalBalance: formatFixed(stakedNum.add(walletNum), 18),
    //     stakedBalance: stakedBalance?.balance || '0',
    //     walletBalance: walletBalance?.balance || '0',
    //   };
    // });

    // console.log(data);

    // return data;

    const [pools, gaugesInfo] = await Promise.all([
      this.prisma.prismaPool.findMany({}),
      this.gaugeService.getAllProtocolGauges(),
    ]);

    const multicaller = new Multicaller(this.rpc, [
      'function balanceOf(address) public view returns (uint256)',
    ]);

    if (!userAddress) {
      return [];
    }

    pools.forEach((p) => {
      multicaller.call(`${p.address}.poolBalance`, p.address, 'balanceOf', [userAddress]);

      const gauge = gaugesInfo.find((g) => g.poolId === p.id);
      if (gauge) {
        multicaller.call(`${gauge.address}.stakedBalance`, gauge.address, 'balanceOf', [
          userAddress,
        ]);
      }
    });

    const result = await multicaller.execute();

    const data = pools.map((pool) => {
      const gauge = gaugesInfo.find((g) => g.poolId === pool.id);

      const stakedBalance = gauge ? formatEther(result[gauge.address].stakedBalance) : '0';
      const walletBalance = result[pool.address]?.poolBalance
        ? formatEther(result[pool.address].poolBalance)
        : '0';
      const stakedNum = parseUnits(stakedBalance, 18);
      const walletNum = parseUnits(walletBalance.toString(), 18);

      const tokenAddress = gauge?.address || pool.address || '';

      return {
        poolId: pool.id,
        tokenAddress,
        totalBalance: formatFixed(stakedNum.add(walletNum), 18),
        stakedBalance,
        walletBalance,
      };
    });

    return data;
  }

  async getUserStaking(address: string): Promise<PrismaPoolStaking[]> {
    const user = await this.prisma.prismaUser.findUnique({
      where: { address },
      include: {
        stakedBalances: {
          where: { balanceNum: { gt: 0 } },
          include: {
            staking: {
              include: {
                gauge: {
                  include: {
                    rewards: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return (user?.stakedBalances || [])
      .filter((stakedBalance) => stakedBalance.staking)
      .map((stakedBalance) => stakedBalance.staking);
  }
}
