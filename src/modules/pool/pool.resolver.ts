import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlPoolBase } from 'src/graphql';
import { PoolService } from './pool.service';

@Resolver()
export class PoolResolver {
  constructor(private poolService: PoolService) {}

  @Query()
  async poolGetPool(@Args('id') id) {
    return this.poolService.getGqlPool(id);
  }

  @Query()
  async poolGetPools(@Args() args) {
    return this.poolService.getGqlPools(args);
  }

  @Query()
  async poolGetPoolsCount(@Args() args) {
    return this.poolService.getPoolsCount(args);
  }
}
