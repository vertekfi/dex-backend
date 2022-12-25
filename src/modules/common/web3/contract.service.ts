import { Inject, Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { CONTRACT_MAP } from '../../data/contracts';
import { AccountWeb3 } from '../types';
import { VAULT_ABI } from './abi/VaultABI';
import * as LiqGaugeV5abi from '../../common/web3/abi/LiquidityGaugeV5.json';
import * as protoTokenAbi from '../../common/web3/abi/ProtocolToken.json';
import * as bptABI from './abi/BalancerPoolToken.json';
import { RPC } from './rpc.provider';

export const PROTOCOL_TOKEN = {
  5: '0xb269A278E427478712e2AF0eBa728021157A2114',
  56: '',
};

export const MAIN_POOL = {
  5: '0xA5D4313D76020D51446634366666C6c1F051EfD8',
  56: '',
};

@Injectable()
export class ContractService {
  readonly chainId: number;
  constructor(@Inject(RPC) private readonly rpc: AccountWeb3) {
    this.chainId = this.rpc.chainId;
  }

  getProtocolToken() {
    return new Contract(PROTOCOL_TOKEN[this.rpc.chainId], protoTokenAbi, this.rpc.provider);
  }

  getMainPool() {
    return new Contract(MAIN_POOL[this.rpc.chainId], bptABI, this.rpc.provider);
  }

  getVault() {
    return new Contract(CONTRACT_MAP.VAULT[this.chainId], VAULT_ABI, this.rpc.provider);
  }

  getLiquidityGauge(address: string) {
    return new Contract(address, LiqGaugeV5abi, this.rpc.provider);
  }
}
