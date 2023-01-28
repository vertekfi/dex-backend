import { PrismaService } from 'nestjs-prisma';
import { toLowerCaseArr } from 'src/modules/utils/general.utils';
import { getChainId } from '../../web3/rpc.provider';
import { PoolPricingMap, PricingAssetInfo } from '../types';
import { getTokenAddress } from '../utils';

const pricingPoolsMap: { [chainId: number]: PoolPricingMap } = {
  56: {
    [getTokenAddress('VRTK')]: {
      poolId: '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000',
      priceAgainst: getTokenAddress('WBNB'), // Another token in the pool to usd price against
    },
    [getTokenAddress('AMES')]: {
      poolId: '0x248d943b9d59c4be35d41b34f79370dfbf577b2b000200000000000000000002',
      priceAgainst: getTokenAddress('BUSD'),
    },
    [getTokenAddress('ASHARE')]: {
      poolId: '0x0db861235c7b90d419a64e1f71b3687db74d4477000200000000000000000001',
      priceAgainst: getTokenAddress('BUSD'),
    },
    [getTokenAddress('wAALTO')]: {
      poolId: '0x5deb10ed6a66a1e6188b7925a723b6bdfd97476500020000000000000000000a',
      priceAgainst: getTokenAddress('BUSD'),
    },
    [getTokenAddress('SERENE')]: {
      poolId: '0x32934c1122c0d7b0fc3daab588a4490b53c1568c00020000000000000000000e',
      priceAgainst: getTokenAddress('ETH'),
    },
    [getTokenAddress('PEBBLE')]: {
      poolId: '0xae42be6a9f75a2b53229e262e0488df6ecfeb53a000200000000000000000012',
      priceAgainst: getTokenAddress('ETH'),
    },
    [getTokenAddress('LION')]: {
      poolId: '0x8e15953eba7d5f8f99853d8f3cb64fc73b3ba770000200000000000000000003',
      priceAgainst: getTokenAddress('DAI'),
    },
    [getTokenAddress('LION_SHARE')]: {
      poolId: '0x6e30ec031f2d94c397e469b40f86bff0be014124000200000000000000000006',
      priceAgainst: getTokenAddress('DAI'),
    },
  },
};

const pricingAssets = {
  56: [
    getTokenAddress('WBNB'),
    getTokenAddress('BUSD'),
    getTokenAddress('ETH'),
    getTokenAddress('DAI'),
  ],
};

function createPricingAsset(symbol: string, coingeckoId: string): PricingAssetInfo {
  return {
    address: getTokenAddress(symbol),
    symbol,
    coingeckoId,
  };
}

export const priceAssetsConfig: { [chainId: number]: PricingAssetInfo[] } = {
  56: [
    createPricingAsset('WBNB', 'wbnb'),
    createPricingAsset('BUSD', 'binance-usd'),
    createPricingAsset('ETH', 'ethereum'),
    createPricingAsset('DAI', 'dai'),
  ],
};

export function getPricingAssets() {
  return toLowerCaseArr(pricingAssets[getChainId()]);
}

export function getPoolPricingMap() {
  return pricingPoolsMap[getChainId()];
}

export function getPricingAssetConfigs() {
  return priceAssetsConfig[getChainId()];
}

// These are cached every 20 seconds. Fine enough for saving api calls
export async function getPricingAssetPrices(prisma: PrismaService) {
  const prices = await prisma.prismaTokenCurrentPrice.findMany({
    where: {
      tokenAddress: { in: getPricingAssets() },
    },
  });

  const mapped: { [token: string]: number } = {};
  prices.forEach((p) => (mapped[p.tokenAddress] = p.price));
  return mapped;
}