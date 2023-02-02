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
import { TokenDefinition, TokenPricingService } from '../types';
import { getPoolPricingMap, getPricingAssetPrices } from './data';
import { getTimestampStartOfDaysAgoUTC } from 'src/modules/utils/time';
import { getVault, getVaultAbi } from '../../web3/contract';
import { objectToLowerCaseArr, toLowerCaseArr } from 'src/modules/utils/general.utils';
import { ZERO_ADDRESS } from '../../web3/utils';
import { SwapKind } from '../../types/vault.types';
import { formatEther, parseUnits } from 'ethers/lib/utils';

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
    const data = await this.getWeightedTokenPoolPrices([token.address]);
    return data[token.address];
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
    tokens = tokens.filter((t) => t.usePoolPricing);

    // Get current and >= 24 hour ago records to compute changes
    const [currentPrices] = await Promise.all([
      this.getWeightedTokenPoolPrices(tokens.map((t) => t.address)),
      // this.prisma.prismaTokenPrice.findMany({
      //   where: {
      //     tokenAddress: { in: tokens.map((t) => t.address) },
      //     timestamp: { gte: timestampTwentyFourHoursAgo() },
      //   },
      //   orderBy: { timestamp: 'desc' },
      //   distinct: 'tokenAddress',
      // }),
    ]);

    for (const currentValue of Object.entries(currentPrices)) {
      const [address, currentPrice] = currentValue;
      const token = tokens.find((t) => t.address === address);

      // const priceDayAgo = oneDayAgoPrices.find((p) => p.tokenAddress === token.address);
      // const priceChange24h = currentPrice - (priceDayAgo?.price || 0);
      // const priceChangePercent24h = priceChange24h / (priceDayAgo?.price || 1);

      // console.log('currentPrice: ' + currentPrice);
      // console.log('priceDayAgo: ' + priceDayAgo?.price);
      // console.log('priceChange24h: ' + priceChange24h);
      // console.log('priceChangePercent24h: ' + priceChangePercent24h);

      const marketData: PrismaTokenDynamicData = {
        price: currentPrice,
        ath: 0, // db
        atl: 0, // db
        marketCap: 0,
        fdv: 0,
        high24h: 0, // db
        low24h: 0, // db
        priceChange24h: 0,
        priceChangePercent24h: 0,
        priceChangePercent7d: 0, // Can these be pull in the same query?
        priceChangePercent14d: 0, // db
        priceChangePercent30d: 0, // db
        updatedAt: new Date(new Date().toUTCString()), // correct format?
        coingeckoId: null,
        dexscreenerPair: null,
        tokenAddress: token.address,
      };

      data.push(marketData);
    }

    return data;
  }

  async getWeightedTokenPoolPrices(tokens: string[]): Promise<{ [token: string]: number }> {
    tokens = tokens.map((t) => t.toLowerCase());

    const pricingPoolsMap = getPoolPricingMap();
    const vault = await getVault();

    const balancesMulticall = new Multicaller(this.rpc, [
      'function getPoolTokens(bytes32) public view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)',
    ]);
    // const poolMulticall = new Multicaller(this.rpc, [
    //   'function getNormalizedWeights() public view returns (uint256[])',
    // ]);

    // Token may have usePoolPricing set but arent included in local mapping
    // Database tokens are always stored lower case
    const mappedAddresses = objectToLowerCaseArr(pricingPoolsMap);
    tokens = tokens.filter((t) => mappedAddresses.includes(t));

    tokens.forEach((t) => {
      const poolId = pricingPoolsMap[t].poolId;
      balancesMulticall.call(`${t}.poolTokens`, vault.address, 'getPoolTokens', [poolId]);

      //  const poolAddress = getPoolAddress(poolId);
      // poolMulticall.call(`${t}.weights`, poolAddress, 'getNormalizedWeights');
    });

    let balancesResult: Record<
      string,
      {
        poolTokens: { tokens: string[]; balances: BigNumber[] };
      }
    >;

    // let poolWeights: Record<string, { weights: BigNumber[] }>;

    [balancesResult] = await Promise.all([
      balancesMulticall.execute(),
      // poolMulticall.execute(),
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

      if (tokenInIdx === -1 || tokenOutIdx === -1) {
        console.log('Skipping incorrect token index for pricingPoolsMap: ' + tokenIn);
        continue;
      }

      const poolId = pricingPoolsMap[tokenIn].poolId;
      const amountIn: BigNumber = pricingPoolsMap[tokenIn].inputAmount;

      const amountOut = await this.getTradeDeltas(tokenIn, [tokenIn, tokenOut], poolId, amountIn);

      let priceUsd;
      const diff = parseUnits('1').sub(amountIn);
      if (diff.isZero()) {
        priceUsd = amountOut * pricingAssets[tokenOut];
      } else {
        const multiplier = ethNum(diff);
        console.log(formatEther(diff));
        console.log(multiplier);
        priceUsd = amountOut * multiplier * pricingAssets[tokenOut];
      }

      // console.log(priceUsd);

      results[tokenIn] = priceUsd;
    }

    return results;
  }

  async getTradeDeltas(mainToken: string, tokens: string[], poolId: string, amountIn: BigNumber) {
    try {
      const vault = await getVault();
      const assetInIndex = tokens[0] == mainToken ? 0 : 1;
      const assetOutIndex = assetInIndex === 0 ? 1 : 0;

      const me = ZERO_ADDRESS;
      const batchStep = [
        {
          poolId,
          assetInIndex,
          assetOutIndex,
          amount: amountIn,
          userData: '0x',
        },
      ];

      const fundManagement = {
        sender: me,
        fromInternalBalance: false,
        recipient: me,
        toInternalBalance: false,
      };

      const deltas = await vault.callStatic.queryBatchSwap(
        SwapKind.GIVEN_IN,
        batchStep,
        tokens,
        fundManagement,
      );

      // console.log(deltas.map((d) => ethNum(d)));

      return Math.abs(ethNum(deltas[assetOutIndex]));
    } catch (error) {
      console.error(`Error get price deltas for pool id ${poolId}. Returning zero.`);
      return 0;
    }
  }

  async getPricesTwentyFourHoursAgo(tokens: string[]) {
    return this.prisma.prismaTokenPrice.findMany({
      where: {
        tokenAddress: { in: tokens },
        timestamp: { gte: getTimestampStartOfDaysAgoUTC(1) },
      },
      orderBy: { timestamp: 'desc' },
      distinct: 'tokenAddress',
    });
  }

  getHighLowPrices(prices: number[]) {
    //
  }

  async getPricesOneWeekAgo(tokens: string[]) {
    return this.prisma.prismaTokenPrice.findMany({
      where: {
        tokenAddress: { in: tokens },
        timestamp: { gte: getTimestampStartOfDaysAgoUTC(7) },
      },
      orderBy: { timestamp: 'desc' },
      distinct: 'tokenAddress',
    });
  }
}
