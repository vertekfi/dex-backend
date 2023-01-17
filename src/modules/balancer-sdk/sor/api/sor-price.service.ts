import { Inject, Injectable } from '@nestjs/common';
import { parseUnits } from 'ethers/lib/utils';
import { PrismaService } from 'nestjs-prisma';
import { CoingeckoService } from 'src/modules/common/token/pricing/coingecko.service';
import { getDexPriceFromPair } from 'src/modules/common/token/pricing/dexscreener';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { TokenDefinition } from 'src/modules/common/token/types';
import { TokenPriceService } from '../types';

const priceCache: {
  [address: string]: {
    lastTimestamp: number;
    price: string;
  };
} = {};

const ttl = 1000 * 30;

@Injectable()
export class SorPriceService implements TokenPriceService {
  private get platformId(): string {
    switch (this.rpc.chainId) {
      case 5:
        return 'binance-smart-chain';
      case 56:
        return 'binance-smart-chain';
    }

    return 'binance-smart-chain';
  }

  private get nativeAssetId(): string {
    return 'usd';
  }

  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly coingecko: CoingeckoService,
  ) {}

  async getTokenPrice(token: TokenDefinition): Promise<string> {
    const address = token.address.toLowerCase();
    const cached = priceCache[address];

    const now = Date.now();
    if (!cached || now - cached.lastTimestamp > ttl) {
      const price = await this.coingecko.getTokenPrice(token as unknown as TokenDefinition);

      priceCache[address] = {
        lastTimestamp: Date.now(),
        price: String(price),
      };

      return priceCache[address].price;
    }

    return cached.price;
  }

  async getNativeAssetPriceInToken(tokenAddress: string): Promise<string> {
    try {
      const token = await this.prisma.prismaToken.findUniqueOrThrow({
        where: {
          address: tokenAddress,
        },
      });

      if (token.useDexscreener) {
        const wbnbPair = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';
        const nativeInfo = await getDexPriceFromPair('bsc', wbnbPair);
        console.log(nativeInfo);
        const info = await getDexPriceFromPair('bsc', token.dexscreenPairAddress);
        console.log(info);
        return parseUnits(String(nativeInfo.priceNum / info.priceNum)).toString();
      }
    } catch (error) {
      console.log('Error getting price from coingecko');
    }
  }

  /**
   * @dev Assumes that the native asset has 18 decimals
   * @param tokenAddress - the address of the token contract
   * @returns the price of 1 ETH in terms of the token base units
   */
  private async getTokenPriceInNativeAsset(tokenAddress: string): Promise<string> {
    try {
      const token = await this.prisma.prismaToken.findUniqueOrThrow({
        where: {
          address: tokenAddress,
        },
      });

      if (token.useDexscreener) {
        const wbnbPair = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';
        const nativeInfo = await getDexPriceFromPair('bsc', wbnbPair);
        console.log(nativeInfo);
        const info = await getDexPriceFromPair('bsc', token.dexscreenPairAddress);
        console.log(info);
        return String(info.priceNum);
      } else {
        const endpoint = `https://api.coingecko.com/api/v3/simple/token_price/${this.platformId}?contract_addresses=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&vs_currencies=${this.nativeAssetId}`;

        const response = await fetch(endpoint, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        console.log('Coingecko:');
        console.log(data);
        if (data[tokenAddress.toLowerCase()][this.nativeAssetId] === undefined) {
          throw Error('No price returned from Coingecko');
        }

        return data[tokenAddress.toLowerCase()][this.nativeAssetId];
      }
    } catch (error) {
      console.log('Error getting price from coingecko');
    }
  }
}
