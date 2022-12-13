import { Args, Query, Resolver } from '@nestjs/graphql';
import { TokenService } from '../common/token/token.service';
import { BalancerSorService } from './sor/balancer-sor.service';

@Resolver()
export class BalancerSdkResolver {
  constructor(
    private readonly balancerSorService: BalancerSorService,
    private readonly tokenService: TokenService,
  ) {}

  @Query()
  async sorGetSwaps(@Args() args) {
    const tokens = await this.tokenService.getTokens();
    return this.balancerSorService.getSwaps({ ...args, tokens });
  }

  @Query()
  async sorGetBatchSwapForTokensIn(@Args() args) {
    const tokens = await this.tokenService.getTokens();
    return this.balancerSorService.getBatchSwapForTokensIn({ ...args, tokens });
  }
}
