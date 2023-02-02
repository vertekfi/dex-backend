import { Args, Query, Resolver } from '@nestjs/graphql';
import { TokenService } from '../common/token/token.service';
import { SorSplitterService } from './sor/v1/sor-splitter.service';

@Resolver()
export class BalancerSdkResolver {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sorSplitter: SorSplitterService,
  ) {}

  @Query()
  async sorGetSwaps(@Args() args) {
    return this.sorSplitter.getSwaps(args);
  }

  @Query()
  async sorGetBatchSwapForTokensIn(@Args() args) {
    const tokens = await this.tokenService.getTokens();
    return this.sorSplitter.getBatchSwapForTokensIn(args);
  }
}
