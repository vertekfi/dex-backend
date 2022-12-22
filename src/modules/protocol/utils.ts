import axios from 'axios';
import { ProtocolConfigData } from './types';

export async function getProtocolTokenList() {
  const url = 'https://raw.githubusercontent.com/0xBriz/token-list/main/tokenlist.json';
  const { data } = await axios.get(url);

  return data[url].tokens;
}

export async function getProtocolConfigDataForChain(chainId: number): Promise<ProtocolConfigData> {
  const url = 'https://raw.githubusercontent.com/aequinoxfi/pool-data-config/main/pool-data.json';
  const { data } = await axios.get(url);
  return data[String(chainId)];
}
