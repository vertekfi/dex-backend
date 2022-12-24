import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class GaugeQueryResolver {
  constructor() {}

  @Query()
  async getLiquidityGauges() {
    return [];
  }
}
