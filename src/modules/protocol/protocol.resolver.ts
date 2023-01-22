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
  async blocksGetBlocksPerDay() {
    return 28800;
  }

  @Query()
  async blocksGetAverageBlockTime() {
    return 3;
  }

  @Query()
  async contentGetNewsItems() {
    return [];
  }

  @Query()
  async getProtocolTokenList() {
    return this.protocolService.getProtocolTokenList();
  }
}
