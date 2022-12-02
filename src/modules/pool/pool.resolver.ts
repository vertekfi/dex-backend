// import { Args, Query, Resolver } from '@nestjs/graphql';
// import { GqlBalancerPool, GqlBalancerPoolSnapshot } from 'src/graphql';
// import { GqlBalancerGetPoolActivitiesInput } from 'src/graphql/schema';
// import { PoolService } from './pools.service';

// @Resolver()
// export class PoolsResolver {
//   constructor(private readonly poolService: PoolService) {}

//   @Query()
//   async pools(): Promise<GqlBalancerPool[]> {
//     return await this.poolService.getPools();
//   }

//   @Query()
//   async pool(@Args('id') id: string): Promise<GqlBalancerPool> {
//     return await this.poolService.getPool(id);
//   }

//   @Query()
//   async poolSnapshots(
//     @Args('poolId') poolId: string,
//   ): Promise<GqlBalancerPoolSnapshot[]> {
//     return this.poolService.getPoolSnapshots(poolId);
//   }

//   @Query()
//   async balancerGetPoolActivities(
//     @Args('input') input: GqlBalancerGetPoolActivitiesInput,
//   ) {
//     console.log('balancerGetPoolActivities()');
//     return this.poolService.getPoolActivities(input);
//   }
// }
