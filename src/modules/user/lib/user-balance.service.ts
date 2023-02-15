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

@Injectable()
export class UserBalanceService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
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

    const pools = await this.prisma.prismaPool.findMany({
      include: {
        staking: {
          include: {
            gauge: true,
          },
        },
      },
    });
    const multicaller = new Multicaller(this.rpc, [
      'function balanceOf(address) public view returns (uint256)',
    ]);

    if (!userAddress || userAddress === 'undefined') {
      return [];
    }

    pools.forEach((pool) => {
      multicaller.call(`${pool.address}.poolBalance`, pool.address, 'balanceOf', [userAddress]);
      const gauge = pool.staking?.gauge;
      if (gauge) {
        multicaller.call(`${gauge.gaugeAddress}.stakedBalance`, gauge.gaugeAddress, 'balanceOf', [
          userAddress,
        ]);
      }
    });

    const result = await multicaller.execute('UserBalanceService:getUserPoolBalances');

    const data = pools.map((pool) => {
      const gauge = pool.staking?.gauge;

      const stakedBalance = gauge ? formatEther(result[gauge.gaugeAddress].stakedBalance) : '0';
      const walletBalance = result[pool.address]?.poolBalance
        ? formatEther(result[pool.address].poolBalance)
        : '0';
      const stakedNum = parseUnits(stakedBalance, 18);
      const walletNum = parseUnits(walletBalance.toString(), 18);

      return {
        poolId: pool.id,
        tokenAddress: pool.address,
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
