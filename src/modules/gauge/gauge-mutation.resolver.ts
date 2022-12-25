import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { GaugeSyncService } from './gauge-sync.service';

@Resolver()
export class GaugeMutationResolver {
  constructor(private readonly gaugeSyncService: GaugeSyncService) {}

  @Mutation()
  @UseGuards(AdminGuard)
  async syncGaugeData() {
    await this.gaugeSyncService.syncGaugeData();

    return true;
  }
}
