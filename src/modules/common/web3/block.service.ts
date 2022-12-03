import { Inject, Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import * as moment from 'moment-timezone';

import { RPC } from './rpc.provider';
import { AccountWeb3 } from '../types';
import { networkConfig } from 'src/modules/config/network-config';
import { CacheService } from '../cache.service';
import { getDailyTimestampsForDays, getDailyTimestampsWithBuffer } from 'src/modules/utils/time';
import { OrderDirection } from 'src/modules/subgraphs/balancer/balancer-subgraph-types';
import { BlockFragment } from './types';

const BSC_BLOCKS_PER_DAY = 28880;
const DAILY_BLOCKS_CACHE_KEY = 'block-subgraph_daily-blocks';

@Injectable()
export class BlockService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly cache: CacheService,
  ) {}

  // Not sure if this will need to actually be a subgraph
  // If we ever went multi chain then yes
  async getBlocksPerDay() {
    return BSC_BLOCKS_PER_DAY;
  }

  async getBlockNumber() {
    return await this.rpc.provider.getBlockNumber();
  }

  async getCurrentBlock(): Promise<ethers.providers.Block> {
    return await this.rpc.provider.getBlock(await this.rpc.provider.getBlockNumber());
  }

  async getBlockFrom24HoursAgo(): Promise<ethers.providers.Block> {
    const blockNumber = await this.rpc.provider.getBlockNumber();
    return await this.rpc.provider.getBlock(blockNumber - BSC_BLOCKS_PER_DAY);
  }

  async getDailyBlocks(numDays: number): Promise<BlockFragment[]> {
    // const today = moment.tz('GMT').format('YYYY-MM-DD');
    // const maxDays = moment
    //   .tz('GMT')
    //   .diff(moment.tz(networkConfig.subgraphs.startDate, 'GMT'), 'days');
    // numDays = maxDays < numDays ? maxDays : numDays;

    // const timestampsWithBuffer = getDailyTimestampsWithBuffer(numDays);

    // const timestamps = getDailyTimestampsForDays(numDays);
    // const blocks: BlockFragment[] = [];
    // const args = {
    //   orderDirection: OrderDirection.Desc,
    //   orderBy: 'timestamp',
    //   where: {
    //     timestamp_in: timestampsWithBuffer.map((timestamp) => `${timestamp}`),
    //   },
    // };

    // const cacheResult: BlockFragment[] = await this.cache.get(
    //   `${DAILY_BLOCKS_CACHE_KEY}:${today}:${numDays}`,
    // );

    // if (cacheResult) {
    //   return cacheResult;
    // }

    // const allBlocks = await this.getAllBlocks(args);

    // for (const timestamp of timestamps) {
    //   const closest = allBlocks.reduce((a, b) => {
    //     return Math.abs(parseInt(b.timestamp) - timestamp) <
    //       Math.abs(parseInt(a.timestamp) - timestamp)
    //       ? b
    //       : a;
    //   });

    //   //filter out any matches that are further than 5 minutes away.e
    //   if (Math.abs(timestamp - parseInt(closest.timestamp)) < fiveMinutesInSeconds) {
    //     blocks.push({ ...closest, timestamp: `${timestamp}` });
    //   }
    // }

    // await this.cache.put(`${DAILY_BLOCKS_CACHE_KEY}:${today}:${numDays}`, blocks, oneDayInMinutes);

    // return blocks;

    return [];
  }
}
