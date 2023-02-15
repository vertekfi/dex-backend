import { PrismaPoolType } from '@prisma/client';

export const poolTypeToSubgraphTypeMapping: { [type in PrismaPoolType]: string } = {
  WEIGHTED: 'Weighted',
  STABLE: 'Stable',
  LINEAR: 'Linear',
  META_STABLE: 'MetaStable',
  PHANTOM_STABLE: 'PhantomStable',
  ELEMENT: 'Element',
  UNKNOWN: 'Unknown',
  LIQUIDITY_BOOTSTRAPPING: 'LiquidityBootstrapping',
  INVESTMENT: 'Investment',
};

export function convertPoolTypeForSubgraph(type: PrismaPoolType) {
  return poolTypeToSubgraphTypeMapping[type];
}
