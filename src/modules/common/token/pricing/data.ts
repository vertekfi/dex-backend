import { PoolPricingMap } from '../types';

const pricingPoolsMap: { [chainId: number]: PoolPricingMap } = {
  56: {
    '0xed236c32f695c83efde232c288701d6f9c23e60e': {
      poolId: '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000',
      priceAgainst: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // Another token in the pool to usd price against
    },
  },
};

const pricingAssets = {
  56: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '0xe9e7cea3dedca5984780bafc599bd69add087d56'],
};

export function getPricingAssets(chainId: number) {
  return pricingAssets[chainId].map((t) => t.toLowerCase());
}

export function getPoolPricingMap(chainId: number) {
  return pricingPoolsMap[chainId];
}
