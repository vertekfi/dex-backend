import { Injectable, UseGuards } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { TokenChartDataService } from '../common/token/token-chart-data.service';
import { TokenSyncService } from '../common/token/token-sync.service';

@Injectable()
@UseGuards(AdminGuard)
export class TokenMutationResolver {
  constructor(
    private readonly chartDataService: TokenChartDataService,
    private readonly tokenSyncService: TokenSyncService,
  ) {}

  @Mutation()
  async tokenReloadTokenPrices() {
    await this.tokenSyncService.syncTokenPrices();
    return true;
  }

  @Mutation()
  async tokenSyncTokenDefinitions() {
    await this.tokenSyncService.syncTokenData();
    return 'success';
  }

  @Mutation()
  async tokenSyncTokenDynamicData() {
    await this.tokenSyncService.syncTokenDynamicData();
    return 'success';
  }

  @Mutation()
  async tokenInitChartData(@Args('tokenAddress') tokenAddress: string) {
    await this.chartDataService.initTokenChartData(tokenAddress);
    return 'success';
  }
}
