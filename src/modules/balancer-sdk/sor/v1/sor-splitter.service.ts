import { Injectable } from '@nestjs/common';
import { TokenService } from 'src/modules/common/token/token.service';
import { BalancerSorV2Service } from '../balancer-sor-v2.service';
import { GetSwapsInput } from '../types';
import { BalancerSorV1Service } from './balancer-sor-v1.service';

@Injectable()
export class SorSplitterService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly balancerSorV2: BalancerSorV2Service,
    private readonly balancerSorV1: BalancerSorV1Service,
  ) {}

  async getSwaps(swapInput: GetSwapsInput) {
    const tokens = await this.tokenService.getTokens();
    const [v1Result, v2Result] = await Promise.all([
      this.balancerSorV1.getSwaps({ ...swapInput, tokens }),
      this.balancerSorV2.getSwaps({ ...swapInput, tokens }),
    ]);

    return this.giveBestSwap(v1Result, v2Result);
  }

  async getBatchSwapForTokensIn(swapInput) {
    const tokens = await this.tokenService.getTokens();
    // return this.balancerSorV2.getBatchSwapForTokensIn({ ...swapInput, tokens });
    const [v1Result, v2Result] = await Promise.all([
      this.balancerSorV1.getBatchSwapForTokensIn({ ...swapInput, tokens }),
      this.balancerSorV2.getBatchSwapForTokensIn({ ...swapInput, tokens }),
    ]);

    return this.giveBestSwap(v1Result, v2Result);
  }

  private giveBestSwap(v1Result, v2Result) {
    console.log('v1Result:');
    console.log(v1Result);
    console.log('v2Result:');
    console.log(v2Result);

    return v2Result;
  }
}
