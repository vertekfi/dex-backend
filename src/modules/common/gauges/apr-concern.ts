import { networkConfig } from 'src/modules/config/network-config';
import { AprRange, FiatCurrency, Pool, PoolAPRs } from 'src/modules/gauge/types';
import { TokenPrices } from 'src/modules/token/token-types-old';
import { bnSum, bnum } from 'src/modules/utils/bignumber-utils';
import { VeBalAprCalc } from './vebal-apr.calc';

export class AprConcern {
  constructor(public readonly pool: Pool, private readonly VeBalAprCalcClass: VeBalAprCalc) {}

  public async calc(
    poolSnapshot: Pool | undefined,
    prices: TokenPrices,
    currency: FiatCurrency,
    protocolFeePercentage: number,
    stakingBalApr: AprRange,
    stakingRewardApr = '0',
  ): Promise<PoolAPRs> {
    const swapFeeAPR = this.calcSwapFeeAPR(poolSnapshot, protocolFeePercentage);

    const [yieldAPR, veBalAPR] = await Promise.all([
      this.calcYieldAPR(prices, currency, protocolFeePercentage),
      this.calcVeBalAPR(),
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
      // // Conditionally add the veBAL APR attribute if this is the BAL 80/20 pool.
      // ...(this.pool.id == '0x7a09ddf458fda6e324a97d1a8e4304856fb3e702000200000000000000000000' && {
      //   veBal: veBalAPR,
      // }),
    };
  }

  private calcSwapFeeAPR(poolSnapshot: Pool | undefined, protocolFeePercentage: number): string {
    if (!poolSnapshot)
      return bnum(this.pool.totalSwapFee)
        .times(1 - protocolFeePercentage)
        .dividedBy(this.pool.totalLiquidity)
        .multipliedBy(365)
        .toString();

    const swapFees = bnum(this.pool.totalSwapFee).minus(poolSnapshot.totalSwapFee);

    return swapFees
      .times(1 - protocolFeePercentage)
      .dividedBy(this.pool.totalLiquidity)
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

    return {
      total,
      breakdown,
    };
  }

  private async calcVeBalAPR(): Promise<string> {
    if (this.pool.id != networkConfig.balancer.votingEscrow.lockablePoolId) {
      return '0';
    }

    return await this.VeBalAprCalcClass.calc(this.pool.totalLiquidity, this.pool.totalShares);
  }
}
