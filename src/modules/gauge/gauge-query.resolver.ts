import { Args, Query, Resolver } from '@nestjs/graphql';
import { GaugeBribeService } from '../common/gauges/bribes.service';
import { GaugeService } from '../common/gauges/gauge.service';

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
  async getAllGaugeBribes(@Args('epoch') epoch: number) {
    return this.bribeService.getAllGaugeBribes(epoch);
  }

  @Query()
  async getUserBribeClaims(@Args() args) {
    return this.bribeService.getUserPendingBribeRewards(args.user, args.epoch);
  }
}
