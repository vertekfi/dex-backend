import { Injectable } from '@nestjs/common';
import { config } from 'dotenv';
import { SUBGRAPHS } from '../data/addresses';

export interface Config {
  REDIS_URL: string;
  REDIS_PORT: number;
  PORT: number;
  NODE_ENV: string;
  BALANCER_SUBGRAPH: string;
  GAUGES_SUBGRAPH: string;
  CHAIN_ID: number;
  NATIVE_ASSET_ADDRESS: string;
  WRAPPED_NATIVE_ASSET_ADDRESS: string;
  COINGECKO_NATIVE_ASSET_ID: string;
  COINGECKO_PLATFORM_ID: string;
  PROTOCOL_TOKEN_ADDRESS: string;
  PROTOCOL_TOKEN_SYMBOL: string;
  HOST: string;
}

const NATIVE_IDS = {
  5: 'ethereum',
  56: 'binancecoin',
};

const WRAPPED_NATIVE_ADDRESSES = {
  5: '0xBd0be709AbE750641524fDECA1F49544440B7C0d',
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
};

@Injectable()
export class ConfigService {
  private _env: Config;

  get env() {
    return this._env;
  }

  constructor() {
    config();

    const CHAIN_ID = parseInt(process.env.CHAIN_ID);

    this._env = {
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PORT: parseInt(process.env.REDIS_PORT),
      HOST: process.env.HOST,
      PORT: parseInt(process.env.PORT),
      NODE_ENV: process.env.NODE_ENV,
      BALANCER_SUBGRAPH: SUBGRAPHS.BAL[CHAIN_ID],
      GAUGES_SUBGRAPH: SUBGRAPHS.GAUGES[CHAIN_ID],
      CHAIN_ID,
      // CHAIN_SLUG: String,
      NATIVE_ASSET_ADDRESS: process.env.NATIVE_ASSET_ADDRESS,
      WRAPPED_NATIVE_ASSET_ADDRESS: WRAPPED_NATIVE_ADDRESSES[CHAIN_ID],
      COINGECKO_NATIVE_ASSET_ID: NATIVE_IDS[CHAIN_ID],
      COINGECKO_PLATFORM_ID: process.env.COINGECKO_PLATFORM_ID,
      PROTOCOL_TOKEN_ADDRESS: process.env.PROTOCOL_TOKEN_ADDRESS,
      PROTOCOL_TOKEN_SYMBOL: process.env.PROTOCOL_TOKEN_SYMBOL,
    };
  }
}
