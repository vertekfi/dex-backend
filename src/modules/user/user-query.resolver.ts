import { Args, Context, Query, Resolver } from '@nestjs/graphql';
import { getRequiredAccountAddress } from '../common/middleware/auth.middleware';
import { TokenService } from '../common/token/token.service';
import { UserService } from './user.service';

@Resolver()
export class UserQueryResolver {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  @Query()
  async userGetPoolBalances(@Context() context) {
    const accountAddress = getRequiredAccountAddress(context);
    const [tokenPrices, balances] = await Promise.all([
      this.tokenService.getTokenPrices(),
      this.userService.getUserPoolBalances(accountAddress),
    ]);

    return balances.map((balance) => {
      return {
        ...balance,
        tokenPrice: this.tokenService.getPriceForToken(tokenPrices, balance.tokenAddress),
      };
    });
  }

  @Query()
  async userGetPoolJoinExits(@Context() context, @Args() args) {
    const accountAddress = getRequiredAccountAddress(context);
    return this.userService.getUserPoolInvestments(
      accountAddress,
      args.poolId,
      args.first,
      args.skip,
    );
  }

  @Query()
  async userGetSwaps(@Context() context, @Args() args) {
    const accountAddress = getRequiredAccountAddress(context);
    return this.userService.getUserSwaps(accountAddress, args.poolId, args.first, args.skip);
  }

  @Query()
  async userGetStaking(@Context() context) {
    const accountAddress = getRequiredAccountAddress(context);
    return this.userService.getUserStaking(accountAddress);
  }
}
