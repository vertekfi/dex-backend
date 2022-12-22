import { Module } from '@nestjs/common';
import { RewardPoolQueryResolver } from './reward-pool-query.resolver';
import { RewardPoolService } from './reward-pool.service';

@Module({
  providers: [RewardPoolService, RewardPoolQueryResolver],
  exports: [RewardPoolQueryResolver],
})
export class RewardPoolModule {}
