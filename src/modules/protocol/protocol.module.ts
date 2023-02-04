import { Global, Module } from '@nestjs/common';
import { ProtocolAdminResolver } from './protocol-admin.resolver';
import { ProtocolDataService } from './protocol-data.service';
import { ProtocolResolver } from './protocol.resolver';
import { ProtocolService } from './protocol.service';

@Global()
@Module({
  providers: [ProtocolService, ProtocolResolver, ProtocolDataService, ProtocolAdminResolver],
  exports: [ProtocolService, ProtocolResolver, ProtocolDataService, ProtocolAdminResolver],
})
export class ProtocolModule {}
