import { Args, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class PoolResolver {
  constructor() {}

  @Query()
  async poolGetPool() {
    return 1;
  }
}
