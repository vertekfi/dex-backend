// Temp until list

import { BigNumber, Contract } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { nestApp } from 'src/main';
import { getPoolAddress } from 'src/modules/common/pool/pool-utils';
import { TokenPriceHandler } from 'src/modules/common/token/types';
import { AccountWeb3 } from 'src/modules/common/types';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { calcOutGivenIn } from 'src/modules/utils/math/WeightedMath';
import { ethNum } from 'src/modules/utils/old-big-number';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import { CoingeckoService } from '../coingecko.service';
import { PoolPricingService } from '../pool-pricing.service';

const WETH = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

function isWeth(address: string) {
  return address.toLowerCase() === WETH.toLowerCase();
}

// Temp solution
const pricingPoolsMap: { [token: string]: { poolId: string; priceAgainst: string } } = {
  '0xed236c32f695c83efde232c288701d6f9c23e60e': {
    poolId: '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000',
    priceAgainst: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // Another token in the pool to usd price against
  },
};

const pricingAssets = [
  '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  '0xe9e7cea3dedca5984780bafc599bd69add087d56',
].map((t) => t.toLowerCase());

export class PoolPriceHandler implements TokenPriceHandler {
  public readonly exitIfFails = false;
  public readonly id = 'PoolPriceHandler';

  readonly vault: Contract;
  readonly rpc: AccountWeb3;
  readonly gecko: CoingeckoService;
  readonly prisma: PrismaService;

  readonly poolPricing: PoolPricingService;

  constructor() {
    const cs = nestApp.get(ContractService);
    this.rpc = nestApp.get(RPC);
    this.gecko = nestApp.get(CoingeckoService);
    this.vault = cs.getVault();
    this.prisma = nestApp.get(PrismaService);

    this.poolPricing = new PoolPricingService({
      vault: cs.getVault(),
      rpc: nestApp.get(RPC),
      gecko: nestApp.get(CoingeckoService),
    });
  }

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens.filter((token) => token.usePoolPricing).map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    let tokensUpdated: string[] = [];
    let operations: any[] = [];

    const pricesMap = await this.poolPricing.getTokenPoolPrices(
      tokens,
      pricingPoolsMap,
      pricingAssets,
    );

    const timestamp = timestampRoundedUpToNearestHour();

    for (const priceInfo of Object.entries(pricesMap)) {
      const [tokenIn, priceUsd] = priceInfo;

      // create a history record
      operations.push(
        this.prisma.prismaTokenPrice.upsert({
          where: { tokenAddress_timestamp: { tokenAddress: tokenIn, timestamp } },
          update: { price: priceUsd, close: priceUsd },
          create: {
            tokenAddress: tokenIn,
            timestamp,
            price: priceUsd,
            high: priceUsd,
            low: priceUsd,
            open: priceUsd,
            close: priceUsd,
            coingecko: false,
          },
        }),
      );

      // Update current price record
      operations.push(
        this.prisma.prismaTokenCurrentPrice.upsert({
          where: { tokenAddress: tokenIn },
          update: { price: priceUsd },
          create: {
            tokenAddress: tokenIn,
            timestamp,
            price: priceUsd,
            coingecko: false,
          },
        }),
      );

      tokensUpdated.push(tokenIn);
    }

    await prismaBulkExecuteOperations(operations);

    return tokensUpdated;
  }
}
