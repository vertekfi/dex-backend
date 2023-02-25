import { Query, Resolver } from '@nestjs/graphql';
import { ProtocoFeesService } from './protocol-fees.service';
import { ProtocolService } from './protocol.service';

@Resolver()
export class ProtocolResolver {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolFeeService: ProtocoFeesService,
  ) {}

  @Query()
  protocolMetrics() {
    return this.protocolFeeService.getMetrics();
  }

  @Query()
  async contentGetNewsItems() {
    return [];
  }

  @Query()
  async getProtocolTokenList() {
    return this.protocolService.getProtocolTokenList();
  }

  @Query()
  async getProtocolPoolData() {
    return this.protocolService.getProtocolConfigDataForChain();
  }
}
