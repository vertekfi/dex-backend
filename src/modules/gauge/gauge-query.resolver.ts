import { Args, Query, Resolver } from '@nestjs/graphql';
import { GaugeService } from './gauge.service';

@Resolver()
export class GaugeQueryResolver {
  constructor(private readonly gaugeService: GaugeService) {}

  @Query()
  async getLiquidityGauges() {
    return this.gaugeService.getCoreGauges();
  }

  @Query()
  async getUserGaugeStakes(@Args() args) {
    return this.gaugeService.getUserGaugeStakes(args);
  }
}
