import { GraphQLClient } from 'graphql-request';
import {
  Block_OrderBy,
  BlockFragment,
  BlocksQuery,
  BlocksQueryVariables,
  getSdk,
  OrderDirection,
} from './generated/blocks-subgraph-types';
import { subgraphLoadAll } from '../utils';
import * as moment from 'moment-timezone';
import { networkConfig } from '../../config/network-config';
import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/modules/common/cache.service';
import {
  FIVE_MINUTES_SECONDS,
  getDailyTimestampsForDays,
  getDailyTimestampsWithBuffer,
  ONE_DAY_MINUTES,
  SECONDS_PER_DAY,
  SECONDS_PER_YEAR,
} from 'src/modules/utils/time';

const DAILY_BLOCKS_CACHE_KEY = 'block-subgraph_daily-blocks';
const AVG_BLOCK_TIME_CACHE_PREFIX = 'block-subgraph:average-block-time';
const BLOCK_24H_AGO = 'block-subgraph:block-24h-ago';

@Injectable()
export class BlocksSubgraphService {
  private readonly client: GraphQLClient;

  constructor(private readonly cache: CacheService) {
    this.client = new GraphQLClient(networkConfig.subgraphs.blocks);
  }

  async getAverageBlockTime(): Promise<number> {
    const avgBlockTime: string = await this.cache.get(AVG_BLOCK_TIME_CACHE_PREFIX);

    if (avgBlockTime !== null) {
      return parseFloat(avgBlockTime);
    }

    return this.cacheAverageBlockTime();
  }

  async cacheAverageBlockTime(): Promise<number> {
    let blocks: BlockFragment[] = [];

    for (let i = 0; i < 6; i++) {
      const result = await this.sdk.Blocks({
        first: 1000,
        skip: i * 1000,
        orderBy: Block_OrderBy.Number,
        orderDirection: OrderDirection.Desc,
      });

      if (result.blocks.length === 0) {
        break;
      }

      blocks = [...blocks, ...result.blocks];
    }

    if (blocks.length === 0) {
      console.error(
        'Unable to retrieve the blocks, returning a default value of 3 second per block',
      );
      return 3;
    }

    const timeDifference =
      parseInt(blocks[0].timestamp) - parseInt(blocks[blocks.length - 1].timestamp);
    const averageBlockTime = timeDifference / blocks.length;

    await this.cache.put(AVG_BLOCK_TIME_CACHE_PREFIX, `${averageBlockTime}`, FIVE_MINUTES_SECONDS);

    return averageBlockTime;
  }

  async getBlocks(args: BlocksQueryVariables): Promise<BlocksQuery> {
    return this.sdk.Blocks(args);
  }

  async getLatestBlock(): Promise<number> {
    const { blocks } = await this.getBlocks({
      first: 1,
      orderBy: Block_OrderBy.Number,
      orderDirection: OrderDirection.Desc,
    });

    return blocks.length > 0 ? parseInt(blocks[0].number) : 0;
  }

  async getAllBlocks(args: BlocksQueryVariables): Promise<BlockFragment[]> {
    return subgraphLoadAll<BlockFragment>(this.sdk.Blocks, 'blocks', args);
  }

  async getBlockFrom24HoursAgo(): Promise<BlockFragment> {
    const cached = this.cache.get<BlockFragment>(BLOCK_24H_AGO);

    if (cached) {
      return cached;
    }

    return this.cacheBlockFrom24HoursAgo();
  }

  async cacheBlockFrom24HoursAgo(): Promise<BlockFragment> {
    const blockTime = networkConfig.avgBlockSpeed;

    const args: BlocksQueryVariables = {
      orderDirection: OrderDirection.Desc,
      orderBy: Block_OrderBy.Timestamp,
      where: {
        timestamp_gte: `${moment
          .tz('GMT')
          .subtract(1, 'day')
          .subtract(10 * blockTime, 'seconds')
          .unix()}`,
        timestamp_lte: `${moment
          .tz('GMT')
          .subtract(1, 'day')
          .add(10 * blockTime, 'seconds')
          .unix()}`,
      },
    };

    const allBlocks = await this.getAllBlocks(args);

    if (allBlocks.length > 0) {
      this.cache.put(BLOCK_24H_AGO, allBlocks[0], 15 * 1000);
    }

    return allBlocks[0];
  }

  async getBlockForTimestamp(timestamp: number): Promise<BlockFragment> {
    const blockTime = networkConfig.avgBlockSpeed;

    const args: BlocksQueryVariables = {
      orderDirection: OrderDirection.Desc,
      orderBy: Block_OrderBy.Timestamp,
      where: {
        timestamp_gt: `${timestamp - 4 * blockTime}`,
        timestamp_lt: `${timestamp + 4 * blockTime}`,
      },
    };

    const allBlocks = await this.getAllBlocks(args);

    return allBlocks[0];
  }

  async getDailyBlocks(numDays: number): Promise<BlockFragment[]> {
    const today = moment.tz('GMT').format('YYYY-MM-DD');
    const maxDays = moment
      .tz('GMT')
      .diff(moment.tz(networkConfig.subgraphs.startDate, 'GMT'), 'days');
    // numDays = maxDays < numDays ? maxDays : numDays;

    const timestampsWithBuffer = getDailyTimestampsWithBuffer(numDays);

    const timestamps = getDailyTimestampsForDays(numDays);
    const blocks: BlockFragment[] = [];
    const args = {
      orderDirection: OrderDirection.Desc,
      orderBy: Block_OrderBy.Timestamp,
      where: {
        timestamp_in: timestampsWithBuffer.map((timestamp) => `${timestamp}`),
      },
    };

    const cacheResult: BlockFragment[] = await this.cache.get(
      `${DAILY_BLOCKS_CACHE_KEY}:${today}:${numDays}`,
    );

    if (cacheResult) {
      return cacheResult;
    }

    const allBlocks = await this.getAllBlocks(args);

    for (const timestamp of timestamps) {
      const closest = allBlocks.reduce((a, b) => {
        return Math.abs(parseInt(b.timestamp) - timestamp) <
          Math.abs(parseInt(a.timestamp) - timestamp)
          ? b
          : a;
      });

      // filter out any matches that are further than 5 minutes away.e
      if (Math.abs(timestamp - parseInt(closest.timestamp)) < FIVE_MINUTES_SECONDS) {
        blocks.push({ ...closest, timestamp: `${timestamp}` });
      }
    }

    await this.cache.put(`${DAILY_BLOCKS_CACHE_KEY}:${today}:${numDays}`, blocks, ONE_DAY_MINUTES);

    return blocks;
  }

  async getBlocksPerDay() {
    const blockTime = await this.getAverageBlockTime();

    return SECONDS_PER_DAY / blockTime;
  }

  async getBlocksPerYear() {
    const blockTime = await this.getAverageBlockTime();

    return SECONDS_PER_YEAR / blockTime;
  }

  get sdk() {
    return getSdk(this.client);
  }
}
