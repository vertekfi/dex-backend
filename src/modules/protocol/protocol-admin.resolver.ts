import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AdminGuard } from '../common/guards/admin.guard';
import { ProtocoFeesService } from './protocol-fees.service';
import { ProtocolService } from './protocol.service';

@Resolver()
@UseGuards(AdminGuard)
export class ProtocolAdminResolver {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolDataService: ProtocoFeesService,
  ) {}

  @Query()
  async adminGetAllGaugePendingProtocolFees() {
    return this.protocolDataService.getAllGaugePendingProtocolFees(
      await this.protocolDataService.getPoolsAndBptsWithPrice(),
    );
  }

  @Query()
  async adminGetFeeCollectorBalances() {
    return this.protocolDataService.getFeeCollectorPendingInfo(
      await this.protocolDataService.getPoolsAndBptsWithPrice(),
    );
  }

  @Query()
  async adminGetAllPendingFeeData(@Args('onlyWithBalances') onlyWithBalances: boolean) {
    return this.protocolDataService.getAllPendingFeeData(onlyWithBalances);
  }

  @Query()
  async get24HourGaugeFees(@Args('hoursInPast') hoursInPast: number) {
    return this.protocolDataService.getGaugeFees(hoursInPast);
  }
}
