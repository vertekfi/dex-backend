import { Global, Module } from '@nestjs/common';
import { ProtocolAdminResolver } from './protocol-admin.resolver';
import { ProtocoFeesService } from './protocol-fees.service';
import { ProtocolResolver } from './protocol.resolver';
import { ProtocolService } from './protocol.service';

@Global()
@Module({
  providers: [ProtocolService, ProtocolResolver, ProtocolAdminResolver, ProtocoFeesService],
  exports: [ProtocolService, ProtocolResolver, ProtocolAdminResolver, ProtocoFeesService],
})
export class ProtocolModule {}
