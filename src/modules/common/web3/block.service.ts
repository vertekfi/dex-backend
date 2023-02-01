import { Inject, Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

import { RPC } from './rpc.provider';
import { AccountWeb3 } from '../types';
import { BLOCKS_PER_DAY } from 'src/modules/utils/blocks';

@Injectable()
export class BlockService {
  constructor(@Inject(RPC) private readonly rpc: AccountWeb3) {}

  getBlocksPerDay() {
    return BLOCKS_PER_DAY[this.rpc.chainId];
  }

  async getBlockNumber() {
    return await this.rpc.provider.getBlockNumber();
  }

  async getCurrentBlock(): Promise<ethers.providers.Block> {
    return await this.rpc.provider.getBlock(await this.rpc.provider.getBlockNumber());
  }

  async getBlockFrom24HoursAgo(): Promise<ethers.providers.Block> {
    const blockNumber = await this.rpc.provider.getBlockNumber();
    return await this.rpc.provider.getBlock(blockNumber - this.getBlocksPerDay());
  }
}
