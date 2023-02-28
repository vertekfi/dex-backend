import { formatUnits, parseEther } from '@ethersproject/units';
import { Inject, Injectable } from '@nestjs/common';
import { sub } from 'date-fns';
import { bnum } from 'src/modules/balancer-sdk/sor/impl/utils/bignumber';
import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';
import { getTokenAddress } from 'src/modules/common/token/utils';
import { AccountWeb3 } from 'src/modules/common/types';
import { BalMulticaller } from 'src/modules/common/web3/bal-multicall';
import { getContractAddress } from 'src/modules/common/web3/contract';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { getPreviousEpoch } from 'src/modules/utils/epoch.utils';
import { toUnixTimestamp } from 'src/modules/utils/time';

@Injectable()
export class VeBalAprCalc {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly contractService: ContractService,
    private readonly pricingService: TokenPriceService,
  ) {}

  public async calc(totalLiquidity: string, totalSupply: string) {
    const { balAmount, veBalCurrentSupply } = await this.getData();

    const aggregateWeeklyRevenue = bnum(balAmount).times(
      await this.pricingService.getProtocolTokenPrice(),
    );

    const bptPrice = bnum(totalLiquidity).div(totalSupply);

    return aggregateWeeklyRevenue.times(52).div(bptPrice.times(veBalCurrentSupply)).toString();
  }

  private async getData(): Promise<{
    balAmount: string;
    veBalCurrentSupply: string;
  }> {
    const epochBeforeLast = toUnixTimestamp(getPreviousEpoch(1).getTime());
    const multicaller = new BalMulticaller(
      CONTRACT_MAP.MULTICALL[this.rpc.chainId],
      this.rpc.provider,
    );

    // TODO: This needs to partially hard coded for now until next epoch
    // ~55k weekly, 65% to veVRTK, VRTK price

    multicaller
      .call({
        key: 'balAmount',
        address: getContractAddress('FeeDistributor'),
        function: 'getTokensDistributedInWeek',
        abi: [
          'function getTokensDistributedInWeek(address, uint256) public view returns (uint256)',
        ],
        params: [getTokenAddress('VRTK'), epochBeforeLast],
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

    result.balAmount = formatUnits(parseEther('3500'), 18);

    return result;
  }
}
