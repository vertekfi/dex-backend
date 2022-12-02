import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlPoolBase } from 'src/graphql';
import { PoolService } from './pool.service';

@Resolver()
export class PoolResolver {
  constructor(private poolService: PoolService) {}

  @Query()
  async poolGetPool(@Args('id') id): Promise<GqlPoolBase> {
    return this.poolService.getGqlPool(id);
  }
}
