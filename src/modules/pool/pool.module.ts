import { Module } from '@nestjs/common';
import { PoolResolver } from './pool.resolver';

@Module({
  imports: [],
  providers: [PoolResolver],
  exports: [PoolResolver],
})
export class PoolModule {}
