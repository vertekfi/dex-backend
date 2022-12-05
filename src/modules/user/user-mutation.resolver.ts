import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { getRequiredAccountAddress, isAdminRoute } from '../common/middleware/auth.middleware';
import { UserService } from './user.service';

@Resolver()
export class UserMutationResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation()
  async userSyncChangedWalletBalancesForAllPools(@Context() context) {
    isAdminRoute(context);
    await this.userService.syncChangedWalletBalancesForAllPools();
    return 'success';
  }

  @Mutation()
  async userInitWalletBalancesForAllPools(@Context() context, @Args() args) {
    isAdminRoute(context);
    await this.userService.initWalletBalancesForAllPools();
    return 'success';
  }

  @Mutation()
  async userInitWalletBalancesForPool(@Context() context, @Args('poolId') poolId) {
    isAdminRoute(context);
    await this.userService.initWalletBalancesForPool(poolId);
    return 'success';
  }

  @Mutation()
  async userInitStakedBalances(@Context() context) {
    isAdminRoute(context);
    await this.userService.initStakedBalances();
    return 'success';
  }

  @Mutation()
  async userSyncChangedStakedBalances(@Context() context) {
    isAdminRoute(context);
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
