import * as _ from 'lodash';
import * as moment from 'moment-timezone';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { BlockService } from 'src/modules/common/web3/block.service';
import { BalancerSubgraphService } from 'src/modules/subgraphs/balancer/balancer-subgraph.service';
import { Injectable } from '@nestjs/common';
import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';

@Injectable()
export class PoolUsdDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockService: BlockService,
    private readonly balancerSubgraphService: BalancerSubgraphService,
    private readonly pricingService: TokenPriceService,
  ) {}

  /**
   * Liquidity is dependent on token prices, so the values here are constantly in flux.
   * When updating, the easiest is to update all pools at once.
   */
  async updateLiquidityValuesForPools(
    minShares: number = 0.00000000001,
    maxShares: number = Number.MAX_SAFE_INTEGER,
  ) {
    const [tokenPrices, pools] = await Promise.all([
      this.pricingService.getCurrentTokenPrices(),
      this.prisma.prismaPool.findMany({
        include: { dynamicData: true, tokens: { include: { dynamicData: true } } },
        where: {
          dynamicData: {
            AND: [
              {
                totalSharesNum: { lte: maxShares },
              },
              {
                totalSharesNum: { gt: minShares },
              },
            ],
          },
        },
      }),
    ]);

    let updates: any[] = [];

    for (const pool of pools) {
      const balanceUSDs = pool.tokens.map((token) => {
        console.log(token.dynamicData?.balance);
        return {
          id: token.id,
          balanceUSD:
            token.address === pool.address
              ? 0
              : parseFloat(token.dynamicData?.balance || '0') *
                this.pricingService.getPriceForToken(tokenPrices, token.address),
        };
      });

      const totalLiquidity = _.sumBy(balanceUSDs, (item) => item.balanceUSD);

      for (const item of balanceUSDs) {
        updates.push(
          this.prisma.prismaPoolTokenDynamicData.update({
            where: { id: item.id },
            data: { balanceUSD: item.balanceUSD },
          }),
        );
      }

      updates.push(
        this.prisma.prismaPoolDynamicData.update({
          where: { id: pool.id },
          data: { totalLiquidity },
        }),
      );

      if (updates.length > 100) {
        await Promise.all(updates);
        updates = [];
      }
    }

    await Promise.all(updates);
  }

  async updateLiquidity24hAgoForAllPools() {
    const block24hAgo = await this.blockService.getBlockFrom24HoursAgo();
    const tokenPrices24hAgo = await this.pricingService.getTokenPricesFrom24hAgo();

    const subgraphPools = await this.balancerSubgraphService.getAllPools(
      { block: { number: block24hAgo.number } },
      false,
    );

    let updates: any[] = [];

    for (const pool of subgraphPools) {
      const balanceUSDs = (pool.tokens || []).map((token) => ({
        id: token.id,
        balanceUSD:
          token.address === pool.address
            ? 0
            : parseFloat(token.balance || '0') *
              this.pricingService.getPriceForToken(tokenPrices24hAgo, token.address),
      }));
      const totalLiquidity = Math.max(
        _.sumBy(balanceUSDs, (item) => item.balanceUSD),
        0,
      );

      updates.push(
        this.prisma.prismaPoolDynamicData.update({
          where: { id: pool.id },
          data: { totalLiquidity24hAgo: totalLiquidity, totalShares24hAgo: pool.totalShares },
        }),
      );
    }

    await prismaBulkExecuteOperations(updates);
  }

  /**
   *
   * @param poolIds the ids to update, if not provided, will update for all pools
   */
  async updateVolumeAndFeeValuesForPools(poolIds?: string[]) {
    const yesterday = moment().subtract(1, 'day').unix();
    const twoDaysAgo = moment().subtract(2, 'day').unix();
    const pools = await this.prisma.prismaPool.findMany({
      where: poolIds ? { id: { in: poolIds } } : undefined,
      include: {
        swaps: { where: { timestamp: { gte: twoDaysAgo } } },
        dynamicData: true,
      },
    });
    const operations: any[] = [];

    for (const pool of pools) {
      const volume24h = _.sumBy(
        pool.swaps.filter((swap) => swap.timestamp >= yesterday),
        (swap) =>
          swap.tokenIn === pool.address || swap.tokenOut === pool.address ? 0 : swap.valueUSD,
      );
      const fees24h = parseFloat(pool.dynamicData?.swapFee || '0') * volume24h;

      const volume48h = _.sumBy(pool.swaps, (swap) =>
        swap.tokenIn === pool.address || swap.tokenOut === pool.address ? 0 : swap.valueUSD,
      );
      const fees48h = parseFloat(pool.dynamicData?.swapFee || '0') * volume48h;

      if (
        pool.dynamicData &&
        (pool.dynamicData.volume24h !== volume24h ||
          pool.dynamicData.fees24h !== fees24h ||
          pool.dynamicData.volume48h !== volume48h ||
          pool.dynamicData.fees48h !== fees48h)
      ) {
        operations.push(
          this.prisma.prismaPoolDynamicData.update({
            where: { id: pool.id },
            data: { volume24h, fees24h, volume48h, fees48h },
          }),
        );
      }
    }

    await prismaBulkExecuteOperations(operations);
  }

  async updateLifetimeValuesForAllPools() {
    let updates: any[] = [];
    const subgraphPools = await this.balancerSubgraphService.getAllPools({});
    const stakedUsers = await this.prisma.prismaUserStakedBalance.groupBy({
      by: ['poolId'],
      _count: { userAddress: true },
    });

    for (const pool of subgraphPools) {
      const staked = stakedUsers.find((stakedUser) => stakedUser.poolId === pool.id);

      updates.push(
        this.prisma.prismaPoolDynamicData.update({
          where: { id: pool.id },
          data: {
            lifetimeVolume: parseFloat(pool.totalSwapVolume),
            lifetimeSwapFees: parseFloat(pool.totalSwapFee),
            holdersCount: parseInt(pool.holdersCount) + (staked?._count.userAddress || 0),
            swapsCount: parseInt(pool.swapsCount),
          },
        }),
      );

      const snapshots = await this.prisma.prismaPoolSnapshot.findMany({
        where: { poolId: pool.id },
      });

      if (snapshots.length > 0) {
        const sharePriceAth = _.orderBy(snapshots, 'sharePrice', 'desc')[0];
        const sharePriceAtl = _.orderBy(snapshots, 'sharePrice', 'asc')[0];
        const totalLiquidityAth = _.orderBy(snapshots, 'totalLiquidity', 'desc')[0];
        const totalLiquidityAtl = _.orderBy(snapshots, 'totalLiquidity', 'asc')[0];
        const volume24hAth = _.orderBy(snapshots, 'volume24h', 'desc')[0];
        const volume24hAtl = _.orderBy(snapshots, 'volume24h', 'asc')[0];
        const fees24hAth = _.orderBy(snapshots, 'fees24h', 'desc')[0];
        const fees24hAtl = _.orderBy(snapshots, 'fees24h', 'asc')[0];

        updates.push(
          this.prisma.prismaPoolDynamicData.update({
            where: { id: pool.id },
            data: {
              sharePriceAth: sharePriceAth.sharePrice,
              sharePriceAthTimestamp: sharePriceAth.timestamp,
              sharePriceAtl: sharePriceAtl.sharePrice,
              sharePriceAtlTimestamp: sharePriceAtl.timestamp,

              totalLiquidityAth: totalLiquidityAth.totalLiquidity,
              totalLiquidityAthTimestamp: totalLiquidityAth.timestamp,
              totalLiquidityAtl: totalLiquidityAtl.totalLiquidity,
              totalLiquidityAtlTimestamp: totalLiquidityAtl.timestamp,

              volume24hAth: volume24hAth.volume24h,
              volume24hAthTimestamp: volume24hAth.timestamp,
              volume24hAtl: volume24hAtl.volume24h,
              volume24hAtlTimestamp: volume24hAtl.timestamp,

              fees24hAth: fees24hAth.fees24h,
              fees24hAthTimestamp: fees24hAth.timestamp,
              fees24hAtl: fees24hAtl.fees24h,
              fees24hAtlTimestamp: fees24hAtl.timestamp,
            },
          }),
        );
      }
    }

    await prismaBulkExecuteOperations(updates);
  }
}
