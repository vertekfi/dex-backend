import { Inject, Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { CONTRACT_MAP } from '../../../data/contracts';
import { getAddress } from '@ethersproject/address';
import { formatUnits } from '@ethersproject/units';
import { mapValues } from 'lodash';
import { AccountWeb3 } from 'src/modules/common/types';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import * as vhABI from '../../../abis/VEBalHelpers.json';

@Injectable()
export class VeBalHelpers {
  readonly contract: Contract;

  constructor(@Inject(RPC) private rpc: AccountWeb3) {
    this.contract = new Contract(
      CONTRACT_MAP.VE_BAL_HELPER[this.rpc.chainId],
      vhABI,
      this.rpc.provider,
    );
  }

  async getRelativeWeights(gaugeAddresses: string[]) {
    const multicaller = this.getMulticaller();
    for (const gaugeAddress of gaugeAddresses) {
      multicaller.call(
        getAddress(gaugeAddress),
        CONTRACT_MAP.VE_BAL_HELPER[this.rpc.chainId],
        'gauge_relative_weight',
        [getAddress(gaugeAddress)],
      );
    }
    const result = await multicaller.execute('VeBalHelpers:getRelativeWeights');

    const weights = mapValues(result, (weight) => {
      if (weight) {
        return formatUnits(weight, 18);
      }
      return '0';
    });
    return weights;
  }

  private getMulticaller(): Multicaller {
    return new Multicaller(this.rpc, vhABI);
  }
}
