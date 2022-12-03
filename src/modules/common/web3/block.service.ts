import { Inject, Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { RPC } from './rpc.provider';
import { AccountWeb3 } from '../types';

const BSC_BLOCKS_PER_DAY = 28880;

@Injectable()
export class BlockService {
  constructor(@Inject(RPC) private account: AccountWeb3) {}

  // Not sure if this will need to actually be a subgraph
  // If we ever went multi chain then yes
  async getBlocksPerDay() {
    return BSC_BLOCKS_PER_DAY;
  }

  async getBlockNumber() {
    return await this.account.provider.getBlockNumber();
  }

  async getCurrentBlock(): Promise<ethers.providers.Block> {
    return await this.account.provider.getBlock(await this.account.provider.getBlockNumber());
  }

  async getBlockFrom24HoursAgo(): Promise<ethers.providers.Block> {
    const blockNumber = await this.account.provider.getBlockNumber();
    return await this.account.provider.getBlock(blockNumber - BSC_BLOCKS_PER_DAY);
  }
}
