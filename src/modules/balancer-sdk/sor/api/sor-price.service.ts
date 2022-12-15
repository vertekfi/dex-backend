import { Inject, Injectable } from '@nestjs/common';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { TokenPriceService } from '../types';

@Injectable()
export class SorPriceService implements TokenPriceService {
  private get platformId(): string {
    switch (this.rpc.chainId) {
      case 5:
        return 'bsc';
      case 56:
        return 'bsc';
    }

    return 'binancecoin';
  }

  private get nativeAssetId(): string {
    switch (this.rpc.chainId) {
      case 5:
        return 'binancecoin';
      case 56:
        return 'binancecoin';
    }

    return '';
  }

  constructor(@Inject(RPC) private readonly rpc: AccountWeb3) {}

  async getNativeAssetPriceInToken(tokenAddress: string): Promise<string> {
    const ethPerToken = await this.getTokenPriceInNativeAsset(tokenAddress);

    // We get the price of token in terms of ETH
    // We want the price of 1 ETH in terms of the token base units
    return `${1 / parseFloat(ethPerToken)}`;
  }

  /**
   * @dev Assumes that the native asset has 18 decimals
   * @param tokenAddress - the address of the token contract
   * @returns the price of 1 ETH in terms of the token base units
   */
  async getTokenPriceInNativeAsset(tokenAddress: string): Promise<string> {
    const endpoint = `https://api.coingecko.com/api/v3/simple/token_price/${this.platformId}?contract_addresses=${tokenAddress}&vs_currencies=${this.nativeAssetId}`;

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data[tokenAddress.toLowerCase()][this.nativeAssetId] === undefined) {
      throw Error('No price returned from Coingecko');
    }

    return data[tokenAddress.toLowerCase()][this.nativeAssetId];
  }
}
