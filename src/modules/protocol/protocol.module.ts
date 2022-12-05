import { Module } from '@nestjs/common';
import { ProtocolResolver } from './protocol.resolver';
import { ProtocolService } from './protocol.service';

@Module({
  providers: [ProtocolService, ProtocolResolver],
  exports: [ProtocolService],
})
export class ProtocolModule {}
