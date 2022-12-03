import { ethers } from 'ethers';

export interface AccountWeb3 {
  wallet?: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
  chainId: number;
}
