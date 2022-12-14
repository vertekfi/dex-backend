import { Provider } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '../config.service';
import { AccountWeb3 } from '../types';

export const RPC = 'RPC';

export const RpcProvider: Provider = {
  provide: RPC,
  useFactory: async (config: ConfigService): Promise<AccountWeb3> => {
    let rpcUrl = '';
    const chainId = config.env.CHAIN_ID;
    if (chainId === 5) {
      rpcUrl = process.env.GOERLI_RPC;
    } else if (chainId === 56) {
      rpcUrl = process.env.BSC_RPC;
    } else {
      throw 'Chain id?';
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    await provider.ready;
    console.log('Using RPC: ' + rpcUrl);
    return {
      provider,
      chainId,
      rpcUrl,
    };
  },
  inject: [ConfigService],
};
