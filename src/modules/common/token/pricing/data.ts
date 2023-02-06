import { parseUnits } from 'ethers/lib/utils';
import { PrismaService } from 'nestjs-prisma';
import { toLowerCaseArr } from 'src/modules/utils/general.utils';
import { getChainId } from '../../web3/rpc.provider';
import { PricingAssetInfo } from '../types';
import { getTokenAddress } from '../utils';

const pricingPoolsMap = {
  56: {
    [getTokenAddress('VRTK')]: {
      poolId: '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000',
      priceAgainst: getTokenAddress('WBNB'), // Another token in the pool to usd price against
      inputAmount: parseUnits('1'),
    },
    [getTokenAddress('AMES')]: {
      poolId: '0x248d943b9d59c4be35d41b34f79370dfbf577b2b000200000000000000000002',
      priceAgainst: getTokenAddress('BUSD'),
      inputAmount: parseUnits('1'),
    },
    [getTokenAddress('ASHARE')]: {
      poolId: '0x0db861235c7b90d419a64e1f71b3687db74d4477000200000000000000000001',
      priceAgainst: getTokenAddress('BUSD'),
      inputAmount: parseUnits('0.1'),
    },
    [getTokenAddress('wAALTO')]: {
      poolId: '0xcf61cf9654f5536b8d6c93f09a0308ff3c2650f9000200000000000000000015',
      priceAgainst: getTokenAddress('BUSD'),
      inputAmount: parseUnits('1'),
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
      inputAmount: parseUnits('1'),
    },
    [getTokenAddress('LION_SHARE')]: {
      poolId: '0x6e30ec031f2d94c397e469b40f86bff0be014124000200000000000000000006',
      priceAgainst: getTokenAddress('DAI'),
      inputAmount: parseUnits('1'),
    },
    [getTokenAddress('MAGIK')]: {
      poolId: '0xa237bd3b190f12661ed838033b7228e7dc9c78d8000100000000000000000014',
      priceAgainst: getTokenAddress('WBNB'),
      inputAmount: parseUnits('1'),
    },
    [getTokenAddress('UP')]: {
      poolId: '0x64bf08fac067b25c77967affafce73760d8d0bdf000200000000000000000011',
      priceAgainst: getTokenAddress('BUSD'),
      inputAmount: parseUnits('1'),
    },
  },
};

const pricingAssets = {
  56: [
    getTokenAddress('WBNB'),
    getTokenAddress('BUSD'),
    getTokenAddress('ETH'),
    getTokenAddress('DAI'),
    getTokenAddress('WBTC'),
    getTokenAddress('USDC'),
    getTokenAddress('USDT'),
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
