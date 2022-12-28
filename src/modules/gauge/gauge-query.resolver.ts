import { Args, Query, Resolver } from '@nestjs/graphql';
import { GaugeService } from './gauge.service';

@Resolver()
export class GaugeQueryResolver {
  constructor(private readonly gaugeService: GaugeService) {}

  @Query()
  async getLiquidityGauges(@Args() args) {
    return this.gaugeService.getAllGauges(args);
  }

  @Query()
  async getPoolsForGauges(@Args('gaugeIds') gaugeIds: string[]) {
    return this.gaugeService.getPoolsForGauges(gaugeIds);
  }

  @Query()
  async getUserGaugeStakes(@Args() args) {
    return this.gaugeService.getUserGaugeStakes(args);
  }
}
