import { Global, Module } from '@nestjs/common';
import { ProtocolResolver } from './protocol.resolver';
import { ProtocolService } from './protocol.service';

@Global()
@Module({
  providers: [ProtocolService, ProtocolResolver],
  exports: [ProtocolService, ProtocolResolver],
})
export class ProtocolModule {}
