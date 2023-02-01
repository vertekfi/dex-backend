import { UseGuards } from '@nestjs/common';
import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminGuard } from 'src/modules/common/guards/admin.guard';
import { BlocksSubgraphService } from './blocks-subgraph.service';

@Resolver()
export class BlocksResolver {
  constructor(private readonly blocksSubgraphService: BlocksSubgraphService) {}

  @Query()
  async blocksGetAverageBlockTime() {
    return this.blocksSubgraphService.getAverageBlockTime();
  }

  @Query()
  async blocksGetBlocksPerSecond() {
    const avgBlockTime = await this.blocksSubgraphService.getAverageBlockTime();
    return 1 / avgBlockTime;
  }

  @Query()
  async blocksGetBlocksPerDay() {
    return this.blocksSubgraphService.getBlocksPerDay();
  }

  @Query()
  async blocksGetBlocksPerYear() {
    return this.blocksSubgraphService.getBlocksPerYear();
  }

  @Mutation()
  @UseGuards(AdminGuard)
  async cacheAverageBlockTime() {
    await this.blocksSubgraphService.cacheAverageBlockTime();
    return 'success';
  }
}
