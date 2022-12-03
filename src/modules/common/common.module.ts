import { CacheModule, Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { CacheService } from './cache.service';
import { RpcProvider } from './web3/rpc.provider';
import { BlockService } from './web3/block.service';

@Global()
@Module({
  imports: [
    CacheModule.register<ClientOpts>({
      global: true,
      store: redisStore,
      // Store-specific configuration:
      host: process.env.REDIS_URL,
    }),
  ],
  providers: [ConfigService, CacheService, RpcProvider, BlockService],
  exports: [ConfigService, CacheModule, CacheService, RpcProvider, BlockService],
})
export class CommonModule {}
