import { nestApp } from 'src/main';
import { CacheService } from '../cache.service';

export function CacheDecorator(cacheKey: string, ttlSeconds: number): any {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalAsyncFunction = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      console.log('CacheDecorator:' + cacheKey);
      if (!nestApp) return;

      const cacheService = nestApp.get(CacheService);
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log('CacheDecorator: returning data from cache');
        return cached;
      }

      console.log('CacheDecorator: cache data expired. Updating cache');
      // Cache data expired
      const data = await originalAsyncFunction.apply(this, args);
      await cacheService.put(cacheKey, data, ttlSeconds);
      console.log('Cache complete');
      return data;
    };

    return descriptor;
  };
}
