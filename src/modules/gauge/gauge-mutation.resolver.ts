import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { GaugeSyncService } from './gauge-sync.service';

@Resolver()
@UseGuards(AdminGuard)
export class GaugeMutationResolver {
  constructor(private readonly gaugeSyncService: GaugeSyncService) {}

  @Mutation()
  async syncGaugeData() {
    await this.gaugeSyncService.syncGaugeData();
    return true;
  }

  @Mutation()
  async poolReloadStakingForAllPools() {
    await this.gaugeSyncService.reloadStakingForAllPools();
    return 'success';
  }
}
