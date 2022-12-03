import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { PrismaService } from 'nestjs-prisma';
import { GqlPoolSnapshotDataRange } from 'src/gql-addons';

@Injectable()
export class PoolSnapshotService {
  constructor(private prisma: PrismaService) {}

  async getSnapshotsForPool(poolId: string, range: GqlPoolSnapshotDataRange) {
    const timestamp = this.getTimestampForRange(range);

    return this.prisma.prismaPoolSnapshot.findMany({
      where: { poolId, timestamp: { gte: timestamp } },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getSnapshotForPool(poolId: string, timestamp: number) {
    return this.prisma.prismaPoolSnapshot.findUnique({
      where: { id: `${poolId}-${timestamp}` },
    });
  }

  async getSnapshotsForAllPools(range: GqlPoolSnapshotDataRange) {
    const timestamp = this.getTimestampForRange(range);

    return this.prisma.prismaPoolSnapshot.findMany({
      where: {
        timestamp: { gte: timestamp },
        totalSharesNum: {
          gt: 0.000000000001,
        },
        pool: {
          categories: { none: { category: 'BLACK_LISTED' } },
        },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  private getTimestampForRange(range: GqlPoolSnapshotDataRange): number {
    switch (range) {
      case 'THIRTY_DAYS':
        return moment().startOf('day').subtract(30, 'days').unix();
      case 'NINETY_DAYS':
        return moment().startOf('day').subtract(90, 'days').unix();
      case 'ONE_HUNDRED_EIGHTY_DAYS':
        return moment().startOf('day').subtract(180, 'days').unix();
      case 'ONE_YEAR':
        return moment().startOf('day').subtract(365, 'days').unix();
      case 'ALL_TIME':
        return 0;
    }
  }
}
