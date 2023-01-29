import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken, PrismaTokenDynamicData } from '@prisma/client';
import { BigNumber, Contract } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { HistoricalPrice } from 'src/modules/token/token-types-old';
import { calcOutGivenIn } from 'src/modules/utils/math/WeightedMath';
import { ethNum } from 'src/modules/utils/old-big-number';
import { getPoolAddress } from '../../pool/pool-utils';
import { AccountWeb3 } from '../../types';
import { ContractService } from '../../web3/contract.service';
import { Multicaller } from '../../web3/multicaller';
import { RPC } from '../../web3/rpc.provider';
import { PoolPricingMap, TokenDefinition, TokenPricingService } from '../types';
import { CoingeckoService } from './coingecko.service';
import { getPricingAssetPrices } from './data';

export interface IPoolPricingConfig {
  rpc: AccountWeb3;
  vault: Contract;
  prisma: PrismaService;
}

@Injectable()
export class PoolPricingService implements TokenPricingService {
  coinGecko = false;

  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly contractService: ContractService,
  ) {}

  async getTokenPrice(token: TokenDefinition): Promise<number> {
    return 0;
  }

  async updateCoinCandlestickData(token: PrismaToken): Promise<void> {
    //
  }

  async getTokenHistoricalPrices(
    address: string,
    days: number,
    tokenDefinitions: TokenDefinition[],
  ): Promise<HistoricalPrice[]> {
    return [];
  }

  async getMarketDataForToken(tokens: PrismaToken[]): Promise<PrismaTokenDynamicData[]> {
    const data: PrismaTokenDynamicData[] = [];

    console.log(tokens);

    // for (const token of tokens) {

    //   for (const item of result.pairs) {
    //     const marketData: PrismaTokenDynamicData = {
    //       price: parseFloat(item.priceUsd),
    //       ath: 0, // db
    //       atl: 0, // db
    //       marketCap: 0, // Have to manually call the contract for total supply (then * current price)
    //       fdv: item.fdv,
    //       high24h: 0, // db
    //       low24h: 0, // db
    //       priceChange24h: item.priceChange.h24,
    //       priceChangePercent24h: item.priceChange.h24,
    //       priceChangePercent7d: 0, // db
    //       priceChangePercent14d: 0, // db
    //       priceChangePercent30d: 0, // db
    //       updatedAt: new Date(new Date().toUTCString()), // correct format?
    //       coingeckoId: null,
    //       dexscreenerPair: item.pairAddress,
    //       tokenAddress: chunk.find((t) => t.dexscreenPairAddress === item.pairAddress).address,
    //     };

    //     data.push(marketData);
    //   }
    // }

    return data;
  }

  async getWeightedTokenPoolPrices(
    tokens: string[],
    pricingPoolsMap: PoolPricingMap,
  ): Promise<{ [token: string]: number }> {
    tokens = tokens.map((t) => t.toLowerCase());

    const balancesMulticall = new Multicaller(this.rpc, [
      'function getPoolTokens(bytes32) public view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)',
    ]);
    const poolMulticall = new Multicaller(this.rpc, [
      'function getNormalizedWeights() public view returns (uint256[])',
    ]);

    // Token may have usePoolPricing set but arent included in local mapping
    // Database tokens are always stored lower case
    const mappedAddresses = Object.keys(pricingPoolsMap).map((t) => t.toLowerCase());
    tokens = tokens.filter((t) => mappedAddresses.includes(t));

    const vault = this.contractService.getVault();

    tokens.forEach((t) => {
      const poolId = pricingPoolsMap[t].poolId;
      balancesMulticall.call(`${t}.poolTokens`, vault.address, 'getPoolTokens', [poolId]);

      const poolAddress = getPoolAddress(poolId);
      poolMulticall.call(`${t}.weights`, poolAddress, 'getNormalizedWeights');
    });

    let balancesResult: Record<
      string,
      {
        poolTokens: { tokens: string[]; balances: BigNumber[] };
      }
    >;
    let poolWeights: Record<string, { weights: BigNumber[] }>;

    [balancesResult, poolWeights] = await Promise.all([
      balancesMulticall.execute(),
      poolMulticall.execute(),
    ]);

    const pricingAssets = await getPricingAssetPrices(this.prisma);

    const results: { [token: string]: number } = {};

    for (const tokenInfo of Object.entries(balancesResult)) {
      const [tokenIn, poolInfo] = tokenInfo;

      const poolTokens = {
        balances: poolInfo.poolTokens.balances,
        tokens: poolInfo.poolTokens.tokens.map((t) => t.toLowerCase()),
      };

      const tokenOut = pricingPoolsMap[tokenIn].priceAgainst;

      if (!pricingAssets[tokenOut]) {
        console.log('Token out not included in pricing assets ifor token in: ' + tokenIn);
        continue;
      }

      const tokenInIdx = poolTokens.tokens.indexOf(tokenIn);
      const tokenOutIdx = poolTokens.tokens.indexOf(tokenOut);
      const balanceIn = ethNum(poolTokens.balances[tokenInIdx]);
      const balanceOut = ethNum(poolTokens.balances[tokenOutIdx]);
      const weightIn = ethNum(poolWeights[tokenIn].weights[tokenInIdx]);
      const weightOut = ethNum(poolWeights[tokenIn].weights[tokenOutIdx]);
      const amountIn = 1;

      if (tokenInIdx === -1 || tokenOutIdx === -1) {
        console.log('Skipping incorrect token index for pricingPoolsMap: ' + tokenIn);
        continue;
      }

      const amountOut = calcOutGivenIn(balanceIn, weightIn, balanceOut, weightOut, amountIn);

      const priceUsd = amountOut.mul(pricingAssets[tokenOut]).toNumber();

      results[tokenIn] = priceUsd;
    }

    console.log(results);
    return results;
  }
}
