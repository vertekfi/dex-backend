import { Injectable } from '@nestjs/common';
import { GqlPoolMinimal, GqlPoolUnion } from 'src/graphql';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';

@Injectable()
export class PoolService {
  constructor(private poolGqlLoaderService: PoolGqlLoaderService) {}

  async getGqlPool(id: string): Promise<GqlPoolUnion> {
    return this.poolGqlLoaderService.getPool(id);
  }

  //   async getGqlPools(args: QueryPoolGetPoolsArgs): Promise<GqlPoolMinimal[]> {
  //     return this.poolGqlLoaderService.getPools(args);
  // }
}
