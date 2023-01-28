import { BigNumber, Contract } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { calcOutGivenIn } from 'src/modules/utils/math/WeightedMath';
import { ethNum } from 'src/modules/utils/old-big-number';
import { getPoolAddress } from '../../pool/pool-utils';
import { AccountWeb3 } from '../../types';
import { Multicaller } from '../../web3/multicaller';
import { PoolPricingMap } from '../types';
import { CoingeckoService } from './coingecko.service';
import { getPricingAssetPrices } from './data';

export interface IPoolPricingConfig {
  rpc: AccountWeb3;
  gecko: CoingeckoService;
  vault: Contract;
  prisma: PrismaService;
}

export class PoolPricingService {
  constructor(readonly config: IPoolPricingConfig) {}

  async getWeightedTokenPoolPrices(
    tokens: string[],
    pricingPoolsMap: PoolPricingMap,
  ): Promise<{ [token: string]: number }> {
    tokens = tokens.map((t) => t.toLowerCase());

    const balancesMulticall = new Multicaller(this.config.rpc, [
      'function getPoolTokens(bytes32) public view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)',
    ]);
    const poolMulticall = new Multicaller(this.config.rpc, [
      'function getNormalizedWeights() public view returns (uint256[])',
    ]);

    // Token may have usePoolPricing set but arent included in local mapping
    // Database tokens are always stored lower case
    const mappedAddresses = Object.keys(pricingPoolsMap).map((t) => t.toLowerCase());
    tokens = tokens.filter((t) => mappedAddresses.includes(t));

    tokens.forEach((t) => {
      const poolId = pricingPoolsMap[t].poolId;
      balancesMulticall.call(`${t}.poolTokens`, this.config.vault.address, 'getPoolTokens', [
        poolId,
      ]);

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

    const pricingAssets = await getPricingAssetPrices(this.config.prisma);

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
