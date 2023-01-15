import { Injectable, UseGuards } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { TokenService } from '../common/token/token.service';

@Injectable()
@UseGuards(AdminGuard)
export class TokenMutationResolver {
  constructor(private readonly tokenService: TokenService) {}

  @Mutation()
  async tokenReloadTokenPrices() {
    await this.tokenService.loadTokenPrices();
    return true;
  }

  @Mutation()
  async tokenSyncTokenDefinitions() {
    await this.tokenService.syncTokenData();
    return 'success';
  }

  @Mutation()
  async tokenSyncTokenDynamicData() {
    await this.tokenService.syncTokenDynamicData();
    return 'success';
  }

  @Mutation()
  async tokenInitChartData() {
    await this.tokenService.syncTokenDynamicData();
    return 'success';
  }
}
