import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';
import { prisma } from '../../../../../prisma/prisma-client';
import { PrismaPoolWithExpandedNesting } from '../../../../../prisma/prisma-types';
import { PoolAprService } from '../../pool-types';

export class StaderStakedBnbAprService implements PoolAprService {
  private readonly SFTMX_ADDRESS = '0xd7028092c830b5c8fce061af2e593413ebbc1fc1';
  private readonly SFTMX_APR = 0.046;

  constructor(private readonly tokenService: TokenPriceService) {}

  public async updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void> {
    const tokenPrices = await this.tokenService.getCurrentTokenPrices();
    const sftmxPrice = this.tokenService.getPriceForToken(tokenPrices, this.SFTMX_ADDRESS);
    let operations: any[] = [];
    for (const pool of pools) {
      const sftmxToken = pool.tokens.find((token) => token.address === this.SFTMX_ADDRESS);
      const sftmxTokenBalance = sftmxToken?.dynamicData?.balance;
      if (sftmxTokenBalance && pool.dynamicData) {
        const sftmxPercentage =
          (parseFloat(sftmxTokenBalance) * sftmxPrice) / pool.dynamicData.totalLiquidity;
        const sftmxApr = pool.dynamicData.totalLiquidity > 0 ? this.SFTMX_APR * sftmxPercentage : 0;
        operations.push(
          prisma.prismaPoolAprItem.upsert({
            where: { id: `${pool.id}-sftmx-apr` },
            update: { apr: sftmxApr },
            create: {
              id: `${pool.id}-sftmx-apr`,
              poolId: pool.id,
              apr: sftmxApr,
              title: 'sFTMx APR',
              type: 'IB_YIELD',
            },
          }),
        );
      }
    }
    await Promise.all(operations);
  }
}
