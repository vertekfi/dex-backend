import { RateLimiter } from 'limiter';
import { parseUnits } from 'ethers/lib/utils';
import { getDexPriceFromPair } from 'src/modules/common/token/pricing/dexscreener';
import { SorTokenPriceService } from '../types';
import { COINGECKO_BASE_URL } from '../api/constants';
import axios from 'axios';

/* coingecko has a rate limit of 10-50req/minute
   https://www.coingecko.com/en/api/pricing:
   Our free API has a rate limit of 10-50 calls per minute,
   if you exceed that limit you will be blocked until the next 1 minute window.
   Do revise your queries to ensure that you do not exceed our limits should
   that happen.

*/
const requestRateLimiter = new RateLimiter({ tokensPerInterval: 15, interval: 'minute' });

const priceCache: {
  [address: string]: {
    lastTimestamp: number;
    price: string;
  };
} = {};

const ttl = 1000 * 30;

export class SorV1PriceService implements SorTokenPriceService {
  constructor() {}

  async getTokenPrice(token: string): Promise<string> {
    const price = await this.getPrice(token);
    return String(price);
  }

  async getNativeAssetPriceInToken(tokenAddress: string): Promise<string> {
    try {
      const wbnbPair = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';
      const nativeInfo = await getDexPriceFromPair('bsc', wbnbPair);
      const assetPrice = await this.getPrice(tokenAddress);

      return parseUnits(String(nativeInfo.priceNum / assetPrice)).toString();
    } catch (error) {
      console.log('Error getting price from dexscreener');
    }
  }

  private async getPrice(token: string): Promise<number> {
    try {
    } catch (error) {
      console.error('SorV1: coingecko price fetch failed');
    }
    const address = token.toLowerCase();

    const cached = priceCache[address];
    const now = Date.now();

    if (!cached || now - cached.lastTimestamp > ttl) {
      const remainingRequests = await requestRateLimiter.removeTokens(1);
      console.log('Remaining coingecko requests', remainingRequests);

      const endpoint = `${COINGECKO_BASE_URL}/simple/token_price/binance-smart-chain?contract_addresses=${address}&vs_currencies=usd`;
      const { data } = await axios.get(endpoint);

      const price = data[address]?.usd;

      priceCache[address] = {
        lastTimestamp: Date.now(),
        price: String(price),
      };
    }

    return parseFloat(priceCache[address].price);
  }
}
