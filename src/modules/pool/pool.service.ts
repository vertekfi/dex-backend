import { Injectable } from '@nestjs/common';
import { QueryPoolGetPoolsArgs } from 'src/gql-addons';
import { GqlPoolMinimal, GqlPoolUnion } from 'src/graphql';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';

@Injectable()
export class PoolService {
  constructor(private poolGqlLoaderService: PoolGqlLoaderService) {}

  async getGqlPool(id: string) {
    return this.poolGqlLoaderService.getPool(id);
  }

  async getGqlPools(args: QueryPoolGetPoolsArgs): Promise<GqlPoolMinimal[]> {
    return this.poolGqlLoaderService.getPools(args);
  }
}
