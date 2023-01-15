import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken, PrismaTokenCurrentPrice } from '@prisma/client';
import * as _ from 'lodash';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '../config.service';
import { networkConfig } from '../../config/network-config';
import { TokenDefinition } from './types';
import { RPC } from '../web3/rpc.provider';
import { AccountWeb3 } from '../types';
import { CacheDecorator } from '../decorators/cache.decorator';
import { FIVE_MINUTES_SECONDS } from 'src/modules/utils/time';

const ALL_TOKENS_CACHE_KEY = 'tokens:all';

@Injectable()
export class TokenService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @CacheDecorator(ALL_TOKENS_CACHE_KEY, FIVE_MINUTES_SECONDS)
  async getTokens(addresses?: string[]): Promise<PrismaToken[]> {
    const tokens = await this.prisma.prismaToken.findMany({});
    if (addresses) {
      return tokens.filter((token) => addresses.includes(token.address));
    }
    return tokens;
  }

  async getWhiteListedCurrentTokenPrices(): Promise<PrismaTokenCurrentPrice[]> {
    const tokenPrices = await this.prisma.prismaTokenCurrentPrice.findMany({
      orderBy: { timestamp: 'desc' },
      distinct: ['tokenAddress'],
      where: {
        token: {
          types: { some: { type: 'WHITE_LISTED' } },
        },
      },
    });

    const wethPrice = tokenPrices.find(
      (tokenPrice) => tokenPrice.tokenAddress === networkConfig.weth.address,
    );

    if (wethPrice) {
      tokenPrices.push({
        ...wethPrice,
        tokenAddress: networkConfig.eth.address,
      });
    }

    return tokenPrices.filter((tokenPrice) => tokenPrice.price > 0.000000001);
  }

  async getTokenDefinitions(): Promise<TokenDefinition[]> {
    const tokens = await this.prisma.prismaToken.findMany({
      where: { chainId: this.rpc.chainId, types: { some: { type: 'WHITE_LISTED' } } },
      include: { types: true },
      orderBy: { priority: 'desc' },
    });

    const weth = tokens.find((token) => token.address === networkConfig.weth.address);

    if (weth) {
      tokens.push({
        ...weth,
        name: networkConfig.eth.name,
        address: networkConfig.eth.address,
        symbol: networkConfig.eth.symbol,
      });
    }

    return tokens.map((token) => ({
      ...token,
      chainId: this.config.env.CHAIN_ID,
      //TODO: some linear wrapped tokens are tradable. ie: xBOO
      tradable: !token.types.find(
        (type) =>
          type.type === 'PHANTOM_BPT' ||
          type.type === 'BPT' ||
          type.type === 'LINEAR_WRAPPED_TOKEN',
      ),
    }));
  }

  async getToken(address: string) {
    return this.prisma.prismaToken.findUnique({
      where: {
        address: address.toLowerCase(),
      },
      include: {
        currentPrice: true,
      },
    });
  }
}
