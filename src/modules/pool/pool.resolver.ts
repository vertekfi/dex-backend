import { Args, Query, Resolver } from '@nestjs/graphql';
import { QueryPoolGetPoolsArgs, QueryPoolGetSwapsArgs } from 'src/gql-addons';
import { PoolService } from './pool.service';

@Resolver()
export class PoolResolver {
  constructor(private poolService: PoolService) {}

  @Query()
  async poolGetPool(@Args('id') id: string) {
    return this.poolService.getGqlPool(id);
  }

  @Query()
  async poolGetPools(@Args() args: QueryPoolGetPoolsArgs) {
    return this.poolService.getGqlPools(args);
  }

  @Query()
  async poolGetPoolsCount(@Args() args: QueryPoolGetPoolsArgs) {
    return this.poolService.getPoolsCount(args);
  }

  @Query()
  async poolGetPoolFilters() {
    return this.poolService.getPoolFilters();
  }

  @Query()
  async poolGetSwaps(@Args() args: QueryPoolGetSwapsArgs) {
    return this.poolService.getPoolSwaps(args);
  }
}
