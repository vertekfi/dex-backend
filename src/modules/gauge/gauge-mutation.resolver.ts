import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';

@Resolver()
export class GaugeMutationResolver {
  constructor() {}

  @Mutation()
  @UseGuards(AdminGuard)
  async syncGaugeData() {
    //
  }
}
