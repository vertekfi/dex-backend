import { Module } from '@nestjs/common';
import { GaugeModule } from '../gauge/gauge.module';
import { PoolModule } from '../pool/pool.module';
import { ProtocolModule } from '../protocol/protocol.module';
import { UserModule } from '../user/user.module';
import { ScheduledJobService } from './scheduled-job.service';

@Module({
  imports: [PoolModule, UserModule, ProtocolModule, GaugeModule],
  providers: [ScheduledJobService],
  exports: [ScheduledJobService],
})
export class WorkerModule {}
