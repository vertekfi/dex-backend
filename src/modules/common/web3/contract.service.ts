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
  5: '0xaFbf7fB9Fa206089041218dF93c8B3A1Bb9F4497',
  56: '',
};

export const MAIN_POOL = {
  5: '0x3e9f7B85E8Ee2107aeca28677b6B416fA60b6200',
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
