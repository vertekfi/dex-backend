import axios from 'axios';
import { config } from 'dotenv';

const BASE_URL = 'https://api.bscscan.com/api';

class BscScanService {
  readonly apiKey: string;

  constructor() {
    config();
    this.apiKey = process.env.BSC_SCAN_API_KEY;
  }

  async getBlockNumberByTimestamp(timestamp: number): Promise<number> {
    try {
      const { data } = await axios.get(
        `${BASE_URL}?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${this.apiKey}`,
      );

      return parseInt(data.result);
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

export const bscScanService = new BscScanService();
