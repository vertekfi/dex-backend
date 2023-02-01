import { Query, Resolver } from '@nestjs/graphql';
import { ProtocolService } from './protocol.service';

@Resolver()
export class ProtocolResolver {
  constructor(private readonly protocolService: ProtocolService) {}

  @Query()
  protocolMetrics() {
    return this.protocolService.getMetrics();
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
