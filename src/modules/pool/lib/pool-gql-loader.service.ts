import { Injectable } from '@nestjs/common';
import { GqlPoolUnion } from 'src/graphql';

@Injectable()
export class PoolGqlLoaderService {
  constructor() {}

  async getPool(id: string): Promise<GqlPoolUnion> {
    // const pool = await prisma.prismaPool.findUnique({
    //     where: { id },
    //     include: prismaPoolWithExpandedNesting.include,
    // });

    // if (!pool) {
    //     throw new Error('Pool with id does not exist');
    // }

    // if (pool.type === 'UNKNOWN') {
    //     throw new Error('Pool exists, but has an unknown type');
    // }

    // return this.mapPoolToGqlPool(pool);
    return null;
  }
}
