import { Injectable } from '@nestjs/common';
import { PrismaToken, PrismaTokenCurrentPrice } from '@prisma/client';
import * as _ from 'lodash';
import { PrismaService } from 'nestjs-prisma';
import { CacheService } from '../cache.service';
import { ConfigService } from '../config.service';
import { networkConfig } from '../../config/network-config';
import { TokenDataLoaderService } from './token-data-loader.service';
import { getPriceHandlers } from '../../token/lib/token-price-handlers';
import { TokenPriceService } from './token-price.service';
import { TokenDefinition } from '../../token/token-types';

const TOKEN_PRICES_CACHE_KEY = 'token:prices:current';
const TOKEN_PRICES_24H_AGO_CACHE_KEY = 'token:prices:24h-ago';
const ALL_TOKENS_CACHE_KEY = 'tokens:all';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly tokenPriceService: TokenPriceService,
    private readonly config: ConfigService,
    private readonly tokenData: TokenDataLoaderService,
  ) {}

  async getProtocolTokenPrice() {
    // return getDexPriceFromPair('bsc', '0x7a09ddf458fda6e324a97d1a8e4304856fb3e702000200000000000000000000-0x0dDef12012eD645f12AEb1B845Cb5ad61C7423F5-0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
    return '9';
  }

  async getTokens(addresses?: string[]): Promise<PrismaToken[]> {
    let tokens: PrismaToken[] | null = await this.cache.get<PrismaToken[]>(ALL_TOKENS_CACHE_KEY);
    if (!tokens) {
      tokens = await this.prisma.prismaToken.findMany({});
      this.cache.put(ALL_TOKENS_CACHE_KEY, tokens, 5 * 60 * 1000);
    }
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
      where: { types: { some: { type: 'WHITE_LISTED' } } },
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

  async getTokenPrices(): Promise<PrismaTokenCurrentPrice[]> {
    let tokenPrices = await this.cache.get<PrismaTokenCurrentPrice[]>(TOKEN_PRICES_CACHE_KEY);
    if (!tokenPrices) {
      tokenPrices = await this.tokenPriceService.getCurrentTokenPrices();
      await this.cache.put(TOKEN_PRICES_CACHE_KEY, tokenPrices, 30 * 1000);
    }
    return tokenPrices;
  }

  getPriceForToken(tokenPrices: PrismaTokenCurrentPrice[], tokenAddress: string): number {
    return this.tokenPriceService.getPriceForToken(tokenPrices, tokenAddress);
  }

  async getTokenPriceFrom24hAgo(): Promise<PrismaTokenCurrentPrice[]> {
    let tokenPrices24hAgo = await this.cache.get<PrismaTokenCurrentPrice[]>(
      TOKEN_PRICES_24H_AGO_CACHE_KEY,
    );
    if (!tokenPrices24hAgo) {
      tokenPrices24hAgo = await this.tokenPriceService.getTokenPriceFrom24hAgo();
      this.cache.put(TOKEN_PRICES_24H_AGO_CACHE_KEY, tokenPrices24hAgo, 60 * 5 * 1000);
    }
    return tokenPrices24hAgo;
  }

  async loadTokenPrices(): Promise<void> {
    return this.tokenPriceService.updateTokenPrices(getPriceHandlers(this.prisma));
  }

  async syncTokenData() {
    await this.tokenData.syncTokenData();
  }

  async syncTokenDynamicData() {
    const tokens = await this.prisma.prismaToken.findMany({
      include: {
        types: true,
        // fetch the last price stored
        prices: { take: 1, orderBy: { timestamp: 'desc' } },
      },
    });

    let tokensWithTypes = _.sortBy(tokens, (token) => token.prices[0]?.timestamp || 0).map(
      (token) => ({
        ...token,
        types: token.types.map((type) => type.type),
      }),
    );

    // This syncs up 24 hour price changes and such. Dexscreener api does not provide this, so would need to create myself
  }
}
