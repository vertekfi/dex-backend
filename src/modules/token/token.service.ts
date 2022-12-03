import { Injectable } from '@nestjs/common';
import { PrismaTokenCurrentPrice } from '@prisma/client';
import { CacheService } from '../common/cache.service';
import { TokenPriceService } from './lib/token-price.service';

const TOKEN_PRICES_CACHE_KEY = 'token:prices:current';
const TOKEN_PRICES_24H_AGO_CACHE_KEY = 'token:prices:24h-ago';
const ALL_TOKENS_CACHE_KEY = 'tokens:all';

@Injectable()
export class TokenService {
  constructor(private cache: CacheService, private tokenPriceService: TokenPriceService) {}

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
}
