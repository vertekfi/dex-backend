import { Injectable } from '@nestjs/common';
import { UserSyncWalletBalanceService } from './lib/user-sync-wallet-balance.service';

@Injectable()
export class UserService {
  constructor(private readonly walletSyncService: UserSyncWalletBalanceService) {}

  async initWalletBalancesForPool(poolId: string) {
    await this.walletSyncService.initBalancesForPool(poolId);
  }
}
