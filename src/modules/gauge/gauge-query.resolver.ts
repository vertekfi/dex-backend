import { Args, Query, Resolver } from '@nestjs/graphql';
import { GaugeService } from '../common/gauges/gauge.service';
import { VeBalAprCalc } from '../common/gauges/vebal-apr.calc';

@Resolver()
export class GaugeQueryResolver {
  constructor(private readonly gaugeService: GaugeService, private readonly veApr: VeBalAprCalc) {}

  @Query()
  async getLiquidityGauges() {
    return this.gaugeService.getCoreGauges();
  }

  @Query()
  async getUserGaugeStakes(@Args() args) {
    return this.gaugeService.getUserGaugeStakes(args);
  }
}
