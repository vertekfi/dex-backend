import { Module } from '@nestjs/common';
import { PoolModule } from '../pool/pool.module';
import { ProtocolModule } from '../protocol/protocol.module';
import { UserModule } from '../user/user.module';
import { ScheduledJobService } from './scheduled-job.service';

@Module({
  imports: [PoolModule, UserModule, ProtocolModule],
  providers: [ScheduledJobService],
  exports: [ScheduledJobService],
})
export class WorkerModule {}
