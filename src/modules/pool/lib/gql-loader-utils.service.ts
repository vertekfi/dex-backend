import { Injectable } from '@nestjs/common';
import {
  PrismaNestedPoolWithNoNesting,
  PrismaNestedPoolWithSingleLayerNesting,
  PrismaPoolMinimal,
  PrismaPoolTokenWithDynamicData,
  PrismaPoolTokenWithExpandedNesting,
  PrismaPoolWithExpandedNesting,
} from 'prisma/prisma-types';

import * as _ from 'lodash';
import { isSameAddress } from '@balancer-labs/sdk';
import { networkConfig } from 'src/modules/config/network-config';
import { isWeightedPoolV2 } from './pool-utils';
import {
  GqlPoolDynamicData,
  GqlPoolInvestConfig,
  GqlPoolInvestOption,
  GqlPoolToken,
  GqlPoolWithdrawConfig,
  GqlPoolWithdrawOption,
  GqlPoolNestingType,
  GqlPoolTokenUnion,
  GqlPoolLinearNested,
  GqlPoolPhantomStableNested,
  GqlPoolTokenExpanded,
  GqlPoolTokenDisplay,
} from 'src/graphql';
import { oldBnum } from 'src/modules/utils/old-big-number';
import { Prisma } from '@prisma/client';
import { QueryPoolGetPoolsArgs } from 'src/gql-addons';

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

  mapPoolTokenToGqlUnion(token: PrismaPoolTokenWithExpandedNesting): GqlPoolTokenUnion {
    const { nestedPool } = token;

    if (nestedPool && nestedPool.type === 'LINEAR') {
      const totalShares = parseFloat(nestedPool.dynamicData?.totalShares || '0');
      const percentOfSupplyNested =
        totalShares > 0 ? parseFloat(token.dynamicData?.balance || '0') / totalShares : 0;

      return {
        ...this.mapPoolTokenToGql(token),
        __typename: 'GqlPoolTokenLinear',
        ...this.getLinearPoolTokenData(token, nestedPool),
        pool: this.mapNestedPoolToGqlPoolLinearNested(nestedPool, percentOfSupplyNested),
      };
    } else if (nestedPool && nestedPool.type === 'PHANTOM_STABLE') {
      const totalShares = parseFloat(nestedPool.dynamicData?.totalShares || '0');
      const percentOfSupplyNested =
        totalShares > 0 ? parseFloat(token.dynamicData?.balance || '0') / totalShares : 0;

      //50_000_000_000_000
      return {
        ...this.mapPoolTokenToGql(token),
        __typename: 'GqlPoolTokenPhantomStable',
        pool: this.mapNestedPoolToGqlPoolPhantomStableNested(nestedPool, percentOfSupplyNested),
      };
    }

    return this.mapPoolTokenToGql(token);
  }

  getLinearPoolTokenData(
    poolToken: PrismaPoolTokenWithDynamicData,
    nestedPool: PrismaNestedPoolWithNoNesting,
  ): {
    mainTokenBalance: string;
    wrappedTokenBalance: string;
    totalMainTokenBalance: string;
  } {
    if (!poolToken.dynamicData || !nestedPool.linearData || !nestedPool.dynamicData) {
      return {
        mainTokenBalance: '0',
        wrappedTokenBalance: '0',
        totalMainTokenBalance: '0',
      };
    }

    const percentOfSupplyInPool =
      parseFloat(poolToken.dynamicData.balance) / parseFloat(nestedPool.dynamicData.totalShares);

    const mainToken = nestedPool.tokens[nestedPool.linearData.mainIndex];
    const wrappedToken = nestedPool.tokens[nestedPool.linearData.wrappedIndex];

    const wrappedTokenBalance = oldBnum(wrappedToken.dynamicData?.balance || '0').times(
      percentOfSupplyInPool,
    );
    const mainTokenBalance = oldBnum(mainToken.dynamicData?.balance || '0').times(
      percentOfSupplyInPool,
    );

    return {
      mainTokenBalance: `${mainTokenBalance.toFixed(mainToken.token.decimals)}`,
      wrappedTokenBalance: `${wrappedTokenBalance.toFixed(wrappedToken.token.decimals)}`,
      totalMainTokenBalance: `${mainTokenBalance
        .plus(wrappedTokenBalance.times(wrappedToken.dynamicData?.priceRate || '1'))
        .toFixed(mainToken.token.decimals)}`,
    };
  }

  mapNestedPoolToGqlPoolLinearNested(
    pool: PrismaNestedPoolWithNoNesting,
    percentOfSupplyNested: number,
  ): GqlPoolLinearNested {
    const totalLiquidity = pool.dynamicData?.totalLiquidity || 0;
    const bpt = pool.tokens.find((token) => token.address === pool.address);

    return {
      __typename: 'GqlPoolLinearNested',
      ...pool,
      ...pool.linearData!,
      ...pool.linearDynamicData!,
      tokens: pool.tokens
        .filter((token) => token.address !== pool.address)
        .map((token) => {
          return {
            ...this.mapPoolTokenToGql({
              ...token,
              dynamicData: token.dynamicData
                ? {
                    ...token.dynamicData,
                    balance: `${parseFloat(token.dynamicData.balance) * percentOfSupplyNested}`,
                  }
                : null,
            }),
            totalBalance: token.dynamicData?.balance || '0',
          };
        }),
      totalLiquidity: `${totalLiquidity}`,
      totalShares: pool.dynamicData?.totalShares || '0',
      bptPriceRate: bpt?.dynamicData?.priceRate || '1.0',
    };
  }

  mapNestedPoolToGqlPoolPhantomStableNested(
    pool: PrismaNestedPoolWithSingleLayerNesting,
    percentOfSupplyNested: number,
  ): GqlPoolPhantomStableNested {
    const bpt = pool.tokens.find((token) => token.address === pool.address);

    return {
      // __typename: 'GqlPoolPhantomStableNested',
      ...pool,
      nestingType: this.getPoolNestingType(pool),
      tokens: pool.tokens
        .filter((token) => token.address !== pool.address)
        .map((token) => {
          const nestedPool = token.nestedPool;

          if (nestedPool && nestedPool.type === 'LINEAR') {
            const totalShares = parseFloat(nestedPool.dynamicData?.totalShares || '0');
            const percentOfLinearSupplyNested =
              totalShares > 0 ? parseFloat(token.dynamicData?.balance || '0') / totalShares : 0;

            return {
              ...this.mapPoolTokenToGql({
                ...token,
                dynamicData: token.dynamicData
                  ? {
                      ...token.dynamicData,
                      balance: `${parseFloat(token.dynamicData.balance) * percentOfSupplyNested}`,
                    }
                  : null,
              }),
              __typename: 'GqlPoolTokenLinear',
              ...this.getLinearPoolTokenData(token, nestedPool),
              pool: this.mapNestedPoolToGqlPoolLinearNested(
                nestedPool,
                percentOfSupplyNested * percentOfLinearSupplyNested,
              ),
              totalBalance: token.dynamicData?.balance || '0',
            };
          }

          return this.mapPoolTokenToGql(token);
        }),
      totalLiquidity: `${pool.dynamicData?.totalLiquidity || 0}`,
      totalShares: pool.dynamicData?.totalShares || '0',
      swapFee: pool.dynamicData?.swapFee || '0',
      amp: pool.stableDynamicData?.amp || '0',
      bptPriceRate: bpt?.dynamicData?.priceRate || '1.0',
    };
  }

  mapAllTokens(pool: PrismaPoolMinimal): GqlPoolTokenExpanded[] {
    return pool.allTokens.map((token) => {
      const poolToken = pool.tokens.find((poolToken) => poolToken.address === token.token.address);
      const isNested = !poolToken;
      const isPhantomBpt = token.tokenAddress === pool.address;
      const isMainToken = !token.token.types.some(
        (type) =>
          type.type === 'LINEAR_WRAPPED_TOKEN' ||
          type.type === 'PHANTOM_BPT' ||
          type.type === 'BPT',
      );

      return {
        ...token.token,
        id: `${pool.id}-${token.tokenAddress}`,
        weight: poolToken?.dynamicData?.weight,
        isNested,
        isPhantomBpt,
        isMainToken,
      };
    });
  }

  mapDisplayTokens(pool: PrismaPoolMinimal): GqlPoolTokenDisplay[] {
    return pool.tokens
      .filter((token) => token.address !== pool.address)
      .map((poolToken) => {
        const allToken = pool.allTokens.find(
          (allToken) => allToken.token.address === poolToken.address,
        )!;

        if (allToken.nestedPool?.type === 'LINEAR') {
          const mainToken = allToken.nestedPool.allTokens.find(
            (nestedToken) =>
              !nestedToken.token.types.some(
                (type) =>
                  type.type === 'LINEAR_WRAPPED_TOKEN' ||
                  type.type === 'PHANTOM_BPT' ||
                  type.type === 'BPT',
              ),
          );

          if (mainToken) {
            return {
              id: `${pool.id}-${mainToken.token.address}`,
              ...mainToken.token,
              weight: poolToken?.dynamicData?.weight,
            };
          }
        } else if (allToken.nestedPool?.type === 'PHANTOM_STABLE') {
          const mainTokens =
            allToken.nestedPool.allTokens.filter(
              (nestedToken) =>
                !nestedToken.token.types.some(
                  (type) =>
                    type.type === 'LINEAR_WRAPPED_TOKEN' ||
                    type.type === 'PHANTOM_BPT' ||
                    type.type === 'BPT',
                ),
            ) || [];

          return {
            id: `${pool.id}-${poolToken.token.address}`,
            ...poolToken.token,
            weight: poolToken?.dynamicData?.weight,
            nestedTokens: mainTokens.map((mainToken) => ({
              id: `${pool.id}-${poolToken.token.address}-${mainToken.tokenAddress}`,
              ...mainToken.token,
            })),
          };
        }

        return {
          id: `${pool.id}-${poolToken.token.address}`,
          ...poolToken.token,
          weight: poolToken?.dynamicData?.weight,
        };
      });
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

  private mapPoolTokenToGql(poolToken: PrismaPoolTokenWithDynamicData): GqlPoolToken {
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

  mapPoolToGqlPool(pool: PrismaPoolWithExpandedNesting) {
    const bpt = pool.tokens.find((token) => token.address === pool.address);

    const mappedData = {
      ...pool,
      decimals: 18,
      dynamicData: this.getPoolDynamicData(pool),
      investConfig: this.getPoolInvestConfig(pool),
      withdrawConfig: this.getPoolWithdrawConfig(pool),
      nestingType: this.getPoolNestingType(pool),
      tokens: pool.tokens
        .filter((token) => token.address !== pool.address)
        .map((token) => this.mapPoolTokenToGqlUnion(token)),
      allTokens: this.mapAllTokens(pool),
      displayTokens: this.mapDisplayTokens(pool),
    };

    //TODO: may need to build out the types here still
    switch (pool.type) {
      case 'STABLE':
        return {
          __typename: 'GqlPoolStable',
          ...mappedData,
          amp: pool.stableDynamicData?.amp || '0',
          tokens: mappedData.tokens as GqlPoolToken[],
        };
      case 'META_STABLE':
        return {
          __typename: 'GqlPoolMetaStable',
          ...mappedData,
          amp: pool.stableDynamicData?.amp || '0',
          tokens: mappedData.tokens as GqlPoolToken[],
        };
      case 'PHANTOM_STABLE':
        return {
          __typename: 'GqlPoolPhantomStable',
          ...mappedData,
          amp: pool.stableDynamicData?.amp || '0',
          bptPriceRate: bpt?.dynamicData?.priceRate || '1.0',
        };
      case 'LINEAR':
        return {
          __typename: 'GqlPoolLinear',
          ...mappedData,
          tokens: mappedData.tokens as GqlPoolToken[],
          mainIndex: pool.linearData?.mainIndex || 0,
          wrappedIndex: pool.linearData?.wrappedIndex || 0,
          lowerTarget: pool.linearDynamicData?.lowerTarget || '0',
          upperTarget: pool.linearDynamicData?.upperTarget || '0',
          bptPriceRate: bpt?.dynamicData?.priceRate || '1.0',
        };
      case 'ELEMENT':
        return {
          __typename: 'GqlPoolElement',
          ...mappedData,
          tokens: mappedData.tokens as GqlPoolToken[],
          baseToken: pool.elementData?.baseToken || '',
          unitSeconds: pool.elementData?.unitSeconds || '',
          principalToken: pool.elementData?.principalToken || '',
        };
      case 'LIQUIDITY_BOOTSTRAPPING':
        return {
          __typename: 'GqlPoolLiquidityBootstrapping',
          ...mappedData,
        };
    }

    return {
      __typename: 'GqlPoolWeighted',
      ...mappedData,
    };
  }

  mapToMinimalGqlPool(pool: PrismaPoolMinimal) {
    return {
      ...pool,
      decimals: 18,
      dynamicData: this.getPoolDynamicData(pool),
      allTokens: this.mapAllTokens(pool),
      displayTokens: this.mapDisplayTokens(pool),
    };
  }

  mapQueryArgsToPoolQuery(args: QueryPoolGetPoolsArgs): Prisma.PrismaPoolFindManyArgs {
    let orderBy: Prisma.PrismaPoolOrderByWithRelationInput = {};
    const orderDirection = args.orderDirection || undefined;

    switch (args.orderBy) {
      case 'totalLiquidity':
        orderBy = { dynamicData: { totalLiquidity: orderDirection } };
        break;
      case 'totalShares':
        orderBy = { dynamicData: { totalShares: orderDirection } };
        break;
      case 'volume24h':
        orderBy = { dynamicData: { volume24h: orderDirection } };
        break;
      case 'fees24h':
        orderBy = { dynamicData: { fees24h: orderDirection } };
        break;
      case 'apr':
        orderBy = { dynamicData: { apr: orderDirection } };
        break;
    }

    const baseQuery: Prisma.PrismaPoolFindManyArgs = {
      take: args.first || undefined,
      skip: args.skip || undefined,
      orderBy,
    };

    if (!args.where && !args.textSearch) {
      return {
        ...baseQuery,
        where: {
          categories: {
            none: { category: 'BLACK_LISTED' },
          },
          dynamicData: {
            totalSharesNum: {
              gt: 0.000000000001,
            },
          },
        },
      };
    }

    const where = args.where;
    const textSearch = args.textSearch
      ? { contains: args.textSearch, mode: 'insensitive' as const }
      : undefined;

    const allTokensFilter = [];
    where?.tokensIn?.forEach((token) => {
      allTokensFilter.push({
        allTokens: {
          some: {
            token: {
              address: {
                equals: token,
                mode: 'insensitive' as const,
              },
            },
          },
        },
      });
    });

    if (where?.tokensNotIn) {
      allTokensFilter.push({
        allTokens: {
          every: {
            token: {
              address: {
                notIn: where.tokensNotIn || undefined,
                mode: 'insensitive' as const,
              },
            },
          },
        },
      });
    }

    const filterArgs: Prisma.PrismaPoolWhereInput = {
      dynamicData: {
        totalSharesNum: {
          gt: 0.000000000001,
        },
      },
      type: {
        in: where?.poolTypeIn || undefined,
        notIn: where?.poolTypeNotIn || undefined,
      },
      AND: allTokensFilter,
      id: {
        in: where?.idIn || undefined,
        notIn: where?.idNotIn || undefined,
        mode: 'insensitive',
      },
      categories: {
        every: {
          category: {
            notIn: ['BLACK_LISTED', ...(where?.categoryNotIn || [])],
          },
        },
        ...(where?.categoryIn
          ? {
              some: {
                category: {
                  in: where.categoryIn,
                },
              },
            }
          : {}),
      },
      filters: {
        ...(where?.filterNotIn
          ? {
              every: {
                filterId: {
                  notIn: where.filterNotIn,
                },
              },
            }
          : {}),
        ...(where?.filterIn
          ? {
              some: {
                filterId: {
                  in: where.filterIn,
                },
              },
            }
          : {}),
      },
    };

    if (!textSearch) {
      return {
        ...baseQuery,
        where: filterArgs,
      };
    }

    return {
      ...baseQuery,
      where: {
        OR: [
          { name: textSearch, ...filterArgs },
          { symbol: textSearch, ...filterArgs },
          {
            ...filterArgs,
            allTokens: {
              some: {
                OR: [
                  {
                    token: {
                      name: textSearch,
                      address: filterArgs.allTokens?.some?.token?.address,
                    },
                  },
                  {
                    token: {
                      symbol: textSearch,
                      address: filterArgs.allTokens?.some?.token?.address,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    };
  }
}
