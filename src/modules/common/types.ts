import { ethers } from 'ethers';

export type AmountHumanReadable = string;
export interface TokenAmountHumanReadable {
  address: string;
  amount: AmountHumanReadable;
}

export interface AccountWeb3 {
  wallet?: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
  chainId: number;
}
