import { Module } from '@nestjs/common';
import { TokenModule } from '../token/token.module';
import { UserBalanceService } from './lib/user-balance.service';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
  imports: [TokenModule],
  providers: [UserService, UserSyncWalletBalanceService, UserResolver, UserBalanceService],
  exports: [UserService, UserResolver],
})
export class UserModule {}
