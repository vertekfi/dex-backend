import { Provider } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '../config.service';
import { AccountWeb3 } from '../types';

export const RPC = 'RPC';

export const RpcProvider: Provider = {
  provide: RPC,
  useFactory: (config: ConfigService): AccountWeb3 => {
    let rpc = '';
    const chainId = config.env.CHAIN_ID;
    if (chainId === 5) {
      rpc = process.env.GOERLI_RPC;
    } else if (chainId === 56) {
      rpc = process.env.BSC_RPC;
    } else {
      throw 'Chain id?';
    }

    console.log('Using RPC: ' + rpc);
    return {
      provider: new ethers.providers.JsonRpcProvider(rpc),
      chainId,
    };
  },
  inject: [ConfigService],
};
