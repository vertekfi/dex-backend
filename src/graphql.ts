
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum GqlSorSwapType {
    EXACT_IN = "EXACT_IN",
    EXACT_OUT = "EXACT_OUT"
}

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

export enum GqlContentNewsItemSource {
    twitter = "twitter",
    discord = "discord",
    medium = "medium"
}

export enum GqlTokenChartDataRange {
    SEVEN_DAY = "SEVEN_DAY",
    THIRTY_DAY = "THIRTY_DAY"
}

export enum GqlTokenType {
    WHITE_LISTED = "WHITE_LISTED",
    BPT = "BPT",
    PHANTOM_BPT = "PHANTOM_BPT",
    LINEAR_WRAPPED_TOKEN = "LINEAR_WRAPPED_TOKEN"
}

export enum GqlUserSnapshotDataRange {
    THIRTY_DAYS = "THIRTY_DAYS",
    NINETY_DAYS = "NINETY_DAYS",
    ONE_HUNDRED_EIGHTY_DAYS = "ONE_HUNDRED_EIGHTY_DAYS",
    ONE_YEAR = "ONE_YEAR",
    ALL_TIME = "ALL_TIME"
}

export interface GqlSorSwapOptionsInput {
    timestamp?: Nullable<number>;
    maxPools?: Nullable<number>;
    forceRefresh?: Nullable<boolean>;
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
    sorGetSwaps(tokenIn: string, tokenOut: string, swapType: GqlSorSwapType, swapAmount: BigDecimal, swapOptions: GqlSorSwapOptionsInput): GqlSorGetSwapsResponse | Promise<GqlSorGetSwapsResponse>;
    sorGetBatchSwapForTokensIn(tokensIn: GqlTokenAmountHumanReadable[], tokenOut: string, swapOptions: GqlSorSwapOptionsInput): GqlSorGetBatchSwapForTokensInResponse | Promise<GqlSorGetBatchSwapForTokensInResponse>;
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
    beetsGetBeetsPrice(): string | Promise<string>;
    protocolMetrics(): GqlProtocolMetrics | Promise<GqlProtocolMetrics>;
    latestSyncedBlocks(): GqlLatestSyncedBlocks | Promise<GqlLatestSyncedBlocks>;
    blocksGetBlocksPerDay(): number | Promise<number>;
    blocksGetAverageBlockTime(): number | Promise<number>;
    contentGetNewsItems(): Nullable<GqlContentNewsItem>[] | Promise<Nullable<GqlContentNewsItem>[]>;
    getRewardPools(user?: Nullable<string>): Nullable<RewardPool>[] | Promise<Nullable<RewardPool>[]>;
    tokenGetTokens(): GqlToken[] | Promise<GqlToken[]>;
    tokenGetCurrentPrices(): GqlTokenPrice[] | Promise<GqlTokenPrice[]>;
    tokenGetHistoricalPrices(addresses: string[]): GqlHistoricalTokenPrice[] | Promise<GqlHistoricalTokenPrice[]>;
    tokenGetTokensDynamicData(addresses: string[]): GqlTokenDynamicData[] | Promise<GqlTokenDynamicData[]>;
    tokenGetTokenDynamicData(address: string): Nullable<GqlTokenDynamicData> | Promise<Nullable<GqlTokenDynamicData>>;
    tokenGetRelativePriceChartData(tokenIn: string, tokenOut: string, range: GqlTokenChartDataRange): GqlTokenPriceChartDataItem[] | Promise<GqlTokenPriceChartDataItem[]>;
    tokenGetPriceChartData(address: string, range: GqlTokenChartDataRange): GqlTokenPriceChartDataItem[] | Promise<GqlTokenPriceChartDataItem[]>;
    tokenGetCandlestickChartData(address: string, range: GqlTokenChartDataRange): GqlTokenCandlestickChartDataItem[] | Promise<GqlTokenCandlestickChartDataItem[]>;
    tokenGetTokenData(address: string): Nullable<GqlTokenData> | Promise<Nullable<GqlTokenData>>;
    tokenGetTokensData(addresses: string[]): GqlTokenData[] | Promise<GqlTokenData[]>;
    userGetPoolBalances(): GqlUserPoolBalance[] | Promise<GqlUserPoolBalance[]>;
    userGetFbeetsBalance(): GqlUserFbeetsBalance | Promise<GqlUserFbeetsBalance>;
    userGetStaking(): GqlPoolStaking[] | Promise<GqlPoolStaking[]>;
    userGetPoolJoinExits(first: number, skip: number, poolId: string): GqlPoolJoinExit[] | Promise<GqlPoolJoinExit[]>;
    userGetSwaps(first: number, skip: number, poolId: string): GqlPoolSwap[] | Promise<GqlPoolSwap[]>;
    userGetPortfolioSnapshots(days: number): GqlUserPortfolioSnapshot[] | Promise<GqlUserPortfolioSnapshot[]>;
}

export interface GqlSorGetSwapsResponse {
    __typename?: 'GqlSorGetSwapsResponse';
    tokenIn: string;
    tokenOut: string;
    tokenAddresses: string[];
    swapType: GqlSorSwapType;
    swaps: GqlSorSwap[];
    tokenInAmount: AmountHumanReadable;
    tokenOutAmount: AmountHumanReadable;
    swapAmount: AmountHumanReadable;
    swapAmountScaled: BigDecimal;
    swapAmountForSwaps?: Nullable<BigDecimal>;
    returnAmount: AmountHumanReadable;
    returnAmountScaled: BigDecimal;
    returnAmountFromSwaps?: Nullable<BigDecimal>;
    returnAmountConsideringFees: BigDecimal;
    marketSp: string;
    routes: GqlSorSwapRoute[];
    effectivePrice: AmountHumanReadable;
    effectivePriceReversed: AmountHumanReadable;
    priceImpact: AmountHumanReadable;
}

export interface GqlSorSwap {
    __typename?: 'GqlSorSwap';
    poolId: string;
    assetInIndex: number;
    assetOutIndex: number;
    amount: string;
    userData: string;
}

export interface GqlSorSwapRoute {
    __typename?: 'GqlSorSwapRoute';
    tokenIn: string;
    tokenInAmount: BigDecimal;
    tokenOut: string;
    tokenOutAmount: BigDecimal;
    share: number;
    hops: GqlSorSwapRouteHop[];
}

export interface GqlSorSwapRouteHop {
    __typename?: 'GqlSorSwapRouteHop';
    tokenIn: string;
    tokenInAmount: BigDecimal;
    tokenOut: string;
    tokenOutAmount: BigDecimal;
    poolId: string;
    pool: GqlPoolMinimal;
}

export interface GqlSorGetBatchSwapForTokensInResponse {
    __typename?: 'GqlSorGetBatchSwapForTokensInResponse';
    tokenOutAmount: AmountHumanReadable;
    swaps: GqlSorSwap[];
    assets: string[];
}

export interface IMutation {
    __typename?: 'IMutation';
    syncGaugeData(): string | Promise<string>;
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
    protocolCacheMetrics(): string | Promise<string>;
    tokenReloadTokenPrices(): Nullable<boolean> | Promise<Nullable<boolean>>;
    tokenSyncTokenDefinitions(): string | Promise<string>;
    tokenSyncTokenDynamicData(): string | Promise<string>;
    tokenInitChartData(tokenAddress: string): string | Promise<string>;
    tokenDeletePrice(tokenAddress: string, timestamp: number): boolean | Promise<boolean>;
    tokenDeleteTokenType(tokenAddress: string, type: GqlTokenType): string | Promise<string>;
    userSyncBalance(poolId: string): string | Promise<string>;
    userSyncBalanceAllPools(): string | Promise<string>;
    userInitWalletBalancesForAllPools(): string | Promise<string>;
    userInitWalletBalancesForPool(poolId: string): string | Promise<string>;
    userSyncChangedWalletBalancesForAllPools(): string | Promise<string>;
    userInitStakedBalances(stakingTypes: GqlPoolStakingType[]): string | Promise<string>;
    userSyncChangedStakedBalances(): string | Promise<string>;
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
    bptPriceRate?: Nullable<BigDecimal>;
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
    bptPriceRate?: Nullable<BigDecimal>;
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
    bptPriceRate?: Nullable<BigDecimal>;
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
    bptPriceRate?: Nullable<BigDecimal>;
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

export interface GqlProtocolMetrics {
    __typename?: 'GqlProtocolMetrics';
    totalLiquidity: BigDecimal;
    totalSwapVolume: BigDecimal;
    totalSwapFee: BigDecimal;
    poolCount: BigInt;
    swapFee24h: BigDecimal;
    swapVolume24h: BigDecimal;
}

export interface GqlLatestSyncedBlocks {
    __typename?: 'GqlLatestSyncedBlocks';
    userWalletSyncBlock: BigInt;
    userStakeSyncBlock: BigInt;
    poolSyncBlock: BigInt;
}

export interface GqlContentNewsItem {
    __typename?: 'GqlContentNewsItem';
    id: string;
    timestamp: string;
    url: string;
    text: string;
    source: GqlContentNewsItemSource;
    image?: Nullable<string>;
    discussionUrl?: Nullable<string>;
}

export interface RewardPool {
    __typename?: 'RewardPool';
    address: string;
    amountStaked: string;
    amountStakedValue: string;
    startBlock: number;
    endBlock: number;
    blocksRemaining: string;
    isPartnerPool: boolean;
    rewardToken: RewardPoolRewardToken;
    userInfo?: Nullable<RewardPoolUserInfo>;
    aprs: RewardPoolAprs;
}

export interface RewardPoolRewardToken {
    __typename?: 'RewardPoolRewardToken';
    address: string;
    name: string;
    symbol: string;
    logoURI: string;
    rewardPerBlock: string;
    price: number;
}

export interface RewardPoolAprs {
    __typename?: 'RewardPoolAprs';
    apr: string;
    daily: string;
}

export interface RewardPoolUserInfo {
    __typename?: 'RewardPoolUserInfo';
    poolAddress: string;
    amountDeposited: string;
    amountDepositedFull: string;
    depositValue: string;
    hasPendingRewards: boolean;
    pendingRewards: string;
    pendingRewardValue: string;
    percentageOwned: string;
}

export interface GqlTokenPrice {
    __typename?: 'GqlTokenPrice';
    address: string;
    price: number;
}

export interface GqlHistoricalTokenPrice {
    __typename?: 'GqlHistoricalTokenPrice';
    address: string;
    prices: GqlHistoricalTokenPriceEntry[];
}

export interface GqlHistoricalTokenPriceEntry {
    __typename?: 'GqlHistoricalTokenPriceEntry';
    timestamp: string;
    price: number;
}

export interface GqlToken {
    __typename?: 'GqlToken';
    address: string;
    name: string;
    description?: Nullable<string>;
    symbol: string;
    decimals: number;
    chainId: number;
    websiteUrl?: Nullable<string>;
    discordUrl?: Nullable<string>;
    telegramUrl?: Nullable<string>;
    twitterUsername?: Nullable<string>;
    logoURI?: Nullable<string>;
    priority: number;
    tradable: boolean;
}

export interface GqlTokenDynamicData {
    __typename?: 'GqlTokenDynamicData';
    id: string;
    tokenAddress: string;
    price: number;
    ath: number;
    atl: number;
    marketCap?: Nullable<string>;
    fdv?: Nullable<string>;
    high24h: number;
    low24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    priceChangePercent7d?: Nullable<number>;
    priceChangePercent14d?: Nullable<number>;
    priceChangePercent30d?: Nullable<number>;
    updatedAt: string;
}

export interface GqlTokenCandlestickChartDataItem {
    __typename?: 'GqlTokenCandlestickChartDataItem';
    id: string;
    timestamp: number;
    open: AmountHumanReadable;
    high: AmountHumanReadable;
    low: AmountHumanReadable;
    close: AmountHumanReadable;
}

export interface GqlTokenPriceChartDataItem {
    __typename?: 'GqlTokenPriceChartDataItem';
    id: string;
    timestamp: number;
    price: AmountHumanReadable;
}

export interface GqlTokenData {
    __typename?: 'GqlTokenData';
    id: string;
    tokenAddress: string;
    description?: Nullable<string>;
    websiteUrl?: Nullable<string>;
    discordUrl?: Nullable<string>;
    telegramUrl?: Nullable<string>;
    twitterUsername?: Nullable<string>;
}

export interface GqlUserPoolBalance {
    __typename?: 'GqlUserPoolBalance';
    poolId: string;
    tokenAddress: string;
    tokenPrice: number;
    totalBalance: AmountHumanReadable;
    walletBalance: AmountHumanReadable;
    stakedBalance: AmountHumanReadable;
}

export interface GqlUserFbeetsBalance {
    __typename?: 'GqlUserFbeetsBalance';
    id: string;
    totalBalance: AmountHumanReadable;
    walletBalance: AmountHumanReadable;
    stakedBalance: AmountHumanReadable;
}

export interface GqlUserPortfolioSnapshot {
    __typename?: 'GqlUserPortfolioSnapshot';
    timestamp: number;
    walletBalance: AmountHumanReadable;
    gaugeBalance: AmountHumanReadable;
    farmBalance: AmountHumanReadable;
    totalBalance: AmountHumanReadable;
    totalValueUSD: AmountHumanReadable;
    fees24h: AmountHumanReadable;
    totalFees: AmountHumanReadable;
    pools: GqlUserPoolSnapshot[];
}

export interface GqlUserPoolSnapshot {
    __typename?: 'GqlUserPoolSnapshot';
    timestamp: number;
    percentShare: number;
    walletBalance: AmountHumanReadable;
    gaugeBalance: AmountHumanReadable;
    farmBalance: AmountHumanReadable;
    totalBalance: AmountHumanReadable;
    totalValueUSD: AmountHumanReadable;
    fees24h: AmountHumanReadable;
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
