import axios from 'axios';

const DEXSCREENER_PAIR_BASE_URL = 'https://api.dexscreener.io/latest/dex/pairs/';

export const DS_CHAIN_MAP = {
  5: 'bsc',
  56: 'bsc',
};

export async function getDexPairInfo(chainSymbol: 'bsc', pairAddress: string) {
  try {
    const req = await axios.get(`${DEXSCREENER_PAIR_BASE_URL}${chainSymbol}/${pairAddress}`);
    return req.data;
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
