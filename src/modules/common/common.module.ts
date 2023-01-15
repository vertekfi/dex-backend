import { CacheModule, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigService } from './config.service';
import { CacheService } from './cache.service';
import { RpcProvider } from './web3/rpc.provider';
import { BlockService } from './web3/block.service';
import { AdminGuard } from './guards/admin.guard';
import { PoolSwapService } from './pool/pool-swap.service';
import { ContractService } from './web3/contract.service';
import { PoolOnChainDataService } from './pool/pool-on-chain-data.service';
import { CoingeckoService } from './token/pricing/coingecko.service';
import { DexScreenerService } from './token/pricing/dex-screener.service';
import { TokenPriceServicesProvider } from './token/pricing/price-services.provider';
import { TokenChartDataService } from './token/token-chart-data.service';
import { TokenService } from './token/token.service';
import { TokenPriceService } from './token/pricing/token-price.service';
import { TokenSyncService } from './token/token-sync.service';

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
    ContractService,
    PoolOnChainDataService,

    // Tokens
    TokenPriceService,
    TokenService,
    CoingeckoService,
    TokenChartDataService,
    DexScreenerService,
    TokenPriceServicesProvider,
    TokenSyncService,
  ],
  exports: [
    ConfigService,
    CacheModule,
    CacheService,
    RpcProvider,
    BlockService,
    PoolSwapService,
    ContractService,
    PoolOnChainDataService,

    // Tokens
    TokenPriceService,
    TokenService,
    CoingeckoService,
    TokenChartDataService,
    DexScreenerService,
    TokenPriceServicesProvider,
    TokenSyncService,
  ],
})
export class CommonModule {}
