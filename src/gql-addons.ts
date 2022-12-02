import { GraphQLResolveInfo, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = { [X in Exclude<keyof T, K>]?: T[X] } & {
  [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  AmountHumanReadable: string;
  BigDecimal: string;
  BigInt: string;
  Bytes: string;
  Date: Date;
  GqlBigNumber: string;
  JSON: any;
}

export interface GqlBalancePoolAprItem {
  __typename?: 'GqlBalancePoolAprItem';
  apr: Scalars['BigDecimal'];
  id: Scalars['ID'];
  subItems?: Maybe<Array<GqlBalancePoolAprSubItem>>;
  title: Scalars['String'];
}

export interface GqlBalancePoolAprSubItem {
  __typename?: 'GqlBalancePoolAprSubItem';
  apr: Scalars['BigDecimal'];
  id: Scalars['ID'];
  title: Scalars['String'];
}

export interface GqlContentNewsItem {
  __typename?: 'GqlContentNewsItem';
  discussionUrl?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  image?: Maybe<Scalars['String']>;
  source: GqlContentNewsItemSource;
  text: Scalars['String'];
  timestamp: Scalars['String'];
  url: Scalars['String'];
}

export type GqlContentNewsItemSource = 'discord' | 'medium' | 'twitter';

export interface GqlFeaturePoolGroupItemExternalLink {
  __typename?: 'GqlFeaturePoolGroupItemExternalLink';
  buttonText: Scalars['String'];
  buttonUrl: Scalars['String'];
  id: Scalars['ID'];
  image: Scalars['String'];
}

export interface GqlHistoricalTokenPrice {
  __typename?: 'GqlHistoricalTokenPrice';
  address: Scalars['String'];
  prices: Array<GqlHistoricalTokenPriceEntry>;
}

export interface GqlHistoricalTokenPriceEntry {
  __typename?: 'GqlHistoricalTokenPriceEntry';
  price: Scalars['Float'];
  timestamp: Scalars['String'];
}

export interface GqlLatestSyncedBlocks {
  __typename?: 'GqlLatestSyncedBlocks';
  poolSyncBlock: Scalars['BigInt'];
  userStakeSyncBlock: Scalars['BigInt'];
  userWalletSyncBlock: Scalars['BigInt'];
}

export interface GqlLge {
  __typename?: 'GqlLge';
  address: Scalars['String'];
  adminAddress: Scalars['String'];
  adminIsMultisig: Scalars['Boolean'];
  bannerImageUrl: Scalars['String'];
  collateralAmount: Scalars['String'];
  collateralEndWeight: Scalars['Int'];
  collateralStartWeight: Scalars['Int'];
  collateralTokenAddress: Scalars['String'];
  description: Scalars['String'];
  discordUrl: Scalars['String'];
  endDate: Scalars['String'];
  id: Scalars['ID'];
  mediumUrl: Scalars['String'];
  name: Scalars['String'];
  startDate: Scalars['String'];
  swapFeePercentage: Scalars['String'];
  telegramUrl: Scalars['String'];
  tokenAmount: Scalars['String'];
  tokenContractAddress: Scalars['String'];
  tokenEndWeight: Scalars['Int'];
  tokenIconUrl: Scalars['String'];
  tokenStartWeight: Scalars['Int'];
  twitterUrl: Scalars['String'];
  websiteUrl: Scalars['String'];
}

export interface GqlLgeCreateInput {
  address: Scalars['String'];
  bannerImageUrl: Scalars['String'];
  collateralAmount: Scalars['String'];
  collateralEndWeight: Scalars['Int'];
  collateralStartWeight: Scalars['Int'];
  collateralTokenAddress: Scalars['String'];
  description: Scalars['String'];
  discordUrl: Scalars['String'];
  endDate: Scalars['String'];
  id: Scalars['ID'];
  mediumUrl: Scalars['String'];
  name: Scalars['String'];
  startDate: Scalars['String'];
  swapFeePercentage: Scalars['String'];
  telegramUrl: Scalars['String'];
  tokenAmount: Scalars['String'];
  tokenContractAddress: Scalars['String'];
  tokenEndWeight: Scalars['Int'];
  tokenIconUrl: Scalars['String'];
  tokenStartWeight: Scalars['Int'];
  twitterUrl: Scalars['String'];
  websiteUrl: Scalars['String'];
}

export interface GqlLgeUpdateInput {
  description: Scalars['String'];
  discordUrl: Scalars['String'];
  id: Scalars['ID'];
  mediumUrl: Scalars['String'];
  name: Scalars['String'];
  telegramUrl: Scalars['String'];
  tokenIconUrl: Scalars['String'];
  twitterUrl: Scalars['String'];
  websiteUrl: Scalars['String'];
}

export interface GqlPoolApr {
  __typename?: 'GqlPoolApr';
  hasRewardApr: Scalars['Boolean'];
  items: Array<GqlBalancePoolAprItem>;
  max?: Maybe<Scalars['BigDecimal']>;
  min?: Maybe<Scalars['BigDecimal']>;
  nativeRewardApr: Scalars['BigDecimal'];
  swapApr: Scalars['BigDecimal'];
  thirdPartyApr: Scalars['BigDecimal'];
  total: Scalars['BigDecimal'];
}

export interface GqlPoolAprItem {
  __typename?: 'GqlPoolAprItem';
  apr: Scalars['BigDecimal'];
  subItems?: Maybe<Array<GqlBalancePoolAprSubItem>>;
  title: Scalars['String'];
}

export interface GqlPoolAprSubItem {
  __typename?: 'GqlPoolAprSubItem';
  apr: Scalars['BigDecimal'];
  title: Scalars['String'];
}

export interface GqlPoolBase {
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  name: Scalars['String'];
  owner?: Maybe<Scalars['Bytes']>;
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  withdrawConfig: GqlPoolWithdrawConfig;
}

export interface GqlPoolBatchSwap {
  __typename?: 'GqlPoolBatchSwap';
  id: Scalars['ID'];
  swaps: Array<GqlPoolBatchSwapSwap>;
  timestamp: Scalars['Int'];
  tokenAmountIn: Scalars['String'];
  tokenAmountOut: Scalars['String'];
  tokenIn: Scalars['String'];
  tokenInPrice: Scalars['Float'];
  tokenOut: Scalars['String'];
  tokenOutPrice: Scalars['Float'];
  tx: Scalars['String'];
  userAddress: Scalars['String'];
  valueUSD: Scalars['Float'];
}

export interface GqlPoolBatchSwapPool {
  __typename?: 'GqlPoolBatchSwapPool';
  id: Scalars['ID'];
  tokens: Array<Scalars['String']>;
}

export interface GqlPoolBatchSwapSwap {
  __typename?: 'GqlPoolBatchSwapSwap';
  id: Scalars['ID'];
  pool: GqlPoolMinimal;
  timestamp: Scalars['Int'];
  tokenAmountIn: Scalars['String'];
  tokenAmountOut: Scalars['String'];
  tokenIn: Scalars['String'];
  tokenOut: Scalars['String'];
  tx: Scalars['String'];
  userAddress: Scalars['String'];
  valueUSD: Scalars['Float'];
}

export interface GqlPoolDynamicData {
  __typename?: 'GqlPoolDynamicData';
  apr: GqlPoolApr;
  fees24h: Scalars['BigDecimal'];
  fees24hAth: Scalars['BigDecimal'];
  fees24hAthTimestamp: Scalars['Int'];
  fees24hAtl: Scalars['BigDecimal'];
  fees24hAtlTimestamp: Scalars['Int'];
  fees48h: Scalars['BigDecimal'];
  holdersCount: Scalars['BigInt'];
  lifetimeSwapFees: Scalars['BigDecimal'];
  lifetimeVolume: Scalars['BigDecimal'];
  poolId: Scalars['ID'];
  sharePriceAth: Scalars['BigDecimal'];
  sharePriceAthTimestamp: Scalars['Int'];
  sharePriceAtl: Scalars['BigDecimal'];
  sharePriceAtlTimestamp: Scalars['Int'];
  swapEnabled: Scalars['Boolean'];
  swapFee: Scalars['BigDecimal'];
  swapsCount: Scalars['BigInt'];
  totalLiquidity: Scalars['BigDecimal'];
  totalLiquidity24hAgo: Scalars['BigDecimal'];
  totalLiquidityAth: Scalars['BigDecimal'];
  totalLiquidityAthTimestamp: Scalars['Int'];
  totalLiquidityAtl: Scalars['BigDecimal'];
  totalLiquidityAtlTimestamp: Scalars['Int'];
  totalShares: Scalars['BigDecimal'];
  totalShares24hAgo: Scalars['BigDecimal'];
  volume24h: Scalars['BigDecimal'];
  volume24hAth: Scalars['BigDecimal'];
  volume24hAthTimestamp: Scalars['Int'];
  volume24hAtl: Scalars['BigDecimal'];
  volume24hAtlTimestamp: Scalars['Int'];
  volume48h: Scalars['BigDecimal'];
}

export interface GqlPoolElement extends GqlPoolBase {
  __typename?: 'GqlPoolElement';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  baseToken: Scalars['Bytes'];
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  name: Scalars['String'];
  owner: Scalars['Bytes'];
  principalToken: Scalars['Bytes'];
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  tokens: Array<GqlPoolToken>;
  unitSeconds: Scalars['BigInt'];
  withdrawConfig: GqlPoolWithdrawConfig;
}

export interface GqlPoolFeaturedPoolGroup {
  __typename?: 'GqlPoolFeaturedPoolGroup';
  icon: Scalars['String'];
  id: Scalars['ID'];
  items: Array<GqlPoolFeaturedPoolGroupItem>;
  title: Scalars['String'];
}

export type GqlPoolFeaturedPoolGroupItem = GqlFeaturePoolGroupItemExternalLink | GqlPoolMinimal;

export interface GqlPoolFilter {
  categoryIn?: InputMaybe<Array<GqlPoolFilterCategory>>;
  categoryNotIn?: InputMaybe<Array<GqlPoolFilterCategory>>;
  filterIn?: InputMaybe<Array<Scalars['String']>>;
  filterNotIn?: InputMaybe<Array<Scalars['String']>>;
  idIn?: InputMaybe<Array<Scalars['String']>>;
  idNotIn?: InputMaybe<Array<Scalars['String']>>;
  poolTypeIn?: InputMaybe<Array<GqlPoolFilterType>>;
  poolTypeNotIn?: InputMaybe<Array<GqlPoolFilterType>>;
  tokensIn?: InputMaybe<Array<Scalars['String']>>;
  tokensNotIn?: InputMaybe<Array<Scalars['String']>>;
}

export type GqlPoolFilterCategory = 'BLACK_LISTED' | 'INCENTIVIZED';

export interface GqlPoolFilterDefinition {
  __typename?: 'GqlPoolFilterDefinition';
  id: Scalars['ID'];
  title: Scalars['String'];
}

export type GqlPoolFilterType =
  | 'ELEMENT'
  | 'INVESTMENT'
  | 'LINEAR'
  | 'LIQUIDITY_BOOTSTRAPPING'
  | 'META_STABLE'
  | 'PHANTOM_STABLE'
  | 'STABLE'
  | 'UNKNOWN'
  | 'WEIGHTED';

export interface GqlPoolInvestConfig {
  __typename?: 'GqlPoolInvestConfig';
  options: Array<GqlPoolInvestOption>;
  proportionalEnabled: Scalars['Boolean'];
  singleAssetEnabled: Scalars['Boolean'];
}

export interface GqlPoolInvestOption {
  __typename?: 'GqlPoolInvestOption';
  poolTokenAddress: Scalars['String'];
  poolTokenIndex: Scalars['Int'];
  tokenOptions: Array<GqlPoolToken>;
}

export interface GqlPoolJoinExit {
  __typename?: 'GqlPoolJoinExit';
  amounts: Array<GqlPoolJoinExitAmount>;
  id: Scalars['ID'];
  poolId: Scalars['String'];
  sender: Scalars['String'];
  timestamp: Scalars['Int'];
  tx: Scalars['String'];
  type: GqlPoolJoinExitType;
  valueUSD?: Maybe<Scalars['String']>;
}

export interface GqlPoolJoinExitAmount {
  __typename?: 'GqlPoolJoinExitAmount';
  address: Scalars['String'];
  amount: Scalars['String'];
}

export interface GqlPoolJoinExitFilter {
  poolIdIn?: InputMaybe<Array<Scalars['String']>>;
}

export type GqlPoolJoinExitType = 'Exit' | 'Join';

export interface GqlPoolLinear extends GqlPoolBase {
  __typename?: 'GqlPoolLinear';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  bptPriceRate: Scalars['BigDecimal'];
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  lowerTarget: Scalars['BigInt'];
  mainIndex: Scalars['Int'];
  name: Scalars['String'];
  owner: Scalars['Bytes'];
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  tokens: Array<GqlPoolToken>;
  upperTarget: Scalars['BigInt'];
  withdrawConfig: GqlPoolWithdrawConfig;
  wrappedIndex: Scalars['Int'];
}

export interface GqlPoolLinearNested {
  __typename?: 'GqlPoolLinearNested';
  address: Scalars['Bytes'];
  bptPriceRate: Scalars['BigDecimal'];
  createTime: Scalars['Int'];
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  lowerTarget: Scalars['BigInt'];
  mainIndex: Scalars['Int'];
  name: Scalars['String'];
  owner: Scalars['Bytes'];
  symbol: Scalars['String'];
  tokens: Array<GqlPoolToken>;
  totalLiquidity: Scalars['BigDecimal'];
  totalShares: Scalars['BigDecimal'];
  upperTarget: Scalars['BigInt'];
  wrappedIndex: Scalars['Int'];
}

export interface GqlPoolLinearPoolData {
  __typename?: 'GqlPoolLinearPoolData';
  address: Scalars['String'];
  balance: Scalars['String'];
  id: Scalars['ID'];
  mainToken: GqlPoolLinearPoolMainToken;
  mainTokenTotalBalance: Scalars['String'];
  poolToken: Scalars['String'];
  priceRate: Scalars['String'];
  symbol: Scalars['String'];
  totalSupply: Scalars['String'];
  unwrappedTokenAddress: Scalars['String'];
  wrappedToken: GqlPoolLinearPoolWrappedToken;
}

export interface GqlPoolLinearPoolMainToken {
  __typename?: 'GqlPoolLinearPoolMainToken';
  address: Scalars['String'];
  balance: Scalars['String'];
  decimals: Scalars['Int'];
  index: Scalars['Int'];
  name: Scalars['String'];
  symbol: Scalars['String'];
  totalSupply: Scalars['String'];
}

export interface GqlPoolLinearPoolWrappedToken {
  __typename?: 'GqlPoolLinearPoolWrappedToken';
  address: Scalars['String'];
  balance: Scalars['String'];
  decimals: Scalars['Int'];
  index: Scalars['Int'];
  name: Scalars['String'];
  priceRate: Scalars['String'];
  symbol: Scalars['String'];
  totalSupply: Scalars['String'];
}

export interface GqlPoolLiquidityBootstrapping extends GqlPoolBase {
  __typename?: 'GqlPoolLiquidityBootstrapping';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  name: Scalars['String'];
  nestingType: GqlPoolNestingType;
  owner: Scalars['Bytes'];
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  tokens: Array<GqlPoolTokenUnion>;
  withdrawConfig: GqlPoolWithdrawConfig;
}

export interface GqlPoolMetaStable extends GqlPoolBase {
  __typename?: 'GqlPoolMetaStable';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  amp: Scalars['BigInt'];
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  name: Scalars['String'];
  owner: Scalars['Bytes'];
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  tokens: Array<GqlPoolToken>;
  withdrawConfig: GqlPoolWithdrawConfig;
}

export interface GqlPoolMinimal {
  __typename?: 'GqlPoolMinimal';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  owner?: Maybe<Scalars['Bytes']>;
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  type: GqlPoolMinimalType;
}

export type GqlPoolMinimalType =
  | 'ELEMENT'
  | 'INVESTMENT'
  | 'LINEAR'
  | 'LIQUIDITY_BOOTSTRAPPING'
  | 'META_STABLE'
  | 'PHANTOM_STABLE'
  | 'STABLE'
  | 'UNKNOWN'
  | 'WEIGHTED';

export type GqlPoolNestedUnion = GqlPoolLinearNested | GqlPoolPhantomStableNested;

export type GqlPoolNestingType = 'HAS_ONLY_PHANTOM_BPT' | 'HAS_SOME_PHANTOM_BPT' | 'NO_NESTING';

export type GqlPoolOrderBy = 'apr' | 'fees24h' | 'totalLiquidity' | 'totalShares' | 'volume24h';

export type GqlPoolOrderDirection = 'asc' | 'desc';

export interface GqlPoolPhantomStable extends GqlPoolBase {
  __typename?: 'GqlPoolPhantomStable';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  amp: Scalars['BigInt'];
  bptPriceRate: Scalars['BigDecimal'];
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  name: Scalars['String'];
  nestingType: GqlPoolNestingType;
  owner: Scalars['Bytes'];
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  tokens: Array<GqlPoolTokenUnion>;
  withdrawConfig: GqlPoolWithdrawConfig;
}

export interface GqlPoolPhantomStableNested {
  __typename?: 'GqlPoolPhantomStableNested';
  address: Scalars['Bytes'];
  amp: Scalars['BigInt'];
  bptPriceRate: Scalars['BigDecimal'];
  createTime: Scalars['Int'];
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  nestingType: GqlPoolNestingType;
  owner: Scalars['Bytes'];
  swapFee: Scalars['BigDecimal'];
  symbol: Scalars['String'];
  tokens: Array<GqlPoolTokenPhantomStableNestedUnion>;
  totalLiquidity: Scalars['BigDecimal'];
  totalShares: Scalars['BigDecimal'];
}

export interface GqlPoolSnapshot {
  __typename?: 'GqlPoolSnapshot';
  amounts: Array<Scalars['String']>;
  fees24h: Scalars['String'];
  holdersCount: Scalars['String'];
  id: Scalars['ID'];
  poolId: Scalars['String'];
  sharePrice: Scalars['String'];
  swapsCount: Scalars['String'];
  timestamp: Scalars['Int'];
  totalLiquidity: Scalars['String'];
  totalShares: Scalars['String'];
  totalSwapFee: Scalars['String'];
  totalSwapVolume: Scalars['String'];
  volume24h: Scalars['String'];
}

export type GqlPoolSnapshotDataRange =
  | 'ALL_TIME'
  | 'NINETY_DAYS'
  | 'ONE_HUNDRED_EIGHTY_DAYS'
  | 'ONE_YEAR'
  | 'THIRTY_DAYS';

export interface GqlPoolStable extends GqlPoolBase {
  __typename?: 'GqlPoolStable';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  amp: Scalars['BigInt'];
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  name: Scalars['String'];
  owner: Scalars['Bytes'];
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  tokens: Array<GqlPoolToken>;
  withdrawConfig: GqlPoolWithdrawConfig;
}

export interface GqlPoolStablePhantomPoolData {
  __typename?: 'GqlPoolStablePhantomPoolData';
  address: Scalars['String'];
  balance: Scalars['String'];
  id: Scalars['ID'];
  symbol: Scalars['String'];
  tokens: Array<GqlPoolToken>;
  totalSupply: Scalars['String'];
}

export interface GqlPoolStaking {
  __typename?: 'GqlPoolStaking';
  address: Scalars['String'];
  farm?: Maybe<GqlPoolStakingMasterChefFarm>;
  gauge?: Maybe<GqlPoolStakingGauge>;
  id: Scalars['ID'];
  reliquary?: Maybe<GqlPoolStakingReliquaryFarm>;
  type: GqlPoolStakingType;
}

export interface GqlPoolStakingFarmRewarder {
  __typename?: 'GqlPoolStakingFarmRewarder';
  address: Scalars['String'];
  id: Scalars['ID'];
  rewardPerSecond: Scalars['String'];
  tokenAddress: Scalars['String'];
}

export interface GqlPoolStakingGauge {
  __typename?: 'GqlPoolStakingGauge';
  gaugeAddress: Scalars['String'];
  id: Scalars['ID'];
  rewards: Array<GqlPoolStakingGaugeReward>;
}

export interface GqlPoolStakingGaugeReward {
  __typename?: 'GqlPoolStakingGaugeReward';
  id: Scalars['ID'];
  rewardPerSecond: Scalars['String'];
  tokenAddress: Scalars['String'];
}

export interface GqlPoolStakingMasterChefFarm {
  __typename?: 'GqlPoolStakingMasterChefFarm';
  beetsPerBlock: Scalars['String'];
  id: Scalars['ID'];
  rewarders?: Maybe<Array<GqlPoolStakingFarmRewarder>>;
}

export interface GqlPoolStakingReliquarFarmLevel {
  __typename?: 'GqlPoolStakingReliquarFarmLevel';
  allocationPoints: Scalars['Int'];
  apr: Scalars['BigDecimal'];
  balance: Scalars['BigDecimal'];
  id: Scalars['ID'];
  level: Scalars['Int'];
  requiredMaturity: Scalars['Int'];
}

export interface GqlPoolStakingReliquaryFarm {
  __typename?: 'GqlPoolStakingReliquaryFarm';
  beetsPerSecond: Scalars['String'];
  id: Scalars['ID'];
  levels?: Maybe<Array<GqlPoolStakingReliquarFarmLevel>>;
}

export type GqlPoolStakingType = 'FRESH_BEETS' | 'GAUGE' | 'MASTER_CHEF' | 'RELIQUARY';

export interface GqlPoolSwap {
  __typename?: 'GqlPoolSwap';
  id: Scalars['ID'];
  poolId: Scalars['String'];
  timestamp: Scalars['Int'];
  tokenAmountIn: Scalars['String'];
  tokenAmountOut: Scalars['String'];
  tokenIn: Scalars['String'];
  tokenOut: Scalars['String'];
  tx: Scalars['String'];
  userAddress: Scalars['String'];
  valueUSD: Scalars['Float'];
}

export interface GqlPoolSwapFilter {
  poolIdIn?: InputMaybe<Array<Scalars['String']>>;
  tokenInIn?: InputMaybe<Array<Scalars['String']>>;
  tokenOutIn?: InputMaybe<Array<Scalars['String']>>;
}

export interface GqlPoolToken extends GqlPoolTokenBase {
  __typename?: 'GqlPoolToken';
  address: Scalars['String'];
  balance: Scalars['BigDecimal'];
  decimals: Scalars['Int'];
  id: Scalars['ID'];
  index: Scalars['Int'];
  name: Scalars['String'];
  priceRate: Scalars['BigDecimal'];
  symbol: Scalars['String'];
  totalBalance: Scalars['BigDecimal'];
  weight?: Maybe<Scalars['BigDecimal']>;
}

export interface GqlPoolTokenBase {
  address: Scalars['String'];
  balance: Scalars['BigDecimal'];
  decimals: Scalars['Int'];
  id: Scalars['ID'];
  index: Scalars['Int'];
  name: Scalars['String'];
  priceRate: Scalars['BigDecimal'];
  symbol: Scalars['String'];
  totalBalance: Scalars['BigDecimal'];
  weight?: Maybe<Scalars['BigDecimal']>;
}

export interface GqlPoolTokenDisplay {
  __typename?: 'GqlPoolTokenDisplay';
  address: Scalars['String'];
  id: Scalars['ID'];
  name: Scalars['String'];
  nestedTokens?: Maybe<Array<GqlPoolTokenDisplay>>;
  symbol: Scalars['String'];
  weight?: Maybe<Scalars['BigDecimal']>;
}

export interface GqlPoolTokenExpanded {
  __typename?: 'GqlPoolTokenExpanded';
  address: Scalars['String'];
  decimals: Scalars['Int'];
  id: Scalars['ID'];
  isMainToken: Scalars['Boolean'];
  isNested: Scalars['Boolean'];
  isPhantomBpt: Scalars['Boolean'];
  name: Scalars['String'];
  symbol: Scalars['String'];
  weight?: Maybe<Scalars['String']>;
}

export interface GqlPoolTokenLinear extends GqlPoolTokenBase {
  __typename?: 'GqlPoolTokenLinear';
  address: Scalars['String'];
  balance: Scalars['BigDecimal'];
  decimals: Scalars['Int'];
  id: Scalars['ID'];
  index: Scalars['Int'];
  mainTokenBalance: Scalars['BigDecimal'];
  name: Scalars['String'];
  pool: GqlPoolLinearNested;
  priceRate: Scalars['BigDecimal'];
  symbol: Scalars['String'];
  totalBalance: Scalars['BigDecimal'];
  totalMainTokenBalance: Scalars['BigDecimal'];
  weight?: Maybe<Scalars['BigDecimal']>;
  wrappedTokenBalance: Scalars['BigDecimal'];
}

export interface GqlPoolTokenPhantomStable extends GqlPoolTokenBase {
  __typename?: 'GqlPoolTokenPhantomStable';
  address: Scalars['String'];
  balance: Scalars['BigDecimal'];
  decimals: Scalars['Int'];
  id: Scalars['ID'];
  index: Scalars['Int'];
  name: Scalars['String'];
  pool: GqlPoolPhantomStableNested;
  priceRate: Scalars['BigDecimal'];
  symbol: Scalars['String'];
  totalBalance: Scalars['BigDecimal'];
  weight?: Maybe<Scalars['BigDecimal']>;
}

export type GqlPoolTokenPhantomStableNestedUnion = GqlPoolToken | GqlPoolTokenLinear;

export type GqlPoolTokenUnion = GqlPoolToken | GqlPoolTokenLinear | GqlPoolTokenPhantomStable;

export type GqlPoolUnion =
  | GqlPoolElement
  | GqlPoolLinear
  | GqlPoolLiquidityBootstrapping
  | GqlPoolMetaStable
  | GqlPoolPhantomStable
  | GqlPoolStable
  | GqlPoolWeighted;

export interface GqlPoolUserSwapVolume {
  __typename?: 'GqlPoolUserSwapVolume';
  swapVolumeUSD: Scalars['BigDecimal'];
  userAddress: Scalars['String'];
}

export interface GqlPoolWeighted extends GqlPoolBase {
  __typename?: 'GqlPoolWeighted';
  address: Scalars['Bytes'];
  allTokens: Array<GqlPoolTokenExpanded>;
  createTime: Scalars['Int'];
  decimals: Scalars['Int'];
  displayTokens: Array<GqlPoolTokenDisplay>;
  dynamicData: GqlPoolDynamicData;
  factory?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  investConfig: GqlPoolInvestConfig;
  name: Scalars['String'];
  nestingType: GqlPoolNestingType;
  owner: Scalars['Bytes'];
  staking?: Maybe<GqlPoolStaking>;
  symbol: Scalars['String'];
  tokens: Array<GqlPoolTokenUnion>;
  withdrawConfig: GqlPoolWithdrawConfig;
}

export interface GqlPoolWithdrawConfig {
  __typename?: 'GqlPoolWithdrawConfig';
  options: Array<GqlPoolWithdrawOption>;
  proportionalEnabled: Scalars['Boolean'];
  singleAssetEnabled: Scalars['Boolean'];
}

export interface GqlPoolWithdrawOption {
  __typename?: 'GqlPoolWithdrawOption';
  poolTokenAddress: Scalars['String'];
  poolTokenIndex: Scalars['Int'];
  tokenOptions: Array<GqlPoolToken>;
}

export interface GqlProtocolMetrics {
  __typename?: 'GqlProtocolMetrics';
  poolCount: Scalars['BigInt'];
  swapFee24h: Scalars['BigDecimal'];
  swapVolume24h: Scalars['BigDecimal'];
  totalLiquidity: Scalars['BigDecimal'];
  totalSwapFee: Scalars['BigDecimal'];
  totalSwapVolume: Scalars['BigDecimal'];
}

export interface GqlSorGetBatchSwapForTokensInResponse {
  __typename?: 'GqlSorGetBatchSwapForTokensInResponse';
  assets: Array<Scalars['String']>;
  swaps: Array<GqlSorSwap>;
  tokenOutAmount: Scalars['AmountHumanReadable'];
}

export interface GqlSorGetSwapsResponse {
  __typename?: 'GqlSorGetSwapsResponse';
  effectivePrice: Scalars['AmountHumanReadable'];
  effectivePriceReversed: Scalars['AmountHumanReadable'];
  marketSp: Scalars['String'];
  priceImpact: Scalars['AmountHumanReadable'];
  returnAmount: Scalars['AmountHumanReadable'];
  returnAmountConsideringFees: Scalars['BigDecimal'];
  returnAmountFromSwaps?: Maybe<Scalars['BigDecimal']>;
  returnAmountScaled: Scalars['BigDecimal'];
  routes: Array<GqlSorSwapRoute>;
  swapAmount: Scalars['AmountHumanReadable'];
  swapAmountForSwaps?: Maybe<Scalars['BigDecimal']>;
  swapAmountScaled: Scalars['BigDecimal'];
  swapType: GqlSorSwapType;
  swaps: Array<GqlSorSwap>;
  tokenAddresses: Array<Scalars['String']>;
  tokenIn: Scalars['String'];
  tokenInAmount: Scalars['AmountHumanReadable'];
  tokenOut: Scalars['String'];
  tokenOutAmount: Scalars['AmountHumanReadable'];
}

export interface GqlSorSwap {
  __typename?: 'GqlSorSwap';
  amount: Scalars['String'];
  assetInIndex: Scalars['Int'];
  assetOutIndex: Scalars['Int'];
  poolId: Scalars['String'];
  userData: Scalars['String'];
}

export interface GqlSorSwapOptionsInput {
  forceRefresh?: InputMaybe<Scalars['Boolean']>;
  maxPools?: InputMaybe<Scalars['Int']>;
  timestamp?: InputMaybe<Scalars['Int']>;
}

export interface GqlSorSwapRoute {
  __typename?: 'GqlSorSwapRoute';
  hops: Array<GqlSorSwapRouteHop>;
  share: Scalars['Float'];
  tokenIn: Scalars['String'];
  tokenInAmount: Scalars['BigDecimal'];
  tokenOut: Scalars['String'];
  tokenOutAmount: Scalars['BigDecimal'];
}

export interface GqlSorSwapRouteHop {
  __typename?: 'GqlSorSwapRouteHop';
  pool: GqlPoolMinimal;
  poolId: Scalars['String'];
  tokenIn: Scalars['String'];
  tokenInAmount: Scalars['BigDecimal'];
  tokenOut: Scalars['String'];
  tokenOutAmount: Scalars['BigDecimal'];
}

export type GqlSorSwapType = 'EXACT_IN' | 'EXACT_OUT';

export interface GqlToken {
  __typename?: 'GqlToken';
  address: Scalars['String'];
  chainId: Scalars['Int'];
  decimals: Scalars['Int'];
  description?: Maybe<Scalars['String']>;
  discordUrl?: Maybe<Scalars['String']>;
  logoURI?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  priority: Scalars['Int'];
  symbol: Scalars['String'];
  telegramUrl?: Maybe<Scalars['String']>;
  tradable: Scalars['Boolean'];
  twitterUsername?: Maybe<Scalars['String']>;
  websiteUrl?: Maybe<Scalars['String']>;
}

export interface GqlTokenAmountHumanReadable {
  address: Scalars['String'];
  amount: Scalars['AmountHumanReadable'];
}

export interface GqlTokenCandlestickChartDataItem {
  __typename?: 'GqlTokenCandlestickChartDataItem';
  close: Scalars['AmountHumanReadable'];
  high: Scalars['AmountHumanReadable'];
  id: Scalars['ID'];
  low: Scalars['AmountHumanReadable'];
  open: Scalars['AmountHumanReadable'];
  timestamp: Scalars['Int'];
}

export type GqlTokenChartDataRange = 'SEVEN_DAY' | 'THIRTY_DAY';

export interface GqlTokenData {
  __typename?: 'GqlTokenData';
  description?: Maybe<Scalars['String']>;
  discordUrl?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  telegramUrl?: Maybe<Scalars['String']>;
  tokenAddress: Scalars['String'];
  twitterUsername?: Maybe<Scalars['String']>;
  websiteUrl?: Maybe<Scalars['String']>;
}

export interface GqlTokenDynamicData {
  __typename?: 'GqlTokenDynamicData';
  ath: Scalars['Float'];
  atl: Scalars['Float'];
  fdv?: Maybe<Scalars['String']>;
  high24h: Scalars['Float'];
  id: Scalars['String'];
  low24h: Scalars['Float'];
  marketCap?: Maybe<Scalars['String']>;
  price: Scalars['Float'];
  priceChange24h: Scalars['Float'];
  priceChangePercent7d?: Maybe<Scalars['Float']>;
  priceChangePercent14d?: Maybe<Scalars['Float']>;
  priceChangePercent24h: Scalars['Float'];
  priceChangePercent30d?: Maybe<Scalars['Float']>;
  tokenAddress: Scalars['String'];
  updatedAt: Scalars['String'];
}

export interface GqlTokenPrice {
  __typename?: 'GqlTokenPrice';
  address: Scalars['String'];
  price: Scalars['Float'];
}

export interface GqlTokenPriceChartDataItem {
  __typename?: 'GqlTokenPriceChartDataItem';
  id: Scalars['ID'];
  price: Scalars['AmountHumanReadable'];
  timestamp: Scalars['Int'];
}

export type GqlTokenType = 'BPT' | 'LINEAR_WRAPPED_TOKEN' | 'PHANTOM_BPT' | 'WHITE_LISTED';

export interface GqlUserFbeetsBalance {
  __typename?: 'GqlUserFbeetsBalance';
  id: Scalars['String'];
  stakedBalance: Scalars['AmountHumanReadable'];
  totalBalance: Scalars['AmountHumanReadable'];
  walletBalance: Scalars['AmountHumanReadable'];
}

export interface GqlUserPoolBalance {
  __typename?: 'GqlUserPoolBalance';
  poolId: Scalars['String'];
  stakedBalance: Scalars['AmountHumanReadable'];
  tokenAddress: Scalars['String'];
  tokenPrice: Scalars['Float'];
  totalBalance: Scalars['AmountHumanReadable'];
  walletBalance: Scalars['AmountHumanReadable'];
}

export interface GqlUserPoolSnapshot {
  __typename?: 'GqlUserPoolSnapshot';
  farmBalance: Scalars['AmountHumanReadable'];
  fees24h: Scalars['AmountHumanReadable'];
  gaugeBalance: Scalars['AmountHumanReadable'];
  percentShare: Scalars['Float'];
  timestamp: Scalars['Int'];
  totalBalance: Scalars['AmountHumanReadable'];
  totalValueUSD: Scalars['AmountHumanReadable'];
  walletBalance: Scalars['AmountHumanReadable'];
}

export interface GqlUserPortfolioSnapshot {
  __typename?: 'GqlUserPortfolioSnapshot';
  farmBalance: Scalars['AmountHumanReadable'];
  fees24h: Scalars['AmountHumanReadable'];
  gaugeBalance: Scalars['AmountHumanReadable'];
  pools: Array<GqlUserPoolSnapshot>;
  timestamp: Scalars['Int'];
  totalBalance: Scalars['AmountHumanReadable'];
  totalFees: Scalars['AmountHumanReadable'];
  totalValueUSD: Scalars['AmountHumanReadable'];
  walletBalance: Scalars['AmountHumanReadable'];
}

export type GqlUserSnapshotDataRange =
  | 'ALL_TIME'
  | 'NINETY_DAYS'
  | 'ONE_HUNDRED_EIGHTY_DAYS'
  | 'ONE_YEAR'
  | 'THIRTY_DAYS';

export interface GqlUserSwapVolumeFilter {
  poolIdIn?: InputMaybe<Array<Scalars['String']>>;
  tokenInIn?: InputMaybe<Array<Scalars['String']>>;
  tokenOutIn?: InputMaybe<Array<Scalars['String']>>;
}

export interface Mutation {
  __typename?: 'Mutation';
  beetsSyncFbeetsRatio: Scalars['String'];
  cacheAverageBlockTime: Scalars['String'];
  lgeCreate: GqlLge;
  poolInitializeSnapshotsForPool: Scalars['String'];
  poolLoadOnChainDataForAllPools: Scalars['String'];
  poolLoadOnChainDataForPoolsWithActiveUpdates: Scalars['String'];
  poolLoadSnapshotsForAllPools: Scalars['String'];
  poolReloadAllPoolAprs: Scalars['String'];
  poolReloadAllTokenNestedPoolIds: Scalars['String'];
  poolReloadPoolNestedTokens: Scalars['String'];
  poolReloadStakingForAllPools: Scalars['String'];
  poolSyncAllPoolsFromSubgraph: Array<Scalars['String']>;
  poolSyncLatestSnapshotsForAllPools: Scalars['String'];
  poolSyncNewPoolsFromSubgraph: Array<Scalars['String']>;
  poolSyncPool: Scalars['String'];
  poolSyncPoolAllTokensRelationship: Scalars['String'];
  poolSyncSanityPoolData: Scalars['String'];
  poolSyncStakingForPools: Scalars['String'];
  poolSyncSwapsForLast48Hours: Scalars['String'];
  poolSyncTotalShares: Scalars['String'];
  poolUpdateAprs: Scalars['String'];
  poolUpdateLifetimeValuesForAllPools: Scalars['String'];
  poolUpdateLiquidity24hAgoForAllPools: Scalars['String'];
  poolUpdateLiquidityValuesForAllPools: Scalars['String'];
  poolUpdateVolumeAndFeeValuesForAllPools: Scalars['String'];
  protocolCacheMetrics: Scalars['String'];
  tokenDeletePrice: Scalars['Boolean'];
  tokenDeleteTokenType: Scalars['String'];
  tokenInitChartData: Scalars['String'];
  tokenReloadTokenPrices?: Maybe<Scalars['Boolean']>;
  tokenSyncTokenDefinitions: Scalars['String'];
  tokenSyncTokenDynamicData: Scalars['String'];
  userInitStakedBalances: Scalars['String'];
  userInitWalletBalancesForAllPools: Scalars['String'];
  userInitWalletBalancesForPool: Scalars['String'];
  userSyncBalance: Scalars['String'];
  userSyncBalanceAllPools: Scalars['String'];
  userSyncChangedStakedBalances: Scalars['String'];
  userSyncChangedWalletBalancesForAllPools: Scalars['String'];
}

export interface MutationLgeCreateArgs {
  lge: GqlLgeCreateInput;
  signature: Scalars['String'];
}

export interface MutationPoolInitializeSnapshotsForPoolArgs {
  poolId: Scalars['String'];
}

export interface MutationPoolReloadPoolNestedTokensArgs {
  poolId: Scalars['String'];
}

export interface MutationPoolReloadStakingForAllPoolsArgs {
  stakingTypes: Array<GqlPoolStakingType>;
}

export interface MutationPoolSyncLatestSnapshotsForAllPoolsArgs {
  daysToSync?: InputMaybe<Scalars['Int']>;
}

export interface MutationPoolSyncPoolArgs {
  poolId: Scalars['String'];
}

export interface MutationTokenDeletePriceArgs {
  timestamp: Scalars['Int'];
  tokenAddress: Scalars['String'];
}

export interface MutationTokenDeleteTokenTypeArgs {
  tokenAddress: Scalars['String'];
  type: GqlTokenType;
}

export interface MutationTokenInitChartDataArgs {
  tokenAddress: Scalars['String'];
}

export interface MutationUserInitStakedBalancesArgs {
  stakingTypes: Array<GqlPoolStakingType>;
}

export interface MutationUserInitWalletBalancesForPoolArgs {
  poolId: Scalars['String'];
}

export interface MutationUserSyncBalanceArgs {
  poolId: Scalars['String'];
}

export interface Query {
  __typename?: 'Query';
  beetsGetBeetsPrice: Scalars['String'];
  beetsGetFbeetsRatio: Scalars['String'];
  blocksGetAverageBlockTime: Scalars['Float'];
  blocksGetBlocksPerDay: Scalars['Float'];
  blocksGetBlocksPerSecond: Scalars['Float'];
  blocksGetBlocksPerYear: Scalars['Float'];
  contentGetNewsItems: Array<GqlContentNewsItem>;
  latestSyncedBlocks: GqlLatestSyncedBlocks;
  lge: GqlLge;
  lges: Array<GqlLge>;
  poolGetAllPoolsSnapshots: Array<GqlPoolSnapshot>;
  poolGetBatchSwaps: Array<GqlPoolBatchSwap>;
  poolGetFeaturedPoolGroups: Array<GqlPoolFeaturedPoolGroup>;
  poolGetJoinExits: Array<GqlPoolJoinExit>;
  poolGetLinearPools: Array<GqlPoolLinear>;
  poolGetPool: GqlPoolBase;
  poolGetPoolFilters: Array<GqlPoolFilterDefinition>;
  poolGetPools: Array<GqlPoolMinimal>;
  poolGetPoolsCount: Scalars['Int'];
  poolGetSnapshots: Array<GqlPoolSnapshot>;
  poolGetSwaps: Array<GqlPoolSwap>;
  poolGetUserSwapVolume: Array<GqlPoolUserSwapVolume>;
  protocolMetrics: GqlProtocolMetrics;
  sorGetBatchSwapForTokensIn: GqlSorGetBatchSwapForTokensInResponse;
  sorGetSwaps: GqlSorGetSwapsResponse;
  tokenGetCandlestickChartData: Array<GqlTokenCandlestickChartDataItem>;
  tokenGetCurrentPrices: Array<GqlTokenPrice>;
  tokenGetHistoricalPrices: Array<GqlHistoricalTokenPrice>;
  tokenGetPriceChartData: Array<GqlTokenPriceChartDataItem>;
  tokenGetRelativePriceChartData: Array<GqlTokenPriceChartDataItem>;
  tokenGetTokenData?: Maybe<GqlTokenData>;
  tokenGetTokenDynamicData?: Maybe<GqlTokenDynamicData>;
  tokenGetTokens: Array<GqlToken>;
  tokenGetTokensData: Array<GqlTokenData>;
  tokenGetTokensDynamicData: Array<GqlTokenDynamicData>;
  userGetFbeetsBalance: GqlUserFbeetsBalance;
  userGetPoolBalances: Array<GqlUserPoolBalance>;
  userGetPoolJoinExits: Array<GqlPoolJoinExit>;
  userGetPortfolioSnapshots: Array<GqlUserPortfolioSnapshot>;
  userGetStaking: Array<GqlPoolStaking>;
  userGetSwaps: Array<GqlPoolSwap>;
}

export interface QueryLgeArgs {
  id: Scalars['ID'];
}

export interface QueryPoolGetAllPoolsSnapshotsArgs {
  range: GqlPoolSnapshotDataRange;
}

export interface QueryPoolGetBatchSwapsArgs {
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<GqlPoolSwapFilter>;
}

export interface QueryPoolGetJoinExitsArgs {
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<GqlPoolJoinExitFilter>;
}

export interface QueryPoolGetPoolArgs {
  id: Scalars['String'];
}

export interface QueryPoolGetPoolsArgs {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<GqlPoolOrderBy>;
  orderDirection?: InputMaybe<GqlPoolOrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  textSearch?: InputMaybe<Scalars['String']>;
  where?: InputMaybe<GqlPoolFilter>;
}

export interface QueryPoolGetPoolsCountArgs {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<GqlPoolOrderBy>;
  orderDirection?: InputMaybe<GqlPoolOrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  textSearch?: InputMaybe<Scalars['String']>;
  where?: InputMaybe<GqlPoolFilter>;
}

export interface QueryPoolGetSnapshotsArgs {
  id: Scalars['String'];
  range: GqlPoolSnapshotDataRange;
}

export interface QueryPoolGetSwapsArgs {
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<GqlPoolSwapFilter>;
}

export interface QueryPoolGetUserSwapVolumeArgs {
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<GqlUserSwapVolumeFilter>;
}

export interface QuerySorGetBatchSwapForTokensInArgs {
  swapOptions: GqlSorSwapOptionsInput;
  tokenOut: Scalars['String'];
  tokensIn: Array<GqlTokenAmountHumanReadable>;
}

export interface QuerySorGetSwapsArgs {
  swapAmount: Scalars['BigDecimal'];
  swapOptions: GqlSorSwapOptionsInput;
  swapType: GqlSorSwapType;
  tokenIn: Scalars['String'];
  tokenOut: Scalars['String'];
}

export interface QueryTokenGetCandlestickChartDataArgs {
  address: Scalars['String'];
  range: GqlTokenChartDataRange;
}

export interface QueryTokenGetHistoricalPricesArgs {
  addresses: Array<Scalars['String']>;
}

export interface QueryTokenGetPriceChartDataArgs {
  address: Scalars['String'];
  range: GqlTokenChartDataRange;
}

export interface QueryTokenGetRelativePriceChartDataArgs {
  range: GqlTokenChartDataRange;
  tokenIn: Scalars['String'];
  tokenOut: Scalars['String'];
}

export interface QueryTokenGetTokenDataArgs {
  address: Scalars['String'];
}

export interface QueryTokenGetTokenDynamicDataArgs {
  address: Scalars['String'];
}

export interface QueryTokenGetTokensDataArgs {
  addresses: Array<Scalars['String']>;
}

export interface QueryTokenGetTokensDynamicDataArgs {
  addresses: Array<Scalars['String']>;
}

export interface QueryUserGetPoolJoinExitsArgs {
  first?: InputMaybe<Scalars['Int']>;
  poolId: Scalars['String'];
  skip?: InputMaybe<Scalars['Int']>;
}

export interface QueryUserGetPortfolioSnapshotsArgs {
  days: Scalars['Int'];
}

export interface QueryUserGetSwapsArgs {
  first?: InputMaybe<Scalars['Int']>;
  poolId: Scalars['String'];
  skip?: InputMaybe<Scalars['Int']>;
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AmountHumanReadable: ResolverTypeWrapper<Scalars['AmountHumanReadable']>;
  BigDecimal: ResolverTypeWrapper<Scalars['BigDecimal']>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  Bytes: ResolverTypeWrapper<Scalars['Bytes']>;
  Date: ResolverTypeWrapper<Scalars['Date']>;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  GqlBalancePoolAprItem: ResolverTypeWrapper<GqlBalancePoolAprItem>;
  GqlBalancePoolAprSubItem: ResolverTypeWrapper<GqlBalancePoolAprSubItem>;
  GqlBigNumber: ResolverTypeWrapper<Scalars['GqlBigNumber']>;
  GqlContentNewsItem: ResolverTypeWrapper<GqlContentNewsItem>;
  GqlContentNewsItemSource: GqlContentNewsItemSource;
  GqlFeaturePoolGroupItemExternalLink: ResolverTypeWrapper<GqlFeaturePoolGroupItemExternalLink>;
  GqlHistoricalTokenPrice: ResolverTypeWrapper<GqlHistoricalTokenPrice>;
  GqlHistoricalTokenPriceEntry: ResolverTypeWrapper<GqlHistoricalTokenPriceEntry>;
  GqlLatestSyncedBlocks: ResolverTypeWrapper<GqlLatestSyncedBlocks>;
  GqlLge: ResolverTypeWrapper<GqlLge>;
  GqlLgeCreateInput: GqlLgeCreateInput;
  GqlLgeUpdateInput: GqlLgeUpdateInput;
  GqlPoolApr: ResolverTypeWrapper<GqlPoolApr>;
  GqlPoolAprItem: ResolverTypeWrapper<GqlPoolAprItem>;
  GqlPoolAprSubItem: ResolverTypeWrapper<GqlPoolAprSubItem>;
  GqlPoolBase:
    | ResolversTypes['GqlPoolElement']
    | ResolversTypes['GqlPoolLinear']
    | ResolversTypes['GqlPoolLiquidityBootstrapping']
    | ResolversTypes['GqlPoolMetaStable']
    | ResolversTypes['GqlPoolPhantomStable']
    | ResolversTypes['GqlPoolStable']
    | ResolversTypes['GqlPoolWeighted'];
  GqlPoolBatchSwap: ResolverTypeWrapper<GqlPoolBatchSwap>;
  GqlPoolBatchSwapPool: ResolverTypeWrapper<GqlPoolBatchSwapPool>;
  GqlPoolBatchSwapSwap: ResolverTypeWrapper<GqlPoolBatchSwapSwap>;
  GqlPoolDynamicData: ResolverTypeWrapper<GqlPoolDynamicData>;
  GqlPoolElement: ResolverTypeWrapper<GqlPoolElement>;
  GqlPoolFeaturedPoolGroup: ResolverTypeWrapper<
    Omit<GqlPoolFeaturedPoolGroup, 'items'> & {
      items: Array<ResolversTypes['GqlPoolFeaturedPoolGroupItem']>;
    }
  >;
  GqlPoolFeaturedPoolGroupItem:
    | ResolversTypes['GqlFeaturePoolGroupItemExternalLink']
    | ResolversTypes['GqlPoolMinimal'];
  GqlPoolFilter: GqlPoolFilter;
  GqlPoolFilterCategory: GqlPoolFilterCategory;
  GqlPoolFilterDefinition: ResolverTypeWrapper<GqlPoolFilterDefinition>;
  GqlPoolFilterType: GqlPoolFilterType;
  GqlPoolInvestConfig: ResolverTypeWrapper<GqlPoolInvestConfig>;
  GqlPoolInvestOption: ResolverTypeWrapper<GqlPoolInvestOption>;
  GqlPoolJoinExit: ResolverTypeWrapper<GqlPoolJoinExit>;
  GqlPoolJoinExitAmount: ResolverTypeWrapper<GqlPoolJoinExitAmount>;
  GqlPoolJoinExitFilter: GqlPoolJoinExitFilter;
  GqlPoolJoinExitType: GqlPoolJoinExitType;
  GqlPoolLinear: ResolverTypeWrapper<GqlPoolLinear>;
  GqlPoolLinearNested: ResolverTypeWrapper<GqlPoolLinearNested>;
  GqlPoolLinearPoolData: ResolverTypeWrapper<GqlPoolLinearPoolData>;
  GqlPoolLinearPoolMainToken: ResolverTypeWrapper<GqlPoolLinearPoolMainToken>;
  GqlPoolLinearPoolWrappedToken: ResolverTypeWrapper<GqlPoolLinearPoolWrappedToken>;
  GqlPoolLiquidityBootstrapping: ResolverTypeWrapper<
    Omit<GqlPoolLiquidityBootstrapping, 'tokens'> & {
      tokens: Array<ResolversTypes['GqlPoolTokenUnion']>;
    }
  >;
  GqlPoolMetaStable: ResolverTypeWrapper<GqlPoolMetaStable>;
  GqlPoolMinimal: ResolverTypeWrapper<GqlPoolMinimal>;
  GqlPoolMinimalType: GqlPoolMinimalType;
  GqlPoolNestedUnion:
    | ResolversTypes['GqlPoolLinearNested']
    | ResolversTypes['GqlPoolPhantomStableNested'];
  GqlPoolNestingType: GqlPoolNestingType;
  GqlPoolOrderBy: GqlPoolOrderBy;
  GqlPoolOrderDirection: GqlPoolOrderDirection;
  GqlPoolPhantomStable: ResolverTypeWrapper<
    Omit<GqlPoolPhantomStable, 'tokens'> & { tokens: Array<ResolversTypes['GqlPoolTokenUnion']> }
  >;
  GqlPoolPhantomStableNested: ResolverTypeWrapper<
    Omit<GqlPoolPhantomStableNested, 'tokens'> & {
      tokens: Array<ResolversTypes['GqlPoolTokenPhantomStableNestedUnion']>;
    }
  >;
  GqlPoolSnapshot: ResolverTypeWrapper<GqlPoolSnapshot>;
  GqlPoolSnapshotDataRange: GqlPoolSnapshotDataRange;
  GqlPoolStable: ResolverTypeWrapper<GqlPoolStable>;
  GqlPoolStablePhantomPoolData: ResolverTypeWrapper<GqlPoolStablePhantomPoolData>;
  GqlPoolStaking: ResolverTypeWrapper<GqlPoolStaking>;
  GqlPoolStakingFarmRewarder: ResolverTypeWrapper<GqlPoolStakingFarmRewarder>;
  GqlPoolStakingGauge: ResolverTypeWrapper<GqlPoolStakingGauge>;
  GqlPoolStakingGaugeReward: ResolverTypeWrapper<GqlPoolStakingGaugeReward>;
  GqlPoolStakingMasterChefFarm: ResolverTypeWrapper<GqlPoolStakingMasterChefFarm>;
  GqlPoolStakingReliquarFarmLevel: ResolverTypeWrapper<GqlPoolStakingReliquarFarmLevel>;
  GqlPoolStakingReliquaryFarm: ResolverTypeWrapper<GqlPoolStakingReliquaryFarm>;
  GqlPoolStakingType: GqlPoolStakingType;
  GqlPoolSwap: ResolverTypeWrapper<GqlPoolSwap>;
  GqlPoolSwapFilter: GqlPoolSwapFilter;
  GqlPoolToken: ResolverTypeWrapper<GqlPoolToken>;
  GqlPoolTokenBase:
    | ResolversTypes['GqlPoolToken']
    | ResolversTypes['GqlPoolTokenLinear']
    | ResolversTypes['GqlPoolTokenPhantomStable'];
  GqlPoolTokenDisplay: ResolverTypeWrapper<GqlPoolTokenDisplay>;
  GqlPoolTokenExpanded: ResolverTypeWrapper<GqlPoolTokenExpanded>;
  GqlPoolTokenLinear: ResolverTypeWrapper<GqlPoolTokenLinear>;
  GqlPoolTokenPhantomStable: ResolverTypeWrapper<GqlPoolTokenPhantomStable>;
  GqlPoolTokenPhantomStableNestedUnion:
    | ResolversTypes['GqlPoolToken']
    | ResolversTypes['GqlPoolTokenLinear'];
  GqlPoolTokenUnion:
    | ResolversTypes['GqlPoolToken']
    | ResolversTypes['GqlPoolTokenLinear']
    | ResolversTypes['GqlPoolTokenPhantomStable'];
  GqlPoolUnion:
    | ResolversTypes['GqlPoolElement']
    | ResolversTypes['GqlPoolLinear']
    | ResolversTypes['GqlPoolLiquidityBootstrapping']
    | ResolversTypes['GqlPoolMetaStable']
    | ResolversTypes['GqlPoolPhantomStable']
    | ResolversTypes['GqlPoolStable']
    | ResolversTypes['GqlPoolWeighted'];
  GqlPoolUserSwapVolume: ResolverTypeWrapper<GqlPoolUserSwapVolume>;
  GqlPoolWeighted: ResolverTypeWrapper<
    Omit<GqlPoolWeighted, 'tokens'> & { tokens: Array<ResolversTypes['GqlPoolTokenUnion']> }
  >;
  GqlPoolWithdrawConfig: ResolverTypeWrapper<GqlPoolWithdrawConfig>;
  GqlPoolWithdrawOption: ResolverTypeWrapper<GqlPoolWithdrawOption>;
  GqlProtocolMetrics: ResolverTypeWrapper<GqlProtocolMetrics>;
  GqlSorGetBatchSwapForTokensInResponse: ResolverTypeWrapper<GqlSorGetBatchSwapForTokensInResponse>;
  GqlSorGetSwapsResponse: ResolverTypeWrapper<GqlSorGetSwapsResponse>;
  GqlSorSwap: ResolverTypeWrapper<GqlSorSwap>;
  GqlSorSwapOptionsInput: GqlSorSwapOptionsInput;
  GqlSorSwapRoute: ResolverTypeWrapper<GqlSorSwapRoute>;
  GqlSorSwapRouteHop: ResolverTypeWrapper<GqlSorSwapRouteHop>;
  GqlSorSwapType: GqlSorSwapType;
  GqlToken: ResolverTypeWrapper<GqlToken>;
  GqlTokenAmountHumanReadable: GqlTokenAmountHumanReadable;
  GqlTokenCandlestickChartDataItem: ResolverTypeWrapper<GqlTokenCandlestickChartDataItem>;
  GqlTokenChartDataRange: GqlTokenChartDataRange;
  GqlTokenData: ResolverTypeWrapper<GqlTokenData>;
  GqlTokenDynamicData: ResolverTypeWrapper<GqlTokenDynamicData>;
  GqlTokenPrice: ResolverTypeWrapper<GqlTokenPrice>;
  GqlTokenPriceChartDataItem: ResolverTypeWrapper<GqlTokenPriceChartDataItem>;
  GqlTokenType: GqlTokenType;
  GqlUserFbeetsBalance: ResolverTypeWrapper<GqlUserFbeetsBalance>;
  GqlUserPoolBalance: ResolverTypeWrapper<GqlUserPoolBalance>;
  GqlUserPoolSnapshot: ResolverTypeWrapper<GqlUserPoolSnapshot>;
  GqlUserPortfolioSnapshot: ResolverTypeWrapper<GqlUserPortfolioSnapshot>;
  GqlUserSnapshotDataRange: GqlUserSnapshotDataRange;
  GqlUserSwapVolumeFilter: GqlUserSwapVolumeFilter;
  ID: ResolverTypeWrapper<Scalars['ID']>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']>;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AmountHumanReadable: Scalars['AmountHumanReadable'];
  BigDecimal: Scalars['BigDecimal'];
  BigInt: Scalars['BigInt'];
  Boolean: Scalars['Boolean'];
  Bytes: Scalars['Bytes'];
  Date: Scalars['Date'];
  Float: Scalars['Float'];
  GqlBalancePoolAprItem: GqlBalancePoolAprItem;
  GqlBalancePoolAprSubItem: GqlBalancePoolAprSubItem;
  GqlBigNumber: Scalars['GqlBigNumber'];
  GqlContentNewsItem: GqlContentNewsItem;
  GqlFeaturePoolGroupItemExternalLink: GqlFeaturePoolGroupItemExternalLink;
  GqlHistoricalTokenPrice: GqlHistoricalTokenPrice;
  GqlHistoricalTokenPriceEntry: GqlHistoricalTokenPriceEntry;
  GqlLatestSyncedBlocks: GqlLatestSyncedBlocks;
  GqlLge: GqlLge;
  GqlLgeCreateInput: GqlLgeCreateInput;
  GqlLgeUpdateInput: GqlLgeUpdateInput;
  GqlPoolApr: GqlPoolApr;
  GqlPoolAprItem: GqlPoolAprItem;
  GqlPoolAprSubItem: GqlPoolAprSubItem;
  GqlPoolBase:
    | ResolversParentTypes['GqlPoolElement']
    | ResolversParentTypes['GqlPoolLinear']
    | ResolversParentTypes['GqlPoolLiquidityBootstrapping']
    | ResolversParentTypes['GqlPoolMetaStable']
    | ResolversParentTypes['GqlPoolPhantomStable']
    | ResolversParentTypes['GqlPoolStable']
    | ResolversParentTypes['GqlPoolWeighted'];
  GqlPoolBatchSwap: GqlPoolBatchSwap;
  GqlPoolBatchSwapPool: GqlPoolBatchSwapPool;
  GqlPoolBatchSwapSwap: GqlPoolBatchSwapSwap;
  GqlPoolDynamicData: GqlPoolDynamicData;
  GqlPoolElement: GqlPoolElement;
  GqlPoolFeaturedPoolGroup: Omit<GqlPoolFeaturedPoolGroup, 'items'> & {
    items: Array<ResolversParentTypes['GqlPoolFeaturedPoolGroupItem']>;
  };
  GqlPoolFeaturedPoolGroupItem:
    | ResolversParentTypes['GqlFeaturePoolGroupItemExternalLink']
    | ResolversParentTypes['GqlPoolMinimal'];
  GqlPoolFilter: GqlPoolFilter;
  GqlPoolFilterDefinition: GqlPoolFilterDefinition;
  GqlPoolInvestConfig: GqlPoolInvestConfig;
  GqlPoolInvestOption: GqlPoolInvestOption;
  GqlPoolJoinExit: GqlPoolJoinExit;
  GqlPoolJoinExitAmount: GqlPoolJoinExitAmount;
  GqlPoolJoinExitFilter: GqlPoolJoinExitFilter;
  GqlPoolLinear: GqlPoolLinear;
  GqlPoolLinearNested: GqlPoolLinearNested;
  GqlPoolLinearPoolData: GqlPoolLinearPoolData;
  GqlPoolLinearPoolMainToken: GqlPoolLinearPoolMainToken;
  GqlPoolLinearPoolWrappedToken: GqlPoolLinearPoolWrappedToken;
  GqlPoolLiquidityBootstrapping: Omit<GqlPoolLiquidityBootstrapping, 'tokens'> & {
    tokens: Array<ResolversParentTypes['GqlPoolTokenUnion']>;
  };
  GqlPoolMetaStable: GqlPoolMetaStable;
  GqlPoolMinimal: GqlPoolMinimal;
  GqlPoolNestedUnion:
    | ResolversParentTypes['GqlPoolLinearNested']
    | ResolversParentTypes['GqlPoolPhantomStableNested'];
  GqlPoolPhantomStable: Omit<GqlPoolPhantomStable, 'tokens'> & {
    tokens: Array<ResolversParentTypes['GqlPoolTokenUnion']>;
  };
  GqlPoolPhantomStableNested: Omit<GqlPoolPhantomStableNested, 'tokens'> & {
    tokens: Array<ResolversParentTypes['GqlPoolTokenPhantomStableNestedUnion']>;
  };
  GqlPoolSnapshot: GqlPoolSnapshot;
  GqlPoolStable: GqlPoolStable;
  GqlPoolStablePhantomPoolData: GqlPoolStablePhantomPoolData;
  GqlPoolStaking: GqlPoolStaking;
  GqlPoolStakingFarmRewarder: GqlPoolStakingFarmRewarder;
  GqlPoolStakingGauge: GqlPoolStakingGauge;
  GqlPoolStakingGaugeReward: GqlPoolStakingGaugeReward;
  GqlPoolStakingMasterChefFarm: GqlPoolStakingMasterChefFarm;
  GqlPoolStakingReliquarFarmLevel: GqlPoolStakingReliquarFarmLevel;
  GqlPoolStakingReliquaryFarm: GqlPoolStakingReliquaryFarm;
  GqlPoolSwap: GqlPoolSwap;
  GqlPoolSwapFilter: GqlPoolSwapFilter;
  GqlPoolToken: GqlPoolToken;
  GqlPoolTokenBase:
    | ResolversParentTypes['GqlPoolToken']
    | ResolversParentTypes['GqlPoolTokenLinear']
    | ResolversParentTypes['GqlPoolTokenPhantomStable'];
  GqlPoolTokenDisplay: GqlPoolTokenDisplay;
  GqlPoolTokenExpanded: GqlPoolTokenExpanded;
  GqlPoolTokenLinear: GqlPoolTokenLinear;
  GqlPoolTokenPhantomStable: GqlPoolTokenPhantomStable;
  GqlPoolTokenPhantomStableNestedUnion:
    | ResolversParentTypes['GqlPoolToken']
    | ResolversParentTypes['GqlPoolTokenLinear'];
  GqlPoolTokenUnion:
    | ResolversParentTypes['GqlPoolToken']
    | ResolversParentTypes['GqlPoolTokenLinear']
    | ResolversParentTypes['GqlPoolTokenPhantomStable'];
  GqlPoolUnion:
    | ResolversParentTypes['GqlPoolElement']
    | ResolversParentTypes['GqlPoolLinear']
    | ResolversParentTypes['GqlPoolLiquidityBootstrapping']
    | ResolversParentTypes['GqlPoolMetaStable']
    | ResolversParentTypes['GqlPoolPhantomStable']
    | ResolversParentTypes['GqlPoolStable']
    | ResolversParentTypes['GqlPoolWeighted'];
  GqlPoolUserSwapVolume: GqlPoolUserSwapVolume;
  GqlPoolWeighted: Omit<GqlPoolWeighted, 'tokens'> & {
    tokens: Array<ResolversParentTypes['GqlPoolTokenUnion']>;
  };
  GqlPoolWithdrawConfig: GqlPoolWithdrawConfig;
  GqlPoolWithdrawOption: GqlPoolWithdrawOption;
  GqlProtocolMetrics: GqlProtocolMetrics;
  GqlSorGetBatchSwapForTokensInResponse: GqlSorGetBatchSwapForTokensInResponse;
  GqlSorGetSwapsResponse: GqlSorGetSwapsResponse;
  GqlSorSwap: GqlSorSwap;
  GqlSorSwapOptionsInput: GqlSorSwapOptionsInput;
  GqlSorSwapRoute: GqlSorSwapRoute;
  GqlSorSwapRouteHop: GqlSorSwapRouteHop;
  GqlToken: GqlToken;
  GqlTokenAmountHumanReadable: GqlTokenAmountHumanReadable;
  GqlTokenCandlestickChartDataItem: GqlTokenCandlestickChartDataItem;
  GqlTokenData: GqlTokenData;
  GqlTokenDynamicData: GqlTokenDynamicData;
  GqlTokenPrice: GqlTokenPrice;
  GqlTokenPriceChartDataItem: GqlTokenPriceChartDataItem;
  GqlUserFbeetsBalance: GqlUserFbeetsBalance;
  GqlUserPoolBalance: GqlUserPoolBalance;
  GqlUserPoolSnapshot: GqlUserPoolSnapshot;
  GqlUserPortfolioSnapshot: GqlUserPortfolioSnapshot;
  GqlUserSwapVolumeFilter: GqlUserSwapVolumeFilter;
  ID: Scalars['ID'];
  Int: Scalars['Int'];
  JSON: Scalars['JSON'];
  Mutation: {};
  Query: {};
  String: Scalars['String'];
}>;

export interface AmountHumanReadableScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['AmountHumanReadable'], any> {
  name: 'AmountHumanReadable';
}

export interface BigDecimalScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['BigDecimal'], any> {
  name: 'BigDecimal';
}

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export interface BytesScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Bytes'], any> {
  name: 'Bytes';
}

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}
