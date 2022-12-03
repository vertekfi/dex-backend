import { Module } from '@nestjs/common';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { UserService } from './user.service';

@Module({
  providers: [UserService, UserSyncWalletBalanceService],
  exports: [UserService],
})
export class UserModule {}
