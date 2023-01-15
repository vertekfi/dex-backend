import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { getRequiredAccountAddress, isAdminRoute } from '../common/middleware/auth.middleware';
import { UserService } from './user.service';

@Resolver()
@UseGuards(AdminGuard)
export class UserMutationResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation()
  async userSyncChangedWalletBalancesForAllPools() {
    await this.userService.syncChangedWalletBalancesForAllPools();
    return 'success';
  }

  @Mutation()
  async userInitWalletBalancesForAllPools() {
    await this.userService.initWalletBalancesForAllPools();
    return 'success';
  }

  @Mutation()
  async userInitWalletBalancesForPool(@Args('poolId') poolId) {
    await this.userService.initWalletBalancesForPool(poolId);
    return 'success';
  }

  @Mutation()
  async userInitStakedBalances() {
    await this.userService.initStakedBalances();
    return 'success';
  }

  @Mutation()
  async userSyncChangedStakedBalances() {
    await this.userService.syncChangedStakedBalances();
    return 'success';
  }

  @Mutation()
  async userSyncBalance(@Context() context, @Args('poolId') poolId) {
    const accountAddress = getRequiredAccountAddress(context);
    await this.userService.syncUserBalance(accountAddress, poolId);
    return 'success';
  }

  @Mutation()
  async userSyncBalanceAllPools(@Context() context) {
    isAdminRoute(context);
    const accountAddress = getRequiredAccountAddress(context);
    await this.userService.syncUserBalanceAllPools(accountAddress);
    return 'success';
  }
}
