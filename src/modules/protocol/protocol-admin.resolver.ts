import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { ProtocolDataService } from './protocol-data.service';
import { ProtocolService } from './protocol.service';

@Resolver()
@UseGuards(AdminGuard)
export class ProtocolAdminResolver {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolDataService: ProtocolDataService,
  ) {}

  @Query()
  getAllGaugePendingProtocolFees() {
    return this.protocolDataService.getAllGaugePendingProtocolFees();
  }
}