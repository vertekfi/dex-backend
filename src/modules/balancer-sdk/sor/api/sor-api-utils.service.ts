// import { BigNumber, ethers } from 'ethers';
// import { BigNumber as OldBigNumber } from 'bignumber.js';
// import { Contract } from '@ethersproject/contracts';
// import { AprBreakdown, Price, SubgraphPoolBase, SwapTypes, Token } from '@balancer-labs/sdk';
// import {
//   NativeAssetAddress,
//   NativeAssetPriceSymbol,
//   //   POOL_SCHEMA,
//   //   POOL_TOKEN_SCHEMA,
// } from './constants';
// import { isEqual, compact, pick } from 'lodash';
// import { inspect } from 'util';
// import { Inject, Injectable } from '@nestjs/common';
// import { TokenService } from 'src/modules/common/token/token.service';
// import { PrismaPool, PrismaToken } from '@prisma/client';
// import { RPC } from 'src/modules/common/web3/rpc.provider';
// import { AccountWeb3 } from 'src/modules/common/types';

// const CHAIN_MAP = {
//   '5': 'goerli',
//   '56': 'bsc',
// };

// @Injectable()
// export class SorApiUtils {
//   constructor(@Inject(RPC) private rpc: AccountWeb3, private readonly tokenService: TokenService) {}

//   async getTokenInfo( address: string): Promise<Token> {
//     const tokenAddress = ethers.utils.getAddress(address);
//     const cachedInfo = await this.tokenService.getToken(tokenAddress);
//     if (cachedInfo !== undefined) {
//       return cachedInfo;
//     }

//     const contract = new Contract(
//       tokenAddress,
//       ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
//       this.rpc.provider,
//     );

//     let symbol = `${tokenAddress.slice(0, 4)}..${tokenAddress.slice(40)}`;
//     try {
//       symbol = await contract.symbol();
//       // eslint-disable-next-line no-empty
//     } catch {}

//     let decimals = 18;
//     try {
//       decimals = await contract.decimals();
//       decimals = BigNumber.from(decimals).toNumber();
//       // eslint-disable-next-line no-empty
//     } catch {}

//     const tokenInfo = {
//       chainId,
//       address: tokenAddress,
//       symbol,
//       decimals,
//       price: {},
//     };

//     return tokenInfo;
//   }

//   // getTokenAddressesFromPools(pools: PrismaPool[]): string[] {
//   //   const tokenAddressMap = {};
//   //   pools.forEach((pool) => {
//   //     pool.tokens.forEach((address) => {
//   //       tokenAddressMap[address] = true;
//   //     });

//   //     pool.
//   //   });
//   //   return Object.keys(tokenAddressMap);
//   // }

//   async getSymbol(tokenAddress: string) {
//     const tokenInfo = await this.getTokenInfo(tokenAddress);
//     return tokenInfo.symbol;
//   }
//   async getDecimals(provider, chainId: number, tokenAddress: string) {
//     const tokenInfo = await getTokenInfo(provider, chainId, tokenAddress);
//     return tokenInfo.decimals;
//   }

//   getPlatformId(chainId: string | number): string | undefined {
//     return CHAIN_MAP[chainId.toString()];
//   }

//   getSubgraphURL(chainId: number): string {
//     switch (chainId) {
//       case 5:
//         return 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2';
//       case 56:
//         return 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2';
//     }
//   }

//   isValidChainId(networkId: number): boolean {
//     return Object.values(CHAIN_MAP).includes(networkId.toString());
//   }

//   getNativeAssetAddress(chainId: string | number): string {
//     const mapping = {
//       '5': NativeAssetAddress.ETH,
//       '56': NativeAssetAddress.BSC,
//     };

//     return mapping[chainId.toString()] || 'bnb';
//   }

//   getNativeAssetPriceSymbol(chainId: string | number): string {
//     const mapping = {
//       '5': NativeAssetPriceSymbol.ETH,
//       '56': NativeAssetPriceSymbol.BSC,
//     };

//     return mapping[chainId.toString()] || 'bnb';
//   }

//   /**
//    * Used for converting a Balancer Pool type to a SubgraphPoolBase type which is what SOR expects
//    *
//    * Some parameters are optional in a Balancer Pool but required in SubgraphPoolBase so default values or null are set for them
//    */
//   convertPoolToSubgraphPoolBase(pool: Pool): SubgraphPoolBase {
//     const tokens = pool.tokens.map((poolToken) => {
//       return {
//         ...poolToken,
//         ...{
//           decimals: poolToken.decimals || 18,
//           priceRate: poolToken.priceRate || null,
//           weight: poolToken.weight || null,
//         },
//       };
//     });
//     return {
//       ...pool,
//       ...{ tokens },
//     };
//   }

//   isSame(newPool: Pool, oldPool?: Pool): boolean {
//     if (!oldPool) return false;

//     // const poolFieldsToCompare = getNonStaticSchemaFields(POOL_SCHEMA);
//     // const tokenFieldsToCompare = getNonStaticSchemaFields(POOL_TOKEN_SCHEMA);

//     const filteredOldPool = pick(oldPool, poolFieldsToCompare);
//     filteredOldPool.tokens = oldPool.tokens.map((token) => pick(token, tokenFieldsToCompare));
//     const filteredNewPool = pick(newPool, poolFieldsToCompare);
//     filteredNewPool.tokens = newPool.tokens.map((token) => pick(token, tokenFieldsToCompare));

//     const newPoolFields = Object.keys(filteredNewPool);

//     for (const key of newPoolFields) {
//       if (!isEqual(filteredNewPool[key], filteredOldPool[key])) {
//         console.log(
//           `Updating pool ${newPool.id} -  ${key} is not equal. New: ${inspect(
//             filteredNewPool[key],
//             false,
//             null,
//           )} Old: ${inspect(filteredOldPool[key], false, null)}`,
//         );
//         return false;
//       }
//     }
//     return true;
//   }

//   isValidApr(apr: AprBreakdown) {
//     for (const value of Object.values(apr)) {
//       if (typeof value === 'object') {
//         if (!isValidApr(value)) return false;
//       } else {
//         if (isNaN(value)) return false;
//         if (!isFinite(value)) return false;
//       }
//     }

//     return true;
//   }

//   /** Formats a price correctly for storage. Does the following:
//    *  - Converts prices in scientific notation to decimal (e.g. 1.63e-7 => 0.000000163)
//    *
//    */
//   formatPrice(price: Price): Price {
//     const formattedPrice: Price = {};
//     Object.entries(price).forEach(([currency, value]) => {
//       formattedPrice[currency] = new OldBigNumber(value).toFixed();
//     });

//     return formattedPrice;
//   }

//   /**
//    * Takes a list of currentPools and newPools and returns a list
//    * of all pools that have changed in newPools
//    */

//   getChangedPools(newPools: Pool[], currentPools: Pool[]) {
//     const currentPoolsMap = Object.fromEntries(
//       currentPools.map((pool) => {
//         return [pool.id, pool];
//       }),
//     );

//     return newPools.filter((pool) => {
//       return !isSame(pool, currentPoolsMap[pool.id]);
//     });
//   }

//   getNonStaticSchemaFields(schema: Schema): string[] {
//     const nonStaticFields = Object.entries(schema).map(([name, details]) => {
//       if (details.static) {
//         return null;
//       }
//       return name;
//     });
//     return compact(nonStaticFields);
//   }
// }
