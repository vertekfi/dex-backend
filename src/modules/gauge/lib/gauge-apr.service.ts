import { Injectable } from '@nestjs/common';
import { ProtocolService } from 'src/modules/protocol/protocol.service';
import { TokenPrices } from 'src/modules/token/token-types-old';
import { bnSum, bnum } from 'src/modules/utils/bignumber-utils';
import { AprRange, FiatCurrency, Pool, PoolAPRs } from '../types';
import { VeBalAprCalc } from '../../pool/lib/aprs/vebal-apr.calc';

@Injectable()
export class GaugeAprService {
  constructor(
    private readonly VeBalAprCalcClass: VeBalAprCalc,
    private readonly protocolService: ProtocolService,
  ) {}

  public async calc(
    pool: Pool,
    poolSnapshot: Pool | undefined,
    prices: TokenPrices,
    currency: FiatCurrency,
    protocolFeePercentage: number,
    stakingBalApr: AprRange,
    stakingRewardApr = '0',
  ): Promise<PoolAPRs> {
    const swapFeeAPR = this.calcSwapFeeAPR(pool, poolSnapshot, protocolFeePercentage);

    const [yieldAPR, veBalAPR] = await Promise.all([
      this.calcYieldAPR(prices, currency, protocolFeePercentage),
      this.calcVeBalAPR(pool, prices),
    ]);

    const unstakedTotalAPR = bnSum([swapFeeAPR, yieldAPR.total]).toString();

    const aprGivenBoost = (boost = '1') =>
      this.calcAprGivenBoost(unstakedTotalAPR, stakingBalApr, stakingRewardApr, boost);

    const stakedAprRange = this.calcStakedAprRange(
      unstakedTotalAPR,
      stakingBalApr,
      stakingRewardApr,
    );

    return {
      swap: swapFeeAPR,
      yield: yieldAPR,
      staking: {
        bal: stakingBalApr,
        rewards: stakingRewardApr,
      },
      total: {
        unstaked: unstakedTotalAPR,
        staked: {
          calc: aprGivenBoost,
          ...stakedAprRange,
        },
      },
      // Conditionally add the veBAL APR attribute if this is the BAL 80/20 pool.
      ...(pool.id == this.protocolService.getMainPoolId() && {
        veBal: veBalAPR,
      }),
    };
  }

  private calcSwapFeeAPR(
    pool: Pool,
    poolSnapshot: Pool | undefined,
    protocolFeePercentage: number,
  ): string {
    if (!poolSnapshot)
      return bnum(pool.totalSwapFee)
        .times(1 - protocolFeePercentage)
        .dividedBy(pool.totalLiquidity)
        .multipliedBy(365)
        .toString();

    const swapFees = bnum(pool.totalSwapFee).minus(poolSnapshot.totalSwapFee);

    return swapFees
      .times(1 - protocolFeePercentage)
      .dividedBy(pool.totalLiquidity)
      .multipliedBy(365)
      .toString();
  }

  /**
   * @summary Total APR given boost
   */
  private calcAprGivenBoost(
    unstakedTotalAPR: string,
    stakingBalApr: AprRange,
    stakingRewardApr = '0',
    boost = '1',
  ): string {
    const stakedBaseAPR = bnum(unstakedTotalAPR).plus(stakingRewardApr);
    const boostedAPR = stakingBalApr?.min ? bnum(stakingBalApr.min).times(boost) : bnum('0');

    return stakedBaseAPR.plus(boostedAPR).toString();
  }

  /**
   * @summary Absolute total staked APR range
   */
  private calcStakedAprRange(
    unstakedTotalAPR: string,
    stakingBalApr: AprRange,
    stakingRewardApr = '0',
  ): AprRange {
    const stakedBaseAPR = bnum(unstakedTotalAPR).plus(stakingRewardApr);
    const maxBalApr = stakingBalApr?.max || '0';
    const minBalApr = stakingBalApr?.min || '0';

    return {
      max: stakedBaseAPR.plus(maxBalApr).toString(),
      min: stakedBaseAPR.plus(minBalApr).toString(),
    };
  }

  /**
   * @description Calculate APRs coming from underlying yield bearing tokens
   * such as Aave tokens.
   * @returns total yield APR and breakdown of total by pool token.
   */
  private async calcYieldAPR(
    prices: TokenPrices,
    currency: FiatCurrency,
    protocolFeePercentage: number,
  ): Promise<{ total: string; breakdown: Record<string, string> }> {
    const total = '0';
    const breakdown = {};

    // const aaveAPR = await this.aave.calcWeightedSupplyAPRFor(
    //   this.pool,
    //   prices,
    //   currency
    // );

    // ({ total, breakdown } = aaveAPR);

    // // TODO burn with fire once scalable linear pool support is added.
    // // If USD+ pool, replace aave APR with USD+
    // const usdPlusPools = {
    //   '0xb973ca96a3f0d61045f53255e319aedb6ed4924000000000000000000000042f':
    //     '0x1aAFc31091d93C3Ff003Cff5D2d8f7bA2e728425',
    //   '0xf48f01dcb2cbb3ee1f6aab0e742c2d3941039d56000000000000000000000445':
    //     '0x6933ec1CA55C06a894107860c92aCdFd2Dd8512f',
    // };

    // if (Object.keys(usdPlusPools).includes(this.pool.id)) {
    //   const linearPoolAddress = usdPlusPools[this.pool.id];
    //   const linearPool = this.pool.onchain?.linearPools?.[linearPoolAddress];
    //   if (linearPool) {
    //     const wrappedToken = linearPool.wrappedToken.address;
    //     const weightedAPR = await calcUSDPlusWeightedAPR(
    //       this.pool,
    //       linearPool,
    //       linearPoolAddress,
    //       prices,
    //       currency
    //     );

    //     breakdown[wrappedToken] = weightedAPR.toString();

    //     total = bnSum(Object.values(breakdown)).toString();
    //   }
    // }

    return {
      total,
      breakdown,
    };
  }

  private async calcVeBalAPR(pool: Pool, prices: TokenPrices): Promise<string> {
    if (pool.id != this.protocolService.getMainPoolId()) {
      return '0';
    }

    return await this.VeBalAprCalcClass.calc(pool.totalLiquidity, pool.totalShares, prices);
  }
}
