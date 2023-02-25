import { Inject, Injectable } from '@nestjs/common';
import { sub } from 'date-fns';
import { BigNumber } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { bnum } from 'src/modules/balancer-sdk/sor/impl/utils/bignumber';
import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { networkConfig } from 'src/modules/config/network-config';
import { ethNum } from 'src/modules/utils/old-big-number';
import { toUnixTimestamp } from 'src/modules/utils/time';
import { getTokenAddress } from '../token/utils';
import { getContractAddress } from '../web3/contract';
import { Multicaller } from '../web3/multicaller';

@Injectable()
export class VeBalAprCalc {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly pricingService: TokenPriceService,
    private readonly prisma: PrismaService,
  ) {}

  async getVeVrtkApr() {}

  public async calc(totalLiquidity: string, totalSupply: string) {
    return await this.getFeeDistributionData();
  }

  private async getFeeDistributionData() {
    let multicaller = new Multicaller(this.rpc, [
      'function totalSupply() public view returns (uint256)',
    ]);

    const veAddress = networkConfig.balancer.votingEscrow.veAddress;
    multicaller.call(`${veAddress}`, veAddress, 'totalSupply');

    const [pools, prices, veTotalSupply] = await Promise.all([
      this.prisma.prismaPool.findMany({}),
      this.pricingService.getCurrentTokenPrices(),
      multicaller.execute('VeBalAprCalc:getData'),
    ]);

    multicaller = new Multicaller(this.rpc, [
      'function getTokensDistributedInWeek(address, uint256) public view returns (uint256)',
    ]);

    const feeDistAddress = getContractAddress('FeeDistributor');
    const epochBeforeLast = toUnixTimestamp(this.getPreviousEpoch(1).getTime());

    pools.forEach((pool) => {
      multicaller.call(`${pool.address}`, feeDistAddress, 'getTokensDistributedInWeek', [
        pool.address,
        epochBeforeLast,
      ]);
    });

    const vrtkAddress = getTokenAddress('VRTK').toLowerCase();
    multicaller.call(`${vrtkAddress}`, feeDistAddress, 'getTokensDistributedInWeek', [
      vrtkAddress,
      epochBeforeLast,
    ]);

    const result = await multicaller.execute<Record<string, BigNumber>>('VeBalAprCalc:getData');
    const veSupply = ethNum(veTotalSupply[veAddress]);

    let totalWeeklyValueUSD = 0;
    let totalAPR = bnum(0);
    let veAPR = bnum(0);

    Object.entries(result)
      .filter((obj) => !obj[1].isZero())
      .map((obj) => {
        const tokenAddress = obj[0];
        const amount = ethNum(obj[1]);
        const price = prices.find((pr) => pr.tokenAddress === tokenAddress);
        const valueUSD = amount * price.price;
        const bptPrice = bnum(price.price);
        const aprBase = bnum(valueUSD).times(52).div(bptPrice.times(veSupply));

        totalAPR = totalAPR.plus(aprBase);
        totalWeeklyValueUSD += valueUSD;

        if (tokenAddress === vrtkAddress) {
          veAPR = aprBase;
        }

        return {
          tokenAddress,
          amount,
          valueUSD,
        };
      });

    return totalAPR.toString();
  }

  getPreviousEpoch(weeksToGoBack = 0): Date {
    const now = new Date();
    const todayAtMidnightUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    let daysSinceThursday = now.getDay() - 4;
    if (daysSinceThursday < 0) daysSinceThursday += 7;

    daysSinceThursday = daysSinceThursday + weeksToGoBack * 7;

    return sub(todayAtMidnightUTC, {
      days: daysSinceThursday,
    });
  }
}
