// Temp until list

import { Contract } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { nestApp } from 'src/main';
import { TokenPriceHandler } from 'src/modules/common/token/types';
import { ContractService } from 'src/modules/common/web3/contract.service';

// Temp solution
const addressMap = {
  '0xeD236c32f695c83Efde232c288701d6f9C23E60E': {
    poolId: '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000',
    pairedAgainst: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
};

export class PoolPriceHandler implements TokenPriceHandler {
  public readonly exitIfFails = false;
  public readonly id = 'PoolPriceHandler';

  readonly vault: Contract;

  constructor() {
    const cs = nestApp.get(ContractService);
    this.vault = cs.getVault();
  }

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens.filter((token) => token.usePoolPricing).map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    let updated: string[] = [];
    let operations: any[] = [];
    // console.log('PoolPriceHandler');
    // console.log(tokens);

    for (const token of tokens) {
      const poolData = addressMap[token.address];
      if (!poolData) {
        console.error(`Token ${token.address} not in PoolPriceHandler mapping`);
        continue;
      }
    }

    return [];
  }
}