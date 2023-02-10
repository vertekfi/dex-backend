import { Inject, Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { AccountWeb3 } from '../common/types';
import { getContractAddress } from '../common/web3/contract';
import { RPC } from '../common/web3/rpc.provider';

import * as feeCollectorAbi from '../abis/ProtocolFeesCollector.json';
import { ethNum } from '../utils/old-big-number';

@Injectable()
export class ProtocoFeesService {
  // TODO: Use ProtocolFeePercentagesProvider
  readonly feesCollector: Contract;

  constructor(@Inject(RPC) private readonly rpc: AccountWeb3) {
    this.feesCollector = new Contract(
      getContractAddress('ProtocolFeesCollector'),
      feeCollectorAbi,
      this.rpc.provider,
    );
  }

  async getProtocolSwapFee(): Promise<number> {
    return ethNum(await this.feesCollector.getSwapFeePercentage());
  }
}
