import { CacheModule, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigService } from './config.service';
import { CacheService } from './cache.service';
import { RpcProvider } from './web3/rpc.provider';
import { BlockService } from './web3/block.service';
import { AdminGuard } from './guards/admin.guard';
import { PoolSwapService } from './pool/pool-swap.service';
import { TokenPriceService } from './token/token-price.service';
import { TokenService } from './token/token.service';
import { TokenDataLoaderService } from './token/token-data-loader.service';
import { ContractService } from './web3/contract.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => {
        return {
          global: true,
          // store: redisStore,
          // // Store-specific configuration:
          // host: process.env.REDIS_URL,
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
    ConfigService,
    CacheService,
    RpcProvider,
    BlockService,
    PoolSwapService,
    TokenPriceService,
    TokenService,
    TokenDataLoaderService,
    ContractService,
  ],
  exports: [
    ConfigService,
    CacheModule,
    CacheService,
    RpcProvider,
    BlockService,
    PoolSwapService,
    TokenPriceService,
    TokenService,
    TokenDataLoaderService,
    ContractService,
  ],
})
export class CommonModule {}
