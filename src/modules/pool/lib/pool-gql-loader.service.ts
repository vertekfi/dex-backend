import { Injectable } from '@nestjs/common';
import { GqlPoolToken, GqlPoolUnion } from 'src/graphql';
import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolWithExpandedNesting, prismaPoolWithExpandedNesting } from 'prisma/prisma-types';
import { PoolGqlLoaderUtils } from './gql-loader-utils.service';

@Injectable()
export class PoolGqlLoaderService {
  constructor(private prisma: PrismaService, private poolUtils: PoolGqlLoaderUtils) {}

  async getPool(id: string): Promise<GqlPoolUnion> {
    const pool = await this.prisma.prismaPool.findUnique({
      where: { id },
      include: prismaPoolWithExpandedNesting.include,
    });

    if (!pool) {
      throw new Error('Pool with id does not exist');
    }

    if (pool.type === 'UNKNOWN') {
      throw new Error('Pool exists, but has an unknown type');
    }

    // return this.mapPoolToGqlPool(pool);
    return null;
  }

  // private mapPoolToGqlPool(pool: PrismaPoolWithExpandedNesting): GqlPoolUnion {
  //   const bpt = pool.tokens.find((token) => token.address === pool.address);

  //   const mappedData = {
  //     ...pool,
  //     decimals: 18,
  //     dynamicData: this.poolUtils.getPoolDynamicData(pool),
  //     investConfig: this.poolUtils.getPoolInvestConfig(pool),
  //     withdrawConfig: this.poolUtils.getPoolWithdrawConfig(pool),
  //     nestingType: this.poolUtils.getPoolNestingType(pool),
  //     tokens: pool.tokens
  //       .filter((token) => token.address !== pool.address)
  //       .map((token) => this.mapPoolTokenToGqlUnion(token)),
  //     allTokens: this.mapAllTokens(pool),
  //     displayTokens: this.mapDisplayTokens(pool),
  //   };

  //   //TODO: may need to build out the types here still
  //   switch (pool.type) {
  //     case 'STABLE':
  //       return {
  //         __typename: 'GqlPoolStable',
  //         ...mappedData,
  //         amp: pool.stableDynamicData?.amp || '0',
  //         tokens: mappedData.tokens as GqlPoolToken[],
  //       };
  //     case 'META_STABLE':
  //       return {
  //         __typename: 'GqlPoolMetaStable',
  //         ...mappedData,
  //         amp: pool.stableDynamicData?.amp || '0',
  //         tokens: mappedData.tokens as GqlPoolToken[],
  //       };
  //     case 'PHANTOM_STABLE':
  //       return {
  //         __typename: 'GqlPoolPhantomStable',
  //         ...mappedData,
  //         amp: pool.stableDynamicData?.amp || '0',
  //         bptPriceRate: bpt?.dynamicData?.priceRate || '1.0',
  //       };
  //     case 'LINEAR':
  //       return {
  //         __typename: 'GqlPoolLinear',
  //         ...mappedData,
  //         tokens: mappedData.tokens as GqlPoolToken[],
  //         mainIndex: pool.linearData?.mainIndex || 0,
  //         wrappedIndex: pool.linearData?.wrappedIndex || 0,
  //         lowerTarget: pool.linearDynamicData?.lowerTarget || '0',
  //         upperTarget: pool.linearDynamicData?.upperTarget || '0',
  //         bptPriceRate: bpt?.dynamicData?.priceRate || '1.0',
  //       };
  //     case 'ELEMENT':
  //       return {
  //         __typename: 'GqlPoolElement',
  //         ...mappedData,
  //         tokens: mappedData.tokens as GqlPoolToken[],
  //         baseToken: pool.elementData?.baseToken || '',
  //         unitSeconds: pool.elementData?.unitSeconds || '',
  //         principalToken: pool.elementData?.principalToken || '',
  //       };
  //     case 'LIQUIDITY_BOOTSTRAPPING':
  //       return {
  //         __typename: 'GqlPoolLiquidityBootstrapping',
  //         ...mappedData,
  //       };
  //   }

  //   return {
  //     __typename: 'GqlPoolWeighted',
  //     ...mappedData,
  //   };
  // }
}
