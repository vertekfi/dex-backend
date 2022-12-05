import { Module } from '@nestjs/common';
import { GaugeModule } from '../gauge/gauge.module';
import { TokenModule } from '../token/token.module';
import { UserBalanceService } from './lib/user-balance.service';
import { UserSyncGaugeBalanceService } from './lib/user-sync-gauge-balance.service';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { UserMutationResolver } from './user-mutation.resolver';
import { UserQueryResolver } from './user-query.resolver';
import { UserService } from './user.service';

@Module({
  imports: [TokenModule, GaugeModule],
  providers: [
    UserService,
    UserSyncWalletBalanceService,
    UserQueryResolver,
    UserBalanceService,
    UserMutationResolver,
    UserSyncGaugeBalanceService,
  ],
  exports: [UserService, UserQueryResolver, UserMutationResolver],
})
export class UserModule {}
