import { Injectable } from '@nestjs/common';
import { PrismaPoolSnapshot } from '@prisma/client';
import * as moment from 'moment-timezone';
import { PrismaService } from 'nestjs-prisma';
import { GqlPoolSnapshotDataRange } from 'src/gql-addons';
import {
  PoolSnapshot_OrderBy,
  OrderDirection,
  BalancerPoolSnapshotFragment,
} from 'src/modules/subgraphs/balancer/balancer-subgraph-types';
import { BalancerSubgraphService } from 'src/modules/subgraphs/balancer/balancer-subgraph.service';

@Injectable()
export class PoolSnapshotService {
  constructor(
    private prisma: PrismaService,
    private readonly balancerSubgraphService: BalancerSubgraphService,
  ) {}

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

  async loadAllSnapshotsForPools(poolIds: string[]) {
    //assuming the pool does not have more than 5,000 snapshots, we should be ok.
    const allSnapshots = await this.balancerSubgraphService.getAllPoolSnapshots({
      where: { pool_in: poolIds },
      orderBy: PoolSnapshot_OrderBy.Timestamp,
      orderDirection: OrderDirection.Asc,
    });

    for (const poolId of poolIds) {
      const snapshots = allSnapshots.filter((snapshot) => snapshot.pool.id === poolId);

      await this.prisma.prismaPoolSnapshot.createMany({
        data: snapshots.map((snapshot, index) => {
          let prevTotalSwapVolume = index === 0 ? '0' : snapshots[index - 1].swapVolume;
          let prevTotalSwapFee = index === 0 ? '0' : snapshots[index - 1].swapFees;

          return this.getPrismaPoolSnapshotFromSubgraphData(
            snapshot,
            prevTotalSwapVolume,
            prevTotalSwapFee,
          );
        }),
        skipDuplicates: true,
      });
    }
  }

  private getPrismaPoolSnapshotFromSubgraphData(
    snapshot: BalancerPoolSnapshotFragment,
    prevTotalSwapVolume: string,
    prevTotalSwapFee: string,
  ): PrismaPoolSnapshot {
    const totalLiquidity = parseFloat(snapshot.liquidity);
    const totalShares = parseFloat(snapshot.totalShares);

    return {
      id: snapshot.id,
      poolId: snapshot.pool.id,
      timestamp: snapshot.timestamp,
      totalLiquidity: parseFloat(snapshot.liquidity),
      totalShares: snapshot.totalShares,
      totalSharesNum: parseFloat(snapshot.totalShares),
      totalSwapVolume: parseFloat(snapshot.swapVolume),
      totalSwapFee: parseFloat(snapshot.swapFees),
      swapsCount: parseInt(snapshot.swapsCount),
      holdersCount: parseInt(snapshot.holdersCount),
      amounts: snapshot.amounts,
      volume24h: Math.max(parseFloat(snapshot.swapVolume) - parseFloat(prevTotalSwapVolume), 0),
      fees24h: Math.max(parseFloat(snapshot.swapFees) - parseFloat(prevTotalSwapFee), 0),
      sharePrice: totalLiquidity > 0 && totalShares > 0 ? totalLiquidity / totalShares : 0,
    };
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
