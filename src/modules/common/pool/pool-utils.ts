import { bnum } from 'src/modules/utils/bignumber-utils';

export function getBptPrice(poolTotalLiquidity: string, poolTotalShares: string): string {
  return bnum(poolTotalLiquidity).div(poolTotalShares).toString();
}

export function getPoolAddress(poolId: string) {
  return poolId.slice(0, 42);
}
