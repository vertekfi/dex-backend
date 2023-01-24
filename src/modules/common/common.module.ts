import { CacheModule, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { CacheService } from './cache.service';
import { RpcProvider } from './web3/rpc.provider';
import { BlockService } from './web3/block.service';
import { AdminGuard } from './guards/admin.guard';
import { PoolSwapService } from './pool/pool-swap.service';
import { ContractService } from './web3/contract.service';
import { PoolOnChainDataService } from './pool/pool-on-chain-data.service';
import { CoingeckoService } from './token/pricing/coingecko.service';
import { DexScreenerService } from './token/pricing/dex-screener.service';
import { TokenPriceServicesProvider } from './token/providers/price-services.provider';
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
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
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
