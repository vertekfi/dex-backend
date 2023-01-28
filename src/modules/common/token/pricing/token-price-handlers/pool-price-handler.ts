// Temp until list

import { BigNumber, Contract } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
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

    console.log(pricesMap);

    // const balancesMulticall = new Multicaller(this.rpc, [
    //   'function getPoolTokens(bytes32) public view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)',
    // ]);
    // const poolMulticall = new Multicaller(this.rpc, [
    //   'function getNormalizedWeights() public view returns (uint256[])',
    // ]);

    // // Token may have usePoolPricing set but arent included in local mapping
    // // Database tokens are always stored lower case
    // const mappedAddresses = Object.keys(pricingPoolsMap).map((t) => t.toLowerCase());
    // tokens = tokens.filter((t) => mappedAddresses.includes(t.address));

    // tokens.forEach((t) => {
    //   const poolId = pricingPoolsMap[t.address].poolId;
    //   balancesMulticall.call(`${t.address}.poolTokens`, this.vault.address, 'getPoolTokens', [
    //     poolId,
    //   ]);

    //   const poolAddress = getPoolAddress(poolId);
    //   poolMulticall.call(`${t.address}.weights`, poolAddress, 'getNormalizedWeights');
    // });

    // let balancesResult: Record<
    //   string,
    //   {
    //     poolTokens: { tokens: string[]; balances: BigNumber[] };
    //   }
    // >;

    // let poolWeights: Record<string, { weights: BigNumber[] }>;

    // [balancesResult, poolWeights] = await Promise.all([
    //   balancesMulticall.execute(),
    //   poolMulticall.execute(),
    // ]);

    // const nativePrice = await this.gecko.getNativeAssetPrice();

    // for (const tokenInfo of Object.entries(balancesResult)) {
    //   const [tokenIn, poolInfo] = tokenInfo;

    //   const poolTokens = {
    //     balances: poolInfo.poolTokens.balances,
    //     tokens: poolInfo.poolTokens.tokens.map((t) => t.toLowerCase()),
    //   };

    //   const tokenOut = pricingPoolsMap[tokenIn].priceAgainst;

    //   if (!pricingAssets.includes(tokenOut)) {
    //     continue;
    //   }

    //   const tokenInIdx = poolTokens.tokens.indexOf(tokenIn);
    //   const tokenOutIdx = poolTokens.tokens.indexOf(tokenOut);
    //   const balanceIn = ethNum(poolTokens.balances[tokenInIdx]);
    //   const balanceOut = ethNum(poolTokens.balances[tokenOutIdx]);
    //   const weightIn = ethNum(poolWeights[tokenIn].weights[tokenInIdx]);
    //   const weightOut = ethNum(poolWeights[tokenIn].weights[tokenOutIdx]);
    //   const amountIn = 1;

    //   if (tokenInIdx === -1 || tokenOutIdx === -1) {
    //     console.log('Incorrect token index for pricingPoolsMap: ' + tokenIn);
    //     return;
    //   }

    //   const amountOut = calcOutGivenIn(balanceIn, weightIn, balanceOut, weightOut, amountIn);

    //   let priceUsd: number;
    //   if (isWeth(tokenOut)) {
    //     priceUsd = amountOut.mul(nativePrice.usd).toNumber();
    //   }

    //   const timestamp = timestampRoundedUpToNearestHour();

    //   if (priceUsd) {
    //     console.log(priceUsd);

    //     // create a history record
    //     operations.push(
    //       this.prisma.prismaTokenPrice.upsert({
    //         where: { tokenAddress_timestamp: { tokenAddress: tokenIn, timestamp } },
    //         update: { price: priceUsd, close: priceUsd },
    //         create: {
    //           tokenAddress: tokenIn,
    //           timestamp,
    //           price: priceUsd,
    //           high: priceUsd,
    //           low: priceUsd,
    //           open: priceUsd,
    //           close: priceUsd,
    //           coingecko: false,
    //         },
    //       }),
    //     );

    //     // Update current price record
    //     operations.push(
    //       this.prisma.prismaTokenCurrentPrice.upsert({
    //         where: { tokenAddress: tokenIn },
    //         update: { price: priceUsd },
    //         create: {
    //           tokenAddress: tokenIn,
    //           timestamp,
    //           price: priceUsd,
    //           coingecko: false,
    //         },
    //       }),
    //     );

    //     tokensUpdated.push(tokenIn);
    //   }
    // }

    return [];
  }
}
