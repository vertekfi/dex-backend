import { Args, Query, Resolver } from '@nestjs/graphql';
import { RewardPoolService } from './reward-pool.service';

@Resolver()
export class RewardPoolQueryResolver {
  constructor(private readonly rewardPoolService: RewardPoolService) {}

  @Query()
  async getRewardPools(@Args('user') user: string) {
    return this.rewardPoolService.getPoolsWithUserData(user);
  }
}
