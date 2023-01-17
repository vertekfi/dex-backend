import { TokenPriceHandler } from '../../types';
import { PrismaService } from 'nestjs-prisma';
import { PrismaTokenWithTypes } from 'prisma/prisma-types';
import { timestampRoundedUpToNearestHour } from 'src/modules/utils/time';
import {
  DS_ADDRESS_CAP,
  DS_CHAIN_MAP,
  getDexPairInfo,
} from 'src/modules/common/token/pricing/dexscreener';
import { PROTOCOL_TOKEN } from 'src/modules/common/web3/contract.service';
import { chunk, uniq } from 'lodash';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { isDexscreenerToken } from '../utils';
import { nestApp } from 'src/main';

export class DexscreenerPriceHandlerService implements TokenPriceHandler {
  public readonly exitIfFails = false;
  public readonly id = 'DexscreenerPriceHandlerService';

  private readonly prisma: PrismaService;

  constructor() {
    this.prisma = nestApp.get(PrismaService);
  }

  async getAcceptedTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    return tokens.filter(isDexscreenerToken).map((token) => token.address);
  }

  async updatePricesForTokens(tokens: PrismaTokenWithTypes[]): Promise<string[]> {
    const timestamp = timestampRoundedUpToNearestHour();

    let updated: string[] = [];
    let operations: any[] = [];
    const chainId = parseInt(process.env.CHAIN_ID);
    tokens = tokens.filter((t) => t.chainId === chainId);
    let price: number;

    const chunks = chunk(tokens, DS_ADDRESS_CAP);

    for (const chunk of chunks) {
      // We know the token has the pair address at this point
      let pairAddresses = uniq(chunk.map((t) => t.dexscreenPairAddress));
      // if (pairAddresses.length > DS_ADDRESS_CAP) {
      //   pairAddresses = pairAddresses.slice(0, DS_ADDRESS_CAP);
      // }

      const data = await getDexPairInfo(DS_CHAIN_MAP[chainId], pairAddresses.join(','));

      for (const item of data.pairs) {
        price = parseFloat(item.priceUsd);

        const token = tokens.find(
          (t) => t.dexscreenPairAddress.toLowerCase() === item.pairAddress.toLowerCase(),
        );

        // create a history record
        operations.push(
          this.prisma.prismaTokenPrice.upsert({
            where: { tokenAddress_timestamp: { tokenAddress: token.address, timestamp } },
            update: { price: price, close: price },
            create: {
              tokenAddress: token.address,
              timestamp,
              price,
              high: price,
              low: price,
              open: price,
              close: price,
            },
          }),
        );

        // Update current price record
        operations.push(
          this.prisma.prismaTokenCurrentPrice.upsert({
            where: { tokenAddress: token.address },
            update: { price: price },
            create: {
              tokenAddress: token.address,
              timestamp,
              price,
            },
          }),
        );

        updated.push(token.address);
      }
    }

    // TODO: For testing only until screener or gecko is setup
    if (chainId === 5) {
      const tokenAddress = PROTOCOL_TOKEN[chainId].toLowerCase();

      price = 7;

      // create a history record
      operations.push(
        this.prisma.prismaTokenPrice.upsert({
          where: { tokenAddress_timestamp: { tokenAddress: tokenAddress, timestamp } },
          update: { price: price, close: price },
          create: {
            tokenAddress: tokenAddress,
            timestamp,
            price,
            high: price,
            low: price,
            open: price,
            close: price,
          },
        }),
      );

      // Update current price record
      operations.push(
        this.prisma.prismaTokenCurrentPrice.upsert({
          where: { tokenAddress: tokenAddress },
          update: { price: price },
          create: {
            tokenAddress: tokenAddress,
            timestamp,
            price,
          },
        }),
      );

      updated.push(tokenAddress);
    }

    await prismaBulkExecuteOperations(operations);

    return updated;
  }
}
