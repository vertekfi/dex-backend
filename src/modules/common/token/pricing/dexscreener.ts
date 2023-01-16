import axios from 'axios';
import { DexScreenerApiResult } from '../types';
import { RateLimiter } from 'limiter';

const requestRateLimiter = new RateLimiter({ tokensPerInterval: 300, interval: 'minute' });

const DEXSCREENER_PAIR_BASE_URL = 'https://api.dexscreener.io/latest/dex/pairs/';

export const DS_CHAIN_MAP = {
  5: 'bsc',
  56: 'bsc',
};

export // They allow at most 30 to be used in one call
const DS_ADDRESS_CAP = 30;

export async function getDexPairInfo(
  chainSymbol: 'bsc',
  pairAddress: string,
): Promise<DexScreenerApiResult> {
  try {
    return trackRequest(`${DEXSCREENER_PAIR_BASE_URL}${chainSymbol}/${pairAddress}`);
  } catch (error) {
    throw error;
  }
}

export async function getDexPriceFromPair(chainSymbol: 'bsc', pairAddress: string) {
  try {
    const data = await getDexPairInfo(chainSymbol, pairAddress);
    if (data.pair) {
      const price = data.pair.priceUsd;
      return {
        priceUI: `$${price}`,
        priceNum: Number(price),
      };
    }

    return {
      priceUI: `$0`,
      priceNum: 0,
    };
  } catch (error) {
    throw error;
  }
}

async function trackRequest(url: string) {
  const remainingRequests = await requestRateLimiter.removeTokens(1);
  console.log('Remaining Dexscreener requests', remainingRequests);
  const req = await axios.get(url);
  return req.data;
}
