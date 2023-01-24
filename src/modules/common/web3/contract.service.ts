import { Inject, Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { CONTRACT_MAP } from '../../data/contracts';
import { AccountWeb3 } from '../types';
import { VAULT_ABI } from './abi/VaultABI';
import * as LiqGaugeV5abi from '../../common/web3/abi/LiquidityGaugeV5.json';
import * as protoTokenAbi from '../../common/web3/abi/ProtocolToken.json';
import * as bptABI from './abi/BalancerPoolToken.json';
import { RPC } from './rpc.provider';
import { networkConfig } from 'src/modules/config/network-config';

@Injectable()
export class ContractService {
  readonly chainId: number;
  constructor(@Inject(RPC) private readonly rpc: AccountWeb3) {
    this.chainId = this.rpc.chainId;
  }

  getProtocolToken() {
    return new Contract(networkConfig.beets.address, protoTokenAbi, this.rpc.provider);
  }

  getMainPool() {
    return new Contract(
      networkConfig.balancer.votingEscrow.lockPoolAddress,
      bptABI,
      this.rpc.provider,
    );
  }

  getVault() {
    return new Contract(CONTRACT_MAP.VAULT[this.chainId], VAULT_ABI, this.rpc.provider);
  }

  getLiquidityGauge(address: string) {
    return new Contract(address, LiqGaugeV5abi, this.rpc.provider);
  }
}
