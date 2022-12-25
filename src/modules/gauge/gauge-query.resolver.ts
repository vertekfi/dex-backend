import { Args, Query, Resolver } from '@nestjs/graphql';
import { GaugeService } from './gauge.service';

@Resolver()
export class GaugeQueryResolver {
  constructor(private readonly gaugeService: GaugeService) {}

  @Query()
  async getLiquidityGauges(@Args() args) {
    return this.gaugeService.getAllGauges(args);
  }
}
