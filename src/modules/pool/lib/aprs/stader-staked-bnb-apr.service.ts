import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';
import { prisma } from '../../../../../prisma/prisma-client';
import { PrismaPoolWithExpandedNesting } from '../../../../../prisma/prisma-types';
import { PoolAprService } from '../../pool-types';

export class StaderStakedBnbAprService implements PoolAprService {
  readonly name = 'StaderStakedBnbAprService';

  private readonly SBNBX_ADDRESS = '';
  private readonly SBNBX_APR = 0.046;

  constructor(private readonly tokenService: TokenPriceService) {}

  public async updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void> {
    const tokenPrices = await this.tokenService.getCurrentTokenPrices();
    const sftmxPrice = this.tokenService.getPriceForToken(tokenPrices, this.SBNBX_ADDRESS);
    let operations: any[] = [];
    for (const pool of pools) {
      const sBnbxToken = pool.tokens.find((token) => token.address === this.SBNBX_ADDRESS);
      const sBnbxTokenBalance = sBnbxToken?.dynamicData?.balance;
      if (sBnbxTokenBalance && pool.dynamicData) {
        const sBnbxPercentage =
          (parseFloat(sBnbxTokenBalance) * sftmxPrice) / pool.dynamicData.totalLiquidity;
        const sBnbxApr = pool.dynamicData.totalLiquidity > 0 ? this.SBNBX_APR * sBnbxPercentage : 0;
        operations.push(
          prisma.prismaPoolAprItem.upsert({
            where: { id: `${pool.id}-sBnbx-apr` },
            update: { apr: sBnbxApr },
            create: {
              id: `${pool.id}-sBnbx-apr`,
              poolId: pool.id,
              apr: sBnbxApr,
              title: 'sBNBx APR',
              type: 'IB_YIELD',
            },
          }),
        );
      }
    }
    await Promise.all(operations);
  }
}
