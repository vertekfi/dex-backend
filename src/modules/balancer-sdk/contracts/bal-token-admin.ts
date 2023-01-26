import { formatUnits } from '@ethersproject/units';
import { Inject, Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import * as ba from '../../abis/BalancerTokenAdmin.json';

@Injectable()
export class BalTokenAdmin {
  readonly contract: Contract;

  constructor(@Inject(RPC) private account: AccountWeb3) {
    this.contract = new Contract(
      CONTRACT_MAP.BAL_TOKEN_ADMIN[this.account.chainId],
      ba.abi,
      this.account.provider,
    );
  }

  async getInflationRate() {
    const rate = await this.contract.getInflationRate();
    return formatUnits(rate, 18);
  }
}
