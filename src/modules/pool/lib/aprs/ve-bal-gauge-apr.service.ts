import { PrismaPoolWithExpandedNesting } from '../../../../../prisma/prisma-types';
import { PrismaPoolAprItem } from '@prisma/client';
import { prisma } from '../../../../../prisma/prisma-client';
import { prismaBulkExecuteOperations } from '../../../../../prisma/prisma-util';
import { PoolAprService } from '../../pool-types';
import { GaugeService } from 'src/modules/gauge/gauge.service';
import { ONE_YEAR_SECONDS } from 'src/modules/utils/time';
import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';

// TODO: This is lacking a lot compared to previous version used. Classes/Services are already ported in
export class VeGaugeAprService implements PoolAprService {
  constructor(
    private readonly gaugeService: GaugeService,
    private readonly primaryTokens: string[],
    private readonly pricingService: TokenPriceService,
  ) {}

  async updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void> {
    try {
      const operations: any[] = [];
      const [gauges, tokenPrices] = await Promise.all([
        this.gaugeService.getCoreGauges(),
        this.pricingService.getCurrentTokenPrices(),
      ]);

      for (const pool of pools) {
        const gauge = gauges.find((g) => g.address === pool.staking?.gauge?.gaugeAddress);

        if (!gauge || !pool.dynamicData) {
          continue;
        }

        // TODO: This should be gauge supply
        const totalShares = parseFloat(pool.dynamicData.totalShares);
        const gaugeTvl =
          totalShares > 0
            ? (parseFloat(gauge.totalSupply) / totalShares) * pool.dynamicData.totalLiquidity
            : 0;
        let thirdPartyApr = 0;

        for (let rewardToken of gauge.rewardTokens) {
          const tokenPrice =
            this.pricingService.getPriceForToken(tokenPrices, rewardToken.address) || 0.1;
          const rewardTokenPerYear = rewardToken.rewardsPerSecond * ONE_YEAR_SECONDS;
          const rewardTokenValuePerYear = tokenPrice * rewardTokenPerYear;
          const rewardApr = gaugeTvl > 0 ? rewardTokenValuePerYear / gaugeTvl : 0;
          const isThirdPartyApr = !this.primaryTokens.includes(rewardToken.address);

          if (isThirdPartyApr) {
            thirdPartyApr += rewardApr;
          }

          const item: PrismaPoolAprItem = {
            id: `${pool.id}-${rewardToken.symbol}-apr`,
            poolId: pool.id,
            title: `${rewardToken.symbol} reward APR`,
            apr: rewardApr,
            type: isThirdPartyApr ? 'THIRD_PARTY_REWARD' : 'NATIVE_REWARD',
            group: null,
          };

          operations.push(
            prisma.prismaPoolAprItem.upsert({
              where: { id: item.id },
              update: item,
              create: item,
            }),
          );
        }
      }

      await prismaBulkExecuteOperations(operations);
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
