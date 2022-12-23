import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { RewardPoolService } from './reward-pool.service';

@Resolver()
export class RewardPoolQueryResolver {
  constructor(private readonly rewardPoolService: RewardPoolService) {}

  @Query()
  async getRewardPools(@Args('user') user: string) {
    return this.rewardPoolService.getPoolsWithUserData(user);
  }

  @Mutation()
  @UseGuards(AdminGuard)
  async doStakes() {
    return this.rewardPoolService.doStakes();
  }
}
