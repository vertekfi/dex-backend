import { getChainId } from '../../web3/rpc.provider';
import { PoolPricingMap, PricingAssetInfo } from '../types';
import { getTokenAddress } from '../utils';

const pricingPoolsMap: { [chainId: number]: PoolPricingMap } = {
  56: {
    [getTokenAddress('VRTK')]: {
      poolId: '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000',
      priceAgainst: 'WBNB', // Another token in the pool to usd price against
    },
    [getTokenAddress('AMES')]: {
      poolId: '0x248d943b9d59c4be35d41b34f79370dfbf577b2b000200000000000000000002',
      priceAgainst: 'BUSD',
    },
    [getTokenAddress('wAALTO')]: {
      poolId: '0x5deb10ed6a66a1e6188b7925a723b6bdfd97476500020000000000000000000a',
      priceAgainst: 'BUSD',
    },
  },
};

const pricingAssets = {
  56: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '0xe9e7cea3dedca5984780bafc599bd69add087d56'],
};

function createPricingAsset(symbol: string, coingeckoId: string): PricingAssetInfo {
  return {
    address: getTokenAddress(symbol),
    symbol,
    coingeckoId,
  };
}

export const priceAssetsConfig: { [chainId: number]: PricingAssetInfo[] } = {
  56: [createPricingAsset('WBNB', 'wbnb'), createPricingAsset('BUSD', 'binancecoin')],
};

export function getPricingAssets() {
  return pricingAssets[getChainId()].map((t) => t.toLowerCase());
}

export function getPoolPricingMap() {
  return pricingPoolsMap[getChainId()];
}
