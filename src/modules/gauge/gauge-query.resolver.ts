import { Args, Query, Resolver } from '@nestjs/graphql';
import { GaugeService } from '../common/gauges/gauge.service';
import { GaugeBribeService } from './bribes.service';

@Resolver()
export class GaugeQueryResolver {
  constructor(
    private readonly gaugeService: GaugeService,
    private readonly bribeService: GaugeBribeService,
  ) {}

  @Query()
  async getLiquidityGauges() {
    return this.gaugeService.getCoreGauges();
  }

  @Query()
  async getUserGaugeStakes(@Args() args) {
    return this.gaugeService.getUserGaugeStakes(args);
  }

  @Query()
  async getGaugeBribes(@Args('epoch') epoch: number) {
    return this.bribeService.getGaugeBribes(epoch);
  }
}
