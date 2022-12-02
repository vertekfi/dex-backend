import { Injectable } from '@nestjs/common';
import {
  PrismaNestedPoolWithSingleLayerNesting,
  PrismaPoolMinimal,
  PrismaPoolTokenWithDynamicData,
  PrismaPoolTokenWithExpandedNesting,
  PrismaPoolWithExpandedNesting,
} from 'prisma/prisma-types';

import * as _ from 'lodash';
import { isSameAddress } from '@balancer-labs/sdk';
import { networkConfig } from 'src/modules/config/network-config';
import { GqlExt } from 'src/modules/gql/utils';
import { isWeightedPoolV2 } from './pool-utils';
import {
  GqlPoolDynamicData,
  GqlPoolInvestConfig,
  GqlPoolInvestOption,
  GqlPoolToken,
  GqlPoolWithdrawConfig,
  GqlPoolWithdrawOption,
  GqlPoolNestingType,
} from 'src/graphql';

@Injectable()
export class PoolGqlLoaderUtils {
  constructor() {}

  getPoolDynamicData(pool: PrismaPoolMinimal): GqlPoolDynamicData {
    const {
      fees24h,
      totalLiquidity,
      volume24h,
      fees48h,
      volume48h,
      totalLiquidity24hAgo,
      totalShares24hAgo,
      lifetimeVolume,
      lifetimeSwapFees,
      holdersCount,
      swapsCount,
      sharePriceAth,
      sharePriceAthTimestamp,
      sharePriceAtl,
      sharePriceAtlTimestamp,
      totalLiquidityAth,
      totalLiquidityAthTimestamp,
      totalLiquidityAtl,
      totalLiquidityAtlTimestamp,
      volume24hAtl,
      volume24hAthTimestamp,
      volume24hAth,
      volume24hAtlTimestamp,
      fees24hAtl,
      fees24hAthTimestamp,
      fees24hAth,
      fees24hAtlTimestamp,
    } = pool.dynamicData!;
    const aprItems =
      pool.aprItems?.filter((item) => item.apr > 0 || (item.range?.min ?? 0 > 0)) || [];
    const swapAprItems = aprItems.filter((item) => item.type == 'SWAP_FEE');

    // swap apr cannot have a range, so we can already sum it up
    const aprItemsWithNoGroup = aprItems.filter((item) => !item.group);

    const hasAprRange = !!aprItems.find((item) => item.range);
    let totalApr: string;
    let minApr: string | undefined;
    let maxApr: string | undefined;
    let swapApr: string;
    let nativeRewardApr: string;
    let thirdPartyApr: string;

    let hasRewardApr = false;

    if (hasAprRange) {
      let swapFeeApr = 0;
      let minTotalApr = 0;
      let maxTotalApr = 0;
      let minNativeRewardApr = 0;
      let maxNativeRewardApr = 0;
      let minThirdPartyApr = 0;
      let maxThirdPartyApr = 0;
      for (let aprItem of aprItems) {
        let minApr: number;
        let maxApr: number;
        if (aprItem.range) {
          minApr = aprItem.range.min;
          maxApr = aprItem.range.max;
        } else {
          minApr = aprItem.apr;
          maxApr = aprItem.apr;
        }
        minTotalApr += minApr;
        maxTotalApr += maxApr;

        switch (aprItem.type) {
          case 'NATIVE_REWARD': {
            minNativeRewardApr += minApr;
            maxNativeRewardApr += maxApr;
            break;
          }
          case 'THIRD_PARTY_REWARD': {
            minThirdPartyApr += minApr;
            maxThirdPartyApr += maxApr;
          }
          case 'SWAP_FEE': {
            swapFeeApr += maxApr;
            break;
          }
        }
      }
      swapApr = `${swapFeeApr}`;
      totalApr = `${maxTotalApr}`;
      minApr = `${minTotalApr}`;
      maxApr = `${maxTotalApr}`;
      nativeRewardApr = `${maxNativeRewardApr}`;
      thirdPartyApr = `${maxThirdPartyApr}`;
      hasRewardApr = maxNativeRewardApr > 0 || maxThirdPartyApr > 0;
    } else {
      const nativeRewardAprItems = aprItems.filter((item) => item.type === 'NATIVE_REWARD');
      const thirdPartyRewardAprItems = aprItems.filter(
        (item) => item.type === 'THIRD_PARTY_REWARD',
      );
      totalApr = `${_.sumBy(aprItems, 'apr')}`;
      swapApr = `${_.sumBy(swapAprItems, 'apr')}`;
      nativeRewardApr = `${_.sumBy(nativeRewardAprItems, 'apr')}`;
      thirdPartyApr = `${_.sumBy(thirdPartyRewardAprItems, 'apr')}`;
      hasRewardApr = nativeRewardAprItems.length > 0 || thirdPartyRewardAprItems.length > 0;
    }

    const grouped = _.groupBy(
      aprItems.filter((item) => item.group),
      (item) => item.group,
    );

    return {
      ...pool.dynamicData!,
      totalLiquidity: `${totalLiquidity}`,
      totalLiquidity24hAgo: `${totalLiquidity24hAgo}`,
      totalShares24hAgo,
      fees24h: `${fees24h}`,
      volume24h: `${volume24h}`,
      fees48h: `${fees48h}`,
      volume48h: `${volume48h}`,
      lifetimeVolume: `${lifetimeVolume}`,
      lifetimeSwapFees: `${lifetimeSwapFees}`,
      holdersCount: `${holdersCount}`,
      swapsCount: `${swapsCount}`,
      sharePriceAth: `${sharePriceAth}`,
      sharePriceAtl: `${sharePriceAtl}`,
      totalLiquidityAth: `${totalLiquidityAth}`,
      totalLiquidityAtl: `${totalLiquidityAtl}`,
      volume24hAtl: `${volume24hAtl}`,
      volume24hAth: `${volume24hAth}`,
      fees24hAtl: `${fees24hAtl}`,
      fees24hAth: `${fees24hAth}`,
      sharePriceAthTimestamp,
      sharePriceAtlTimestamp,
      totalLiquidityAthTimestamp,
      totalLiquidityAtlTimestamp,
      fees24hAthTimestamp,
      fees24hAtlTimestamp,
      volume24hAthTimestamp,
      volume24hAtlTimestamp,
      apr: {
        total: totalApr,
        min: minApr,
        max: maxApr,
        swapApr,
        nativeRewardApr,
        thirdPartyApr,
        items: [
          ...aprItemsWithNoGroup.flatMap((item) => {
            if (item.range) {
              return [
                {
                  id: `${item.id}-min`,
                  apr: item.range.min.toString(),
                  title: `Min ${item.title}`,
                  subItems: [],
                },
                {
                  id: `${item.id}-max`,
                  apr: item.range.max.toString(),
                  title: `Max ${item.title}`,
                  subItems: [],
                },
              ];
            } else {
              return [
                {
                  ...item,
                  apr: `${item.apr}`,
                  subItems: [],
                },
              ];
            }
          }),
          ..._.map(grouped, (items, group) => {
            const subItems = items.map((item) => ({ ...item, apr: `${item.apr}` }));
            // todo: might need to support apr ranges as well at some point
            const apr = _.sumBy(items, 'apr');
            let title = '';

            switch (group) {
              case 'YEARN':
                title = 'Yearn boosted APR';
                break;
              case 'REAPER':
                title = 'Reaper boosted APR';
                break;
              case 'OVERNIGHT':
                title = 'Overnight boosted APR';
            }

            return {
              id: `${pool.id}-${group}`,
              title,
              apr: `${apr}`,
              subItems,
            };
          }),
        ],
        hasRewardApr,
      },
    };
  }

  getPoolInvestConfig(pool: PrismaPoolWithExpandedNesting): GqlPoolInvestConfig {
    const poolTokens = pool.tokens.filter((token) => token.address !== pool.address);
    const supportsNativeAssetDeposit = pool.type !== 'PHANTOM_STABLE';
    let options: GqlPoolInvestOption[] = [];

    for (const poolToken of poolTokens) {
      options = [
        ...options,
        ...this.getActionOptionsForPoolToken(pool, poolToken, supportsNativeAssetDeposit),
      ];
    }

    return {
      //TODO could flag these as disabled in sanity
      proportionalEnabled: pool.type !== 'PHANTOM_STABLE' && pool.type !== 'META_STABLE',
      singleAssetEnabled: true,
      options,
    };
  }

  private getActionOptionsForPoolToken(
    pool: PrismaPoolWithExpandedNesting,
    poolToken: PrismaPoolTokenWithExpandedNesting,
    supportsNativeAsset: boolean,
    isWithdraw?: boolean,
  ): { poolTokenAddress: string; poolTokenIndex: number; tokenOptions: GqlPoolToken[] }[] {
    const nestedPool = poolToken.nestedPool;
    const options: GqlPoolInvestOption[] = [];

    if (nestedPool && nestedPool.type === 'LINEAR' && nestedPool.linearData) {
      const mainToken = nestedPool.tokens[nestedPool.linearData.mainIndex];
      const isWrappedNativeAsset = isSameAddress(mainToken.address, networkConfig.weth.address);

      options.push({
        poolTokenIndex: poolToken.index,
        poolTokenAddress: poolToken.address,
        tokenOptions:
          //TODO: will be good to add support for depositing the wrapped token for the linear pool
          isWrappedNativeAsset && supportsNativeAsset
            ? [
                this.mapPoolTokenToGql(mainToken),
                this.mapPoolTokenToGql({
                  ...mainToken,
                  token: {
                    ...poolToken.token,
                    symbol: networkConfig.eth.symbol,
                    address: networkConfig.eth.address,
                    name: networkConfig.eth.name,
                  },
                  id: `${pool.id}-${networkConfig.eth.address}`,
                }),
              ]
            : [this.mapPoolTokenToGql(mainToken)],
      });
    } else if (nestedPool && nestedPool.type === 'PHANTOM_STABLE') {
      const nestedTokens = nestedPool.tokens.filter(
        (token) => token.address !== nestedPool.address,
      );

      if (pool.type === 'PHANTOM_STABLE' || isWeightedPoolV2(pool)) {
        // when nesting a phantom stable inside a phantom stable, all of the underlying tokens can be used when investing
        // when withdrawing from a v2 weighted pool, we withdraw into all underlying assets.
        // ie: USDC/DAI/USDT for nested bbaUSD
        for (const nestedToken of nestedTokens) {
          options.push({
            poolTokenIndex: poolToken.index,
            poolTokenAddress: poolToken.address,
            tokenOptions:
              nestedToken.nestedPool &&
              nestedToken.nestedPool.type === 'LINEAR' &&
              nestedToken.nestedPool.linearData
                ? [
                    this.mapPoolTokenToGql(
                      nestedToken.nestedPool.tokens[nestedToken.nestedPool.linearData.mainIndex],
                    ),
                  ]
                : [this.mapPoolTokenToGql(nestedToken)],
          });
        }
      } else {
        //if the parent pool does not have phantom bpt (ie: weighted), the user can only invest with 1 of the phantom stable tokens
        options.push({
          poolTokenIndex: poolToken.index,
          poolTokenAddress: poolToken.address,
          tokenOptions: nestedTokens.map((nestedToken) => {
            if (
              nestedToken.nestedPool &&
              nestedToken.nestedPool.type === 'LINEAR' &&
              nestedToken.nestedPool.linearData
            ) {
              return this.mapPoolTokenToGql(
                nestedToken.nestedPool.tokens[nestedToken.nestedPool.linearData.mainIndex],
              );
            }

            return this.mapPoolTokenToGql(nestedToken);
          }),
        });
      }
    } else {
      const isWrappedNativeAsset = isSameAddress(poolToken.address, networkConfig.weth.address);

      options.push({
        poolTokenIndex: poolToken.index,
        poolTokenAddress: poolToken.address,
        tokenOptions:
          isWrappedNativeAsset && supportsNativeAsset
            ? [
                this.mapPoolTokenToGql(poolToken),
                this.mapPoolTokenToGql({
                  ...poolToken,
                  token: {
                    ...poolToken.token,
                    symbol: networkConfig.eth.symbol,
                    address: networkConfig.eth.address,
                    name: networkConfig.eth.name,
                  },
                  id: `${pool.id}-${networkConfig.eth.address}`,
                }),
              ]
            : [this.mapPoolTokenToGql(poolToken)],
      });
    }

    return options;
  }

  private mapPoolTokenToGql(poolToken: PrismaPoolTokenWithDynamicData): GqlPoolToken & GqlExt {
    return {
      id: poolToken.id,
      ...poolToken.token,
      __typename: 'GqlPoolToken',
      priceRate: poolToken.dynamicData?.priceRate || '1.0',
      balance: poolToken.dynamicData?.balance || '0',
      index: poolToken.index,
      weight: poolToken.dynamicData?.weight,
      totalBalance: poolToken.dynamicData?.balance || '0',
    };
  }

  getPoolWithdrawConfig(pool: PrismaPoolWithExpandedNesting): GqlPoolWithdrawConfig {
    const poolTokens = pool.tokens.filter((token) => token.address !== pool.address);
    let options: GqlPoolWithdrawOption[] = [];

    for (const poolToken of poolTokens) {
      options = [...options, ...this.getActionOptionsForPoolToken(pool, poolToken, false, true)];
    }

    return {
      //TODO could flag these as disabled in sanity
      proportionalEnabled: true,
      singleAssetEnabled: true,
      options,
    };
  }

  getPoolNestingType(pool: PrismaNestedPoolWithSingleLayerNesting): GqlPoolNestingType {
    const tokens = pool.tokens.filter((token) => token.address !== pool.address);
    const numTokensWithNestedPool = tokens.filter((token) => !!token.nestedPool).length;

    if (numTokensWithNestedPool === tokens.length) {
      return GqlPoolNestingType.HAS_ONLY_PHANTOM_BPT;
    } else if (numTokensWithNestedPool > 0) {
      return GqlPoolNestingType.HAS_SOME_PHANTOM_BPT;
    }

    return GqlPoolNestingType.NO_NESTING;
  }

  //   mapPoolTokenToGqlUnion(token: PrismaPoolTokenWithExpandedNesting): GqlPoolTokenUnion {
  //     const { nestedPool } = token;

  //     if (nestedPool && nestedPool.type === 'LINEAR') {
  //         const totalShares = parseFloat(nestedPool.dynamicData?.totalShares || '0');
  //         const percentOfSupplyNested =
  //             totalShares > 0 ? parseFloat(token.dynamicData?.balance || '0') / totalShares : 0;

  //         return {
  //             ...this.mapPoolTokenToGql(token),
  //             __typename: 'GqlPoolTokenLinear',
  //             ...this.getLinearPoolTokenData(token, nestedPool),
  //             pool: this.mapNestedPoolToGqlPoolLinearNested(nestedPool, percentOfSupplyNested),
  //         };
  //     } else if (nestedPool && nestedPool.type === 'PHANTOM_STABLE') {
  //         const totalShares = parseFloat(nestedPool.dynamicData?.totalShares || '0');
  //         const percentOfSupplyNested =
  //             totalShares > 0 ? parseFloat(token.dynamicData?.balance || '0') / totalShares : 0;

  //         //50_000_000_000_000
  //         return {
  //             ...this.mapPoolTokenToGql(token),
  //             __typename: 'GqlPoolTokenPhantomStable',
  //             pool: this.mapNestedPoolToGqlPoolPhantomStableNested(nestedPool, percentOfSupplyNested),
  //         };
  //     }

  //     return this.mapPoolTokenToGql(token);
  // }
}
