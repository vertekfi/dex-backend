import { formatUnits } from '@ethersproject/units';
import { Inject, Injectable } from '@nestjs/common';
import { sub } from 'date-fns';
import { bnum } from 'src/modules/balancer-sdk/sor/impl/utils/bignumber';
import { AccountWeb3 } from 'src/modules/common/types';
import { BalMulticaller } from 'src/modules/common/web3/bal-multicall';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { TokenPrices } from 'src/modules/token/token-types-old';
import { toUnixTimestamp } from 'src/modules/utils/time';

@Injectable()
export class VeBalAprCalc {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly contractService: ContractService,
  ) {}

  public async calc(totalLiquidity: string, totalSupply: string, prices: TokenPrices) {
    const { balAmount, veBalCurrentSupply } = await this.getData();

    const aggregateWeeklyRevenue = this.calcAggregateWeeklyRevenue(balAmount, prices);

    const bptPrice = bnum(totalLiquidity).div(totalSupply);

    return aggregateWeeklyRevenue.times(52).div(bptPrice.times(veBalCurrentSupply)).toString();
  }

  private async getData(): Promise<{
    balAmount: string;
    bbAUSDAmount: string;
    bbaUSDPrice: string;
    veBalCurrentSupply: string;
  }> {
    const epochBeforeLast = toUnixTimestamp(this.getPreviousEpoch(1).getTime());
    const multicaller = new BalMulticaller(
      CONTRACT_MAP.MULTICALL[this.rpc.chainId],
      this.rpc.provider,
    );

    multicaller
      .call({
        key: 'balAmount',
        address: CONTRACT_MAP.FEE_DISTRIBUTOR[this.rpc.chainId],
        function: 'getTokensDistributedInWeek',
        abi: [
          'function getTokensDistributedInWeek(address, uint256) public view returns (uint256)',
        ],
        params: [this.contractService.getProtocolToken().address, epochBeforeLast],
      })
      .call({
        key: 'veBalCurrentSupply',
        address: this.contractService.getMainPool().address,
        function: 'totalSupply()',
        abi: ['function totalSupply() public view returns (uint256)'],
      });

    const result = await multicaller.execute();

    for (const key in result) {
      result[key] = formatUnits(result[key], 18);
    }

    return result;
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

  private calcAggregateWeeklyRevenue(balAmount: string, prices: TokenPrices) {
    const balPrice = prices[this.contractService.getProtocolToken().address];
    return bnum(balAmount).times(balPrice.usd);
  }
}
