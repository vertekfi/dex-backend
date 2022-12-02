-- CreateEnum
CREATE TYPE "PrismaPoolType" AS ENUM ('WEIGHTED', 'STABLE', 'META_STABLE', 'PHANTOM_STABLE', 'ELEMENT', 'LINEAR', 'UNKNOWN', 'LIQUIDITY_BOOTSTRAPPING', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "PrismaPoolAprType" AS ENUM ('SWAP_FEE', 'NATIVE_REWARD', 'THIRD_PARTY_REWARD', 'LINEAR_BOOSTED', 'PHANTOM_STABLE_BOOSTED', 'IB_YIELD');

-- CreateEnum
CREATE TYPE "PrismaPoolAprItemGroup" AS ENUM ('YEARN', 'REAPER', 'OVERNIGHT');

-- CreateEnum
CREATE TYPE "PrismaPoolCategoryType" AS ENUM ('INCENTIVIZED', 'BLACK_LISTED');

-- CreateEnum
CREATE TYPE "PrismaPoolStakingType" AS ENUM ('MASTER_CHEF', 'GAUGE', 'RELIQUARY', 'FRESH_BEETS');

-- CreateEnum
CREATE TYPE "PrismaTokenTypeOption" AS ENUM ('WHITE_LISTED', 'BPT', 'PHANTOM_BPT', 'LINEAR_WRAPPED_TOKEN');

-- CreateEnum
CREATE TYPE "PrismaUserBalanceType" AS ENUM ('WALLET', 'STAKED', 'RELIQUARY');

-- CreateTable
CREATE TABLE "PrismaPool" (
    "id" TEXT NOT NULL,
    "createTime" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PrismaPoolType" NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 18,
    "owner" TEXT NOT NULL,
    "factory" TEXT,

    CONSTRAINT "PrismaPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolLinearData" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "mainIndex" INTEGER NOT NULL,
    "wrappedIndex" INTEGER NOT NULL,

    CONSTRAINT "PrismaPoolLinearData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolElementData" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "unitSeconds" TEXT NOT NULL,
    "principalToken" TEXT NOT NULL,
    "baseToken" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolElementData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolDynamicData" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "swapFee" TEXT NOT NULL,
    "swapEnabled" BOOLEAN NOT NULL,
    "totalShares" TEXT NOT NULL,
    "totalSharesNum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLiquidity" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION NOT NULL,
    "fees24h" DOUBLE PRECISION NOT NULL,
    "apr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume48h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fees48h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLiquidity24hAgo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalShares24hAgo" TEXT NOT NULL DEFAULT '0',
    "lifetimeVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetimeSwapFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "holdersCount" INTEGER NOT NULL DEFAULT 0,
    "swapsCount" INTEGER NOT NULL DEFAULT 0,
    "sharePriceAth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sharePriceAthTimestamp" INTEGER NOT NULL DEFAULT 0,
    "sharePriceAtl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sharePriceAtlTimestamp" INTEGER NOT NULL DEFAULT 0,
    "totalLiquidityAth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLiquidityAthTimestamp" INTEGER NOT NULL DEFAULT 0,
    "totalLiquidityAtl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLiquidityAtlTimestamp" INTEGER NOT NULL DEFAULT 0,
    "volume24hAth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume24hAthTimestamp" INTEGER NOT NULL DEFAULT 0,
    "volume24hAtl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume24hAtlTimestamp" INTEGER NOT NULL DEFAULT 0,
    "fees24hAth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fees24hAthTimestamp" INTEGER NOT NULL DEFAULT 0,
    "fees24hAtl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fees24hAtlTimestamp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrismaPoolDynamicData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStableDynamicData" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amp" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolStableDynamicData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolLinearDynamicData" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lowerTarget" TEXT NOT NULL,
    "upperTarget" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolLinearDynamicData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolToken" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "nestedPoolId" TEXT,

    CONSTRAINT "PrismaPoolToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolTokenDynamicData" (
    "id" TEXT NOT NULL,
    "poolTokenId" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balance" TEXT NOT NULL,
    "balanceUSD" DOUBLE PRECISION NOT NULL,
    "weight" TEXT,
    "priceRate" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolTokenDynamicData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolSwap" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "tokenIn" TEXT NOT NULL,
    "tokenInSym" TEXT NOT NULL,
    "tokenOut" TEXT NOT NULL,
    "tokenOutSym" TEXT NOT NULL,
    "tokenAmountIn" TEXT NOT NULL,
    "tokenAmountOut" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "tx" TEXT NOT NULL,
    "valueUSD" DOUBLE PRECISION NOT NULL,
    "batchSwapId" TEXT,
    "batchSwapIdx" INTEGER,

    CONSTRAINT "PrismaPoolSwap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolBatchSwap" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "tokenIn" TEXT NOT NULL,
    "tokenOut" TEXT NOT NULL,
    "tokenAmountIn" TEXT NOT NULL,
    "tokenAmountOut" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "tx" TEXT NOT NULL,
    "valueUSD" DOUBLE PRECISION NOT NULL,
    "tokenInPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tokenOutPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PrismaPoolBatchSwap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolAprItem" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "apr" DOUBLE PRECISION NOT NULL,
    "type" "PrismaPoolAprType",
    "group" "PrismaPoolAprItemGroup",

    CONSTRAINT "PrismaPoolAprItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolAprRange" (
    "id" TEXT NOT NULL,
    "aprItemId" TEXT NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PrismaPoolAprRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolCategory" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "category" "PrismaPoolCategoryType" NOT NULL,

    CONSTRAINT "PrismaPoolCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolExpandedTokens" (
    "tokenAddress" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "nestedPoolId" TEXT,

    CONSTRAINT "PrismaPoolExpandedTokens_pkey" PRIMARY KEY ("tokenAddress","poolId")
);

-- CreateTable
CREATE TABLE "PrismaPoolFilter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolFilterMap" (
    "id" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolFilterMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStaking" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "type" "PrismaPoolStakingType" NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolStaking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStakingMasterChefFarm" (
    "id" TEXT NOT NULL,
    "stakingId" TEXT NOT NULL,
    "beetsPerBlock" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolStakingMasterChefFarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStakingMasterChefFarmRewarder" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "rewardPerSecond" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolStakingMasterChefFarmRewarder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStakingGauge" (
    "id" TEXT NOT NULL,
    "stakingId" TEXT NOT NULL,
    "gaugeAddress" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolStakingGauge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStakingGaugeReward" (
    "id" TEXT NOT NULL,
    "gaugeId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "rewardPerSecond" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolStakingGaugeReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStakingReliquaryFarm" (
    "id" TEXT NOT NULL,
    "stakingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beetsPerSecond" TEXT NOT NULL,

    CONSTRAINT "PrismaPoolStakingReliquaryFarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolStakingReliquaryFarmLevel" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "balance" TEXT NOT NULL,
    "requiredMaturity" INTEGER NOT NULL,
    "allocationPoints" INTEGER NOT NULL,
    "apr" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PrismaPoolStakingReliquaryFarmLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaPoolSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "totalLiquidity" DOUBLE PRECISION NOT NULL,
    "sharePrice" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION NOT NULL,
    "fees24h" DOUBLE PRECISION NOT NULL,
    "totalShares" TEXT NOT NULL,
    "totalSharesNum" DOUBLE PRECISION NOT NULL,
    "totalSwapVolume" DOUBLE PRECISION NOT NULL,
    "totalSwapFee" DOUBLE PRECISION NOT NULL,
    "swapsCount" INTEGER NOT NULL,
    "holdersCount" INTEGER NOT NULL,
    "amounts" TEXT[],

    CONSTRAINT "PrismaPoolSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaToken" (
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "decimals" INTEGER NOT NULL,
    "logoURI" TEXT,
    "websiteUrl" TEXT,
    "discordUrl" TEXT,
    "telegramUrl" TEXT,
    "twitterUsername" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "coingeckoPlatformId" TEXT,
    "coingeckoContractAddress" TEXT,
    "coingeckoTokenId" TEXT,

    CONSTRAINT "PrismaToken_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "PrismaTokenCurrentPrice" (
    "tokenAddress" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "coingecko" BOOLEAN,

    CONSTRAINT "PrismaTokenCurrentPrice_pkey" PRIMARY KEY ("tokenAddress")
);

-- CreateTable
CREATE TABLE "PrismaTokenPrice" (
    "tokenAddress" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "coingecko" BOOLEAN,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PrismaTokenPrice_pkey" PRIMARY KEY ("tokenAddress","timestamp")
);

-- CreateTable
CREATE TABLE "PrismaTokenDynamicData" (
    "coingeckoId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "ath" DOUBLE PRECISION NOT NULL,
    "atl" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION,
    "fdv" DOUBLE PRECISION,
    "high24h" DOUBLE PRECISION NOT NULL,
    "low24h" DOUBLE PRECISION NOT NULL,
    "priceChange24h" DOUBLE PRECISION NOT NULL,
    "priceChangePercent24h" DOUBLE PRECISION NOT NULL,
    "priceChangePercent7d" DOUBLE PRECISION,
    "priceChangePercent14d" DOUBLE PRECISION,
    "priceChangePercent30d" DOUBLE PRECISION,

    CONSTRAINT "PrismaTokenDynamicData_pkey" PRIMARY KEY ("tokenAddress")
);

-- CreateTable
CREATE TABLE "PrismaTokenType" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "type" "PrismaTokenTypeOption" NOT NULL,

    CONSTRAINT "PrismaTokenType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaUser" (
    "address" TEXT NOT NULL,

    CONSTRAINT "PrismaUser_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "PrismaUserWalletBalance" (
    "id" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "balanceNum" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userAddress" TEXT NOT NULL,
    "poolId" TEXT,
    "tokenAddress" TEXT NOT NULL,

    CONSTRAINT "PrismaUserWalletBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaUserStakedBalance" (
    "id" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "balanceNum" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userAddress" TEXT NOT NULL,
    "poolId" TEXT,
    "tokenAddress" TEXT NOT NULL,
    "stakingId" TEXT NOT NULL,

    CONSTRAINT "PrismaUserStakedBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrismaUserBalanceSyncStatus" (
    "type" "PrismaUserBalanceType" NOT NULL,
    "blockNumber" INTEGER NOT NULL,

    CONSTRAINT "PrismaUserBalanceSyncStatus_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "PrismaUserPoolBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "poolToken" TEXT NOT NULL,
    "poolId" TEXT,
    "walletBalance" TEXT NOT NULL,
    "gaugeBalance" TEXT NOT NULL,
    "farmBalance" TEXT NOT NULL,
    "totalBalance" TEXT NOT NULL,
    "percentShare" TEXT NOT NULL,
    "totalValueUSD" TEXT NOT NULL,
    "fees24h" TEXT NOT NULL,

    CONSTRAINT "PrismaUserPoolBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPool_address_key" ON "PrismaPool"("address");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolLinearData_poolId_key" ON "PrismaPoolLinearData"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolElementData_poolId_key" ON "PrismaPoolElementData"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolDynamicData_poolId_key" ON "PrismaPoolDynamicData"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolStableDynamicData_poolId_key" ON "PrismaPoolStableDynamicData"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolLinearDynamicData_poolId_key" ON "PrismaPoolLinearDynamicData"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolTokenDynamicData_poolTokenId_key" ON "PrismaPoolTokenDynamicData"("poolTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolAprRange_aprItemId_key" ON "PrismaPoolAprRange"("aprItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolStaking_poolId_key" ON "PrismaPoolStaking"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolStakingMasterChefFarm_stakingId_key" ON "PrismaPoolStakingMasterChefFarm"("stakingId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolStakingGauge_stakingId_key" ON "PrismaPoolStakingGauge"("stakingId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaPoolStakingReliquaryFarm_stakingId_key" ON "PrismaPoolStakingReliquaryFarm"("stakingId");

-- CreateIndex
CREATE UNIQUE INDEX "PrismaTokenType_tokenAddress_type_key" ON "PrismaTokenType"("tokenAddress", "type");

-- AddForeignKey
ALTER TABLE "PrismaPoolLinearData" ADD CONSTRAINT "PrismaPoolLinearData_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolElementData" ADD CONSTRAINT "PrismaPoolElementData_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolDynamicData" ADD CONSTRAINT "PrismaPoolDynamicData_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStableDynamicData" ADD CONSTRAINT "PrismaPoolStableDynamicData_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolLinearDynamicData" ADD CONSTRAINT "PrismaPoolLinearDynamicData_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolToken" ADD CONSTRAINT "PrismaPoolToken_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolToken" ADD CONSTRAINT "PrismaPoolToken_address_fkey" FOREIGN KEY ("address") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolToken" ADD CONSTRAINT "PrismaPoolToken_nestedPoolId_fkey" FOREIGN KEY ("nestedPoolId") REFERENCES "PrismaPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolTokenDynamicData" ADD CONSTRAINT "PrismaPoolTokenDynamicData_poolTokenId_fkey" FOREIGN KEY ("poolTokenId") REFERENCES "PrismaPoolToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolSwap" ADD CONSTRAINT "PrismaPoolSwap_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolSwap" ADD CONSTRAINT "PrismaPoolSwap_batchSwapId_fkey" FOREIGN KEY ("batchSwapId") REFERENCES "PrismaPoolBatchSwap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolAprItem" ADD CONSTRAINT "PrismaPoolAprItem_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolAprRange" ADD CONSTRAINT "PrismaPoolAprRange_aprItemId_fkey" FOREIGN KEY ("aprItemId") REFERENCES "PrismaPoolAprItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolCategory" ADD CONSTRAINT "PrismaPoolCategory_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolExpandedTokens" ADD CONSTRAINT "PrismaPoolExpandedTokens_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolExpandedTokens" ADD CONSTRAINT "PrismaPoolExpandedTokens_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolExpandedTokens" ADD CONSTRAINT "PrismaPoolExpandedTokens_nestedPoolId_fkey" FOREIGN KEY ("nestedPoolId") REFERENCES "PrismaPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolFilterMap" ADD CONSTRAINT "PrismaPoolFilterMap_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "PrismaPoolFilter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolFilterMap" ADD CONSTRAINT "PrismaPoolFilterMap_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStaking" ADD CONSTRAINT "PrismaPoolStaking_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStakingMasterChefFarm" ADD CONSTRAINT "PrismaPoolStakingMasterChefFarm_stakingId_fkey" FOREIGN KEY ("stakingId") REFERENCES "PrismaPoolStaking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStakingMasterChefFarmRewarder" ADD CONSTRAINT "PrismaPoolStakingMasterChefFarmRewarder_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "PrismaPoolStakingMasterChefFarm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStakingGauge" ADD CONSTRAINT "PrismaPoolStakingGauge_stakingId_fkey" FOREIGN KEY ("stakingId") REFERENCES "PrismaPoolStaking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStakingGaugeReward" ADD CONSTRAINT "PrismaPoolStakingGaugeReward_gaugeId_fkey" FOREIGN KEY ("gaugeId") REFERENCES "PrismaPoolStakingGauge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStakingReliquaryFarm" ADD CONSTRAINT "PrismaPoolStakingReliquaryFarm_stakingId_fkey" FOREIGN KEY ("stakingId") REFERENCES "PrismaPoolStaking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolStakingReliquaryFarmLevel" ADD CONSTRAINT "PrismaPoolStakingReliquaryFarmLevel_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "PrismaPoolStakingReliquaryFarm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaPoolSnapshot" ADD CONSTRAINT "PrismaPoolSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaTokenCurrentPrice" ADD CONSTRAINT "PrismaTokenCurrentPrice_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaTokenPrice" ADD CONSTRAINT "PrismaTokenPrice_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaTokenDynamicData" ADD CONSTRAINT "PrismaTokenDynamicData_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaTokenType" ADD CONSTRAINT "PrismaTokenType_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserWalletBalance" ADD CONSTRAINT "PrismaUserWalletBalance_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "PrismaUser"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserWalletBalance" ADD CONSTRAINT "PrismaUserWalletBalance_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserWalletBalance" ADD CONSTRAINT "PrismaUserWalletBalance_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserStakedBalance" ADD CONSTRAINT "PrismaUserStakedBalance_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "PrismaUser"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserStakedBalance" ADD CONSTRAINT "PrismaUserStakedBalance_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserStakedBalance" ADD CONSTRAINT "PrismaUserStakedBalance_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserStakedBalance" ADD CONSTRAINT "PrismaUserStakedBalance_stakingId_fkey" FOREIGN KEY ("stakingId") REFERENCES "PrismaPoolStaking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserPoolBalanceSnapshot" ADD CONSTRAINT "PrismaUserPoolBalanceSnapshot_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "PrismaUser"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrismaUserPoolBalanceSnapshot" ADD CONSTRAINT "PrismaUserPoolBalanceSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PrismaPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
