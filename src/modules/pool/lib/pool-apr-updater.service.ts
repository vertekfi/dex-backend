import { PoolAprService } from '../pool-types';
import * as _ from 'lodash';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { prismaPoolWithExpandedNesting } from 'prisma/prisma-types';
import { PrismaService } from 'nestjs-prisma';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PoolAprUpdaterService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePoolAprs(aprServices: PoolAprService[]) {
    const pools = await this.prisma.prismaPool.findMany(prismaPoolWithExpandedNesting);

    for (const aprService of aprServices) {
      try {
        // console.log(`Running APR update using ${aprService.name}`);
        await aprService.updateAprForPools(pools);
      } catch (e) {
        console.log(`Error during APR update of aprService:`, e);
      }
    }

    const aprItems = await this.prisma.prismaPoolAprItem.findMany({
      select: { poolId: true, apr: true },
    });

    const grouped = _.groupBy(aprItems, 'poolId');
    let operations: any[] = [];

    // store the total APR on the dynamic data so we can sort by it
    for (const poolId in grouped) {
      operations.push(
        this.prisma.prismaPoolDynamicData.update({
          where: { id: poolId },
          data: { apr: _.sumBy(grouped[poolId], (item) => item.apr) },
        }),
      );
    }

    await prismaBulkExecuteOperations(operations);
  }

  async realodAllPoolAprs(aprServices: PoolAprService[]) {
    await this.prisma.prismaPoolAprItem.deleteMany({});
    await this.updatePoolAprs(aprServices);
  }
}
