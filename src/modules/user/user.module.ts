import { Module } from '@nestjs/common';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
  providers: [UserService, UserSyncWalletBalanceService, UserResolver],
  exports: [UserService, UserResolver],
})
export class UserModule {}
