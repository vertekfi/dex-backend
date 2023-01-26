// Temp until list

import { Contract } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { nestApp } from 'src/main';
import { TokenPriceHandler } from 'src/modules/common/token/types';
import { ContractService } from 'src/modules/common/web3/contract.service';

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

  constructor(private readonly prisma: PrismaService) {
    console.log('FKOFHIDFHIODFH[DFHSD[FHSDHFSDF');
    const cs = nestApp.get(ContractService);
    this.vault = cs.getVault();
  }

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens
      .filter((token) => token.usePoolPricing && addressMap[token.address])
      .map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    let updated: string[] = [];
    let operations: any[] = [];

    console.log(tokens);

    for (const token in addressMap) {
      const matched = tokens.find((t) => t.address.toLowerCase() === token.toLowerCase());
      if (matched) {
        console.log(matched);
      }
    }

    return [];
  }
}
