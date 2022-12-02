import { Injectable } from '@nestjs/common';
import { GqlPoolUnion } from 'src/graphql';
import { PoolGqlLoaderService } from './lib/pool-gql-loader.service';

@Injectable()
export class PoolService {
  constructor(private poolGqlLoaderService: PoolGqlLoaderService) {}

  async getGqlPool(id: string): Promise<GqlPoolUnion> {
    return this.poolGqlLoaderService.getPool(id);
  }
}
