import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async set(key: string, value: any, expirationSeconds: number) {
    await this.cacheManager.set(key, value, expirationSeconds);
  }

  async put(key: string, value: any, expirationSeconds: number) {
    await this.set(key, value, expirationSeconds);
  }

  async get<T>(key: string): Promise<T> {
    return await this.cacheManager.get(key);
  }

  async remove(key: string) {
    await this.cacheManager.del(key);
  }

  //   async reset() {
  //     await this.cacheManager.reset();
  //   }
}
