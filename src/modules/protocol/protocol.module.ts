import { Global, Module } from '@nestjs/common';
import { ProtocolAdminResolver } from './protocol-admin.resolver';
import { ProtocolDataService } from './protocol-data.service';
import { ProtocoFeesService } from './protocol-fees.service';
import { ProtocolResolver } from './protocol.resolver';
import { ProtocolService } from './protocol.service';

@Global()
@Module({
  providers: [
    ProtocolService,
    ProtocolResolver,
    ProtocolDataService,
    ProtocolAdminResolver,
    ProtocoFeesService,
  ],
  exports: [
    ProtocolService,
    ProtocolResolver,
    ProtocolDataService,
    ProtocolAdminResolver,
    ProtocoFeesService,
  ],
})
export class ProtocolModule {}
