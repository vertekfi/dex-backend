
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum GqlPoolMinimalType {
    WEIGHTED = "WEIGHTED",
    STABLE = "STABLE",
    META_STABLE = "META_STABLE",
    PHANTOM_STABLE = "PHANTOM_STABLE",
    ELEMENT = "ELEMENT",
    LINEAR = "LINEAR",
    UNKNOWN = "UNKNOWN",
    LIQUIDITY_BOOTSTRAPPING = "LIQUIDITY_BOOTSTRAPPING",
    INVESTMENT = "INVESTMENT"
}

export enum GqlPoolNestingType {
    NO_NESTING = "NO_NESTING",
    HAS_SOME_PHANTOM_BPT = "HAS_SOME_PHANTOM_BPT",
    HAS_ONLY_PHANTOM_BPT = "HAS_ONLY_PHANTOM_BPT"
}

export enum GqlPoolOrderBy {
    totalLiquidity = "totalLiquidity",
    totalShares = "totalShares",
    volume24h = "volume24h",
    fees24h = "fees24h",
    apr = "apr"
}

export enum GqlPoolOrderDirection {
    asc = "asc",
    desc = "desc"
}

export enum GqlPoolFilterCategory {
    INCENTIVIZED = "INCENTIVIZED",
    BLACK_LISTED = "BLACK_LISTED"
}

export enum GqlPoolFilterType {
    WEIGHTED = "WEIGHTED",
    STABLE = "STABLE",
    META_STABLE = "META_STABLE",
    PHANTOM_STABLE = "PHANTOM_STABLE",
    ELEMENT = "ELEMENT",
    LINEAR = "LINEAR",
    UNKNOWN = "UNKNOWN",
    LIQUIDITY_BOOTSTRAPPING = "LIQUIDITY_BOOTSTRAPPING",
    INVESTMENT = "INVESTMENT"
}

export enum GqlPoolStakingType {
    MASTER_CHEF = "MASTER_CHEF",
    GAUGE = "GAUGE",
    FRESH_BEETS = "FRESH_BEETS",
    RELIQUARY = "RELIQUARY"
}

export enum GqlPoolJoinExitType {
    Join = "Join",
    Exit = "Exit"
}

export enum GqlPoolSnapshotDataRange {
    THIRTY_DAYS = "THIRTY_DAYS",
    NINETY_DAYS = "NINETY_DAYS",
    ONE_HUNDRED_EIGHTY_DAYS = "ONE_HUNDRED_EIGHTY_DAYS",
    ONE_YEAR = "ONE_YEAR",
    ALL_TIME = "ALL_TIME"
}

export interface GqlTokenAmountHumanReadable {
    address: string;
    amount: AmountHumanReadable;
}

export interface GqlPoolFilter {
    categoryIn?: Nullable<GqlPoolFilterCategory[]>;
    categoryNotIn?: Nullable<GqlPoolFilterCategory[]>;
    tokensIn?: Nullable<string[]>;
    tokensNotIn?: Nullable<string[]>;
    poolTypeIn?: Nullable<GqlPoolFilterType[]>;
    poolTypeNotIn?: Nullable<GqlPoolFilterType[]>;
    idIn?: Nullable<string[]>;
    idNotIn?: Nullable<string[]>;
    filterIn?: Nullable<string[]>;
    filterNotIn?: Nullable<string[]>;
}

export interface GqlPoolSwapFilter {
    tokenInIn?: Nullable<string[]>;
    tokenOutIn?: Nullable<string[]>;
    poolIdIn?: Nullable<string[]>;
}

export interface GqlPoolJoinExitFilter {
    poolIdIn?: Nullable<string[]>;
}

export interface GqlUserSwapVolumeFilter {
    tokenInIn?: Nullable<string[]>;
    tokenOutIn?: Nullable<string[]>;
    poolIdIn?: Nullable<string[]>;
}

export interface GqlPoolBase {
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner?: Nullable<Bytes>;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    dynamicData: GqlPoolDynamicData;
    staking?: Nullable<GqlPoolStaking>;
}

export interface GqlPoolTokenBase {
    id: string;
    address: string;
    balance: BigDecimal;
    decimals: number;
    name: string;
    symbol: string;
    index: number;
    priceRate: BigDecimal;
    weight?: Nullable<BigDecimal>;
    totalBalance: BigDecimal;
}

export interface IQuery {
    __typename?: 'IQuery';
    poolGetPool(id: string): GqlPoolBase | Promise<GqlPoolBase>;
    poolGetPools(first?: Nullable<number>, skip?: Nullable<number>, orderBy?: Nullable<GqlPoolOrderBy>, orderDirection?: Nullable<GqlPoolOrderDirection>, where?: Nullable<GqlPoolFilter>, textSearch?: Nullable<string>): GqlPoolMinimal[] | Promise<GqlPoolMinimal[]>;
    poolGetPoolsCount(first?: Nullable<number>, skip?: Nullable<number>, orderBy?: Nullable<GqlPoolOrderBy>, orderDirection?: Nullable<GqlPoolOrderDirection>, where?: Nullable<GqlPoolFilter>, textSearch?: Nullable<string>): number | Promise<number>;
    poolGetPoolFilters(): GqlPoolFilterDefinition[] | Promise<GqlPoolFilterDefinition[]>;
    poolGetSwaps(first?: Nullable<number>, skip?: Nullable<number>, where?: Nullable<GqlPoolSwapFilter>): GqlPoolSwap[] | Promise<GqlPoolSwap[]>;
    poolGetBatchSwaps(first?: Nullable<number>, skip?: Nullable<number>, where?: Nullable<GqlPoolSwapFilter>): GqlPoolBatchSwap[] | Promise<GqlPoolBatchSwap[]>;
    poolGetJoinExits(first?: Nullable<number>, skip?: Nullable<number>, where?: Nullable<GqlPoolJoinExitFilter>): GqlPoolJoinExit[] | Promise<GqlPoolJoinExit[]>;
    poolGetUserSwapVolume(first?: Nullable<number>, skip?: Nullable<number>, where?: Nullable<GqlUserSwapVolumeFilter>): GqlPoolUserSwapVolume[] | Promise<GqlPoolUserSwapVolume[]>;
    poolGetFeaturedPoolGroups(): GqlPoolFeaturedPoolGroup[] | Promise<GqlPoolFeaturedPoolGroup[]>;
    poolGetSnapshots(id: string, range: GqlPoolSnapshotDataRange): GqlPoolSnapshot[] | Promise<GqlPoolSnapshot[]>;
    poolGetAllPoolsSnapshots(range: GqlPoolSnapshotDataRange): GqlPoolSnapshot[] | Promise<GqlPoolSnapshot[]>;
    poolGetLinearPools(): GqlPoolLinear[] | Promise<GqlPoolLinear[]>;
}

export interface IMutation {
    __typename?: 'IMutation';
    poolSyncAllPoolsFromSubgraph(): string[] | Promise<string[]>;
    poolSyncNewPoolsFromSubgraph(): string[] | Promise<string[]>;
    poolLoadOnChainDataForAllPools(): string | Promise<string>;
    poolLoadOnChainDataForPoolsWithActiveUpdates(): string | Promise<string>;
    poolUpdateLiquidityValuesForAllPools(): string | Promise<string>;
    poolUpdateVolumeAndFeeValuesForAllPools(): string | Promise<string>;
    poolSyncSwapsForLast48Hours(): string | Promise<string>;
    poolSyncSanityPoolData(): string | Promise<string>;
    poolUpdateAprs(): string | Promise<string>;
    poolSyncPoolAllTokensRelationship(): string | Promise<string>;
    poolReloadAllPoolAprs(): string | Promise<string>;
    poolSyncTotalShares(): string | Promise<string>;
    poolReloadStakingForAllPools(stakingTypes: GqlPoolStakingType[]): string | Promise<string>;
    poolSyncStakingForPools(): string | Promise<string>;
    poolUpdateLiquidity24hAgoForAllPools(): string | Promise<string>;
    poolLoadSnapshotsForAllPools(): string | Promise<string>;
    poolSyncLatestSnapshotsForAllPools(daysToSync?: Nullable<number>): string | Promise<string>;
    poolUpdateLifetimeValuesForAllPools(): string | Promise<string>;
    poolInitializeSnapshotsForPool(poolId: string): string | Promise<string>;
    poolSyncPool(poolId: string): string | Promise<string>;
    poolReloadPoolNestedTokens(poolId: string): string | Promise<string>;
    poolReloadAllTokenNestedPoolIds(): string | Promise<string>;
}

export interface GqlPoolMinimal {
    __typename?: 'GqlPoolMinimal';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner?: Nullable<Bytes>;
    factory?: Nullable<Bytes>;
    createTime: number;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    dynamicData: GqlPoolDynamicData;
    staking?: Nullable<GqlPoolStaking>;
    type: GqlPoolMinimalType;
}

export interface GqlPoolDynamicData {
    __typename?: 'GqlPoolDynamicData';
    poolId: string;
    swapFee: BigDecimal;
    swapEnabled: boolean;
    totalShares: BigDecimal;
    totalLiquidity: BigDecimal;
    volume24h: BigDecimal;
    fees24h: BigDecimal;
    apr: GqlPoolApr;
    totalLiquidity24hAgo: BigDecimal;
    totalShares24hAgo: BigDecimal;
    volume48h: BigDecimal;
    fees48h: BigDecimal;
    lifetimeVolume: BigDecimal;
    lifetimeSwapFees: BigDecimal;
    holdersCount: BigInt;
    swapsCount: BigInt;
    sharePriceAth: BigDecimal;
    sharePriceAthTimestamp: number;
    sharePriceAtl: BigDecimal;
    sharePriceAtlTimestamp: number;
    totalLiquidityAth: BigDecimal;
    totalLiquidityAthTimestamp: number;
    totalLiquidityAtl: BigDecimal;
    totalLiquidityAtlTimestamp: number;
    volume24hAth: BigDecimal;
    volume24hAthTimestamp: number;
    volume24hAtl: BigDecimal;
    volume24hAtlTimestamp: number;
    fees24hAth: BigDecimal;
    fees24hAthTimestamp: number;
    fees24hAtl: BigDecimal;
    fees24hAtlTimestamp: number;
}

export interface GqlPoolInvestConfig {
    __typename?: 'GqlPoolInvestConfig';
    proportionalEnabled: boolean;
    singleAssetEnabled: boolean;
    options: GqlPoolInvestOption[];
}

export interface GqlPoolInvestOption {
    __typename?: 'GqlPoolInvestOption';
    poolTokenIndex: number;
    poolTokenAddress: string;
    tokenOptions: GqlPoolToken[];
}

export interface GqlPoolWithdrawConfig {
    __typename?: 'GqlPoolWithdrawConfig';
    proportionalEnabled: boolean;
    singleAssetEnabled: boolean;
    options: GqlPoolWithdrawOption[];
}

export interface GqlPoolWithdrawOption {
    __typename?: 'GqlPoolWithdrawOption';
    poolTokenIndex: number;
    poolTokenAddress: string;
    tokenOptions: GqlPoolToken[];
}

export interface GqlPoolWeighted extends GqlPoolBase {
    __typename?: 'GqlPoolWeighted';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    dynamicData: GqlPoolDynamicData;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    tokens: GqlPoolTokenUnion[];
    nestingType: GqlPoolNestingType;
    staking?: Nullable<GqlPoolStaking>;
}

export interface GqlPoolLiquidityBootstrapping extends GqlPoolBase {
    __typename?: 'GqlPoolLiquidityBootstrapping';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    dynamicData: GqlPoolDynamicData;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    tokens: GqlPoolTokenUnion[];
    nestingType: GqlPoolNestingType;
    staking?: Nullable<GqlPoolStaking>;
}

export interface GqlPoolStable extends GqlPoolBase {
    __typename?: 'GqlPoolStable';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    dynamicData: GqlPoolDynamicData;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    tokens: GqlPoolToken[];
    amp: BigInt;
    staking?: Nullable<GqlPoolStaking>;
}

export interface GqlPoolMetaStable extends GqlPoolBase {
    __typename?: 'GqlPoolMetaStable';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    dynamicData: GqlPoolDynamicData;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    tokens: GqlPoolToken[];
    amp: BigInt;
    staking?: Nullable<GqlPoolStaking>;
}

export interface GqlPoolPhantomStable extends GqlPoolBase {
    __typename?: 'GqlPoolPhantomStable';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    dynamicData: GqlPoolDynamicData;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    tokens: GqlPoolTokenUnion[];
    nestingType: GqlPoolNestingType;
    amp: BigInt;
    staking?: Nullable<GqlPoolStaking>;
    bptPriceRate: BigDecimal;
}

export interface GqlPoolElement extends GqlPoolBase {
    __typename?: 'GqlPoolElement';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    dynamicData: GqlPoolDynamicData;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    tokens: GqlPoolToken[];
    unitSeconds: BigInt;
    principalToken: Bytes;
    baseToken: Bytes;
    staking?: Nullable<GqlPoolStaking>;
}

export interface GqlPoolLinear extends GqlPoolBase {
    __typename?: 'GqlPoolLinear';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    decimals: number;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    investConfig: GqlPoolInvestConfig;
    withdrawConfig: GqlPoolWithdrawConfig;
    dynamicData: GqlPoolDynamicData;
    displayTokens: GqlPoolTokenDisplay[];
    allTokens: GqlPoolTokenExpanded[];
    tokens: GqlPoolToken[];
    mainIndex: number;
    wrappedIndex: number;
    upperTarget: BigInt;
    lowerTarget: BigInt;
    staking?: Nullable<GqlPoolStaking>;
    bptPriceRate: BigDecimal;
}

export interface GqlPoolLinearNested {
    __typename?: 'GqlPoolLinearNested';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    tokens: GqlPoolToken[];
    totalShares: BigDecimal;
    totalLiquidity: BigDecimal;
    mainIndex: number;
    wrappedIndex: number;
    upperTarget: BigInt;
    lowerTarget: BigInt;
    bptPriceRate: BigDecimal;
}

export interface GqlPoolPhantomStableNested {
    __typename?: 'GqlPoolPhantomStableNested';
    id: string;
    name: string;
    symbol: string;
    address: Bytes;
    owner: Bytes;
    factory?: Nullable<Bytes>;
    createTime: number;
    tokens: GqlPoolTokenPhantomStableNestedUnion[];
    nestingType: GqlPoolNestingType;
    totalShares: BigDecimal;
    totalLiquidity: BigDecimal;
    amp: BigInt;
    swapFee: BigDecimal;
    bptPriceRate: BigDecimal;
}

export interface GqlPoolToken extends GqlPoolTokenBase {
    __typename?: 'GqlPoolToken';
    id: string;
    address: string;
    decimals: number;
    name: string;
    symbol: string;
    index: number;
    balance: BigDecimal;
    priceRate: BigDecimal;
    weight?: Nullable<BigDecimal>;
    totalBalance: BigDecimal;
}

export interface GqlPoolTokenLinear extends GqlPoolTokenBase {
    __typename?: 'GqlPoolTokenLinear';
    id: string;
    address: string;
    balance: BigDecimal;
    decimals: number;
    name: string;
    symbol: string;
    index: number;
    priceRate: BigDecimal;
    weight?: Nullable<BigDecimal>;
    pool: GqlPoolLinearNested;
    mainTokenBalance: BigDecimal;
    wrappedTokenBalance: BigDecimal;
    totalMainTokenBalance: BigDecimal;
    totalBalance: BigDecimal;
}

export interface GqlPoolTokenPhantomStable extends GqlPoolTokenBase {
    __typename?: 'GqlPoolTokenPhantomStable';
    id: string;
    address: string;
    balance: BigDecimal;
    decimals: number;
    name: string;
    symbol: string;
    index: number;
    priceRate: BigDecimal;
    weight?: Nullable<BigDecimal>;
    totalBalance: BigDecimal;
    pool: GqlPoolPhantomStableNested;
}

export interface GqlPoolLinearPoolData {
    __typename?: 'GqlPoolLinearPoolData';
    id: string;
    address: string;
    symbol: string;
    priceRate: string;
    mainToken: GqlPoolLinearPoolMainToken;
    wrappedToken: GqlPoolLinearPoolWrappedToken;
    unwrappedTokenAddress: string;
    totalSupply: string;
    balance: string;
    poolToken: string;
    mainTokenTotalBalance: string;
}

export interface GqlPoolStablePhantomPoolData {
    __typename?: 'GqlPoolStablePhantomPoolData';
    id: string;
    address: string;
    symbol: string;
    tokens: GqlPoolToken[];
    totalSupply: string;
    balance: string;
}

export interface GqlPoolLinearPoolMainToken {
    __typename?: 'GqlPoolLinearPoolMainToken';
    address: string;
    index: number;
    balance: string;
    totalSupply: string;
    name: string;
    symbol: string;
    decimals: number;
}

export interface GqlPoolLinearPoolWrappedToken {
    __typename?: 'GqlPoolLinearPoolWrappedToken';
    address: string;
    index: number;
    balance: string;
    totalSupply: string;
    priceRate: string;
    name: string;
    symbol: string;
    decimals: number;
}

export interface GqlPoolApr {
    __typename?: 'GqlPoolApr';
    total: BigDecimal;
    min?: Nullable<BigDecimal>;
    max?: Nullable<BigDecimal>;
    swapApr: BigDecimal;
    nativeRewardApr: BigDecimal;
    thirdPartyApr: BigDecimal;
    items: GqlBalancePoolAprItem[];
    hasRewardApr: boolean;
}

export interface GqlPoolAprItem {
    __typename?: 'GqlPoolAprItem';
    title: string;
    apr: BigDecimal;
    subItems?: Nullable<GqlBalancePoolAprSubItem[]>;
}

export interface GqlPoolAprSubItem {
    __typename?: 'GqlPoolAprSubItem';
    title: string;
    apr: BigDecimal;
}

export interface GqlPoolTokenExpanded {
    __typename?: 'GqlPoolTokenExpanded';
    id: string;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    weight?: Nullable<string>;
    isNested: boolean;
    isPhantomBpt: boolean;
    isMainToken: boolean;
}

export interface GqlPoolFilterDefinition {
    __typename?: 'GqlPoolFilterDefinition';
    id: string;
    title: string;
}

export interface GqlPoolSwap {
    __typename?: 'GqlPoolSwap';
    id: string;
    poolId: string;
    userAddress: string;
    tokenIn: string;
    tokenOut: string;
    tokenAmountIn: string;
    tokenAmountOut: string;
    timestamp: number;
    tx: string;
    valueUSD: number;
}

export interface GqlPoolBatchSwap {
    __typename?: 'GqlPoolBatchSwap';
    id: string;
    userAddress: string;
    tokenIn: string;
    tokenOut: string;
    tokenAmountIn: string;
    tokenAmountOut: string;
    tokenInPrice: number;
    tokenOutPrice: number;
    timestamp: number;
    tx: string;
    valueUSD: number;
    swaps: GqlPoolBatchSwapSwap[];
}

export interface GqlPoolBatchSwapSwap {
    __typename?: 'GqlPoolBatchSwapSwap';
    id: string;
    pool: GqlPoolMinimal;
    userAddress: string;
    tokenIn: string;
    tokenOut: string;
    tokenAmountIn: string;
    tokenAmountOut: string;
    timestamp: number;
    tx: string;
    valueUSD: number;
}

export interface GqlPoolBatchSwapPool {
    __typename?: 'GqlPoolBatchSwapPool';
    id: string;
    tokens: string[];
}

export interface GqlPoolStaking {
    __typename?: 'GqlPoolStaking';
    id: string;
    type: GqlPoolStakingType;
    address: string;
    farm?: Nullable<GqlPoolStakingMasterChefFarm>;
    gauge?: Nullable<GqlPoolStakingGauge>;
    reliquary?: Nullable<GqlPoolStakingReliquaryFarm>;
}

export interface GqlPoolStakingMasterChefFarm {
    __typename?: 'GqlPoolStakingMasterChefFarm';
    id: string;
    beetsPerBlock: string;
    rewarders?: Nullable<GqlPoolStakingFarmRewarder[]>;
}

export interface GqlPoolStakingReliquaryFarm {
    __typename?: 'GqlPoolStakingReliquaryFarm';
    id: string;
    beetsPerSecond: string;
    levels?: Nullable<GqlPoolStakingReliquarFarmLevel[]>;
}

export interface GqlPoolStakingReliquarFarmLevel {
    __typename?: 'GqlPoolStakingReliquarFarmLevel';
    id: string;
    level: number;
    balance: BigDecimal;
    requiredMaturity: number;
    allocationPoints: number;
    apr: BigDecimal;
}

export interface GqlPoolStakingFarmRewarder {
    __typename?: 'GqlPoolStakingFarmRewarder';
    id: string;
    address: string;
    tokenAddress: string;
    rewardPerSecond: string;
}

export interface GqlPoolStakingGauge {
    __typename?: 'GqlPoolStakingGauge';
    id: string;
    gaugeAddress: string;
    rewards: GqlPoolStakingGaugeReward[];
}

export interface GqlPoolStakingGaugeReward {
    __typename?: 'GqlPoolStakingGaugeReward';
    id: string;
    tokenAddress: string;
    rewardPerSecond: string;
}

export interface GqlPoolJoinExit {
    __typename?: 'GqlPoolJoinExit';
    id: string;
    type: GqlPoolJoinExitType;
    sender: string;
    poolId: string;
    timestamp: number;
    valueUSD?: Nullable<string>;
    tx: string;
    amounts: GqlPoolJoinExitAmount[];
}

export interface GqlPoolJoinExitAmount {
    __typename?: 'GqlPoolJoinExitAmount';
    address: string;
    amount: string;
}

export interface GqlBalancePoolAprItem {
    __typename?: 'GqlBalancePoolAprItem';
    id: string;
    title: string;
    apr: BigDecimal;
    subItems?: Nullable<GqlBalancePoolAprSubItem[]>;
}

export interface GqlBalancePoolAprSubItem {
    __typename?: 'GqlBalancePoolAprSubItem';
    id: string;
    title: string;
    apr: BigDecimal;
}

export interface GqlPoolUserSwapVolume {
    __typename?: 'GqlPoolUserSwapVolume';
    userAddress: string;
    swapVolumeUSD: BigDecimal;
}

export interface GqlPoolFeaturedPoolGroup {
    __typename?: 'GqlPoolFeaturedPoolGroup';
    id: string;
    title: string;
    icon: string;
    items: GqlPoolFeaturedPoolGroupItem[];
}

export interface GqlFeaturePoolGroupItemExternalLink {
    __typename?: 'GqlFeaturePoolGroupItemExternalLink';
    id: string;
    image: string;
    buttonText: string;
    buttonUrl: string;
}

export interface GqlPoolSnapshot {
    __typename?: 'GqlPoolSnapshot';
    id: string;
    poolId: string;
    timestamp: number;
    totalLiquidity: string;
    volume24h: string;
    fees24h: string;
    totalShares: string;
    totalSwapVolume: string;
    totalSwapFee: string;
    swapsCount: string;
    holdersCount: string;
    sharePrice: string;
    amounts: string[];
}

export interface GqlPoolTokenDisplay {
    __typename?: 'GqlPoolTokenDisplay';
    id: string;
    address: string;
    name: string;
    symbol: string;
    weight?: Nullable<BigDecimal>;
    nestedTokens?: Nullable<GqlPoolTokenDisplay[]>;
}

export type GqlBigNumber = any;
export type Bytes = any;
export type BigInt = any;
export type BigDecimal = any;
export type JSON = any;
export type AmountHumanReadable = any;
export type GqlPoolUnion = GqlPoolWeighted | GqlPoolStable | GqlPoolMetaStable | GqlPoolLinear | GqlPoolPhantomStable | GqlPoolElement | GqlPoolLiquidityBootstrapping;
export type GqlPoolNestedUnion = GqlPoolLinearNested | GqlPoolPhantomStableNested;
export type GqlPoolTokenUnion = GqlPoolToken | GqlPoolTokenPhantomStable | GqlPoolTokenLinear;
export type GqlPoolTokenPhantomStableNestedUnion = GqlPoolToken | GqlPoolTokenLinear;
export type GqlPoolFeaturedPoolGroupItem = GqlPoolMinimal | GqlFeaturePoolGroupItemExternalLink;
type Nullable<T> = T | null;
