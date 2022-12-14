/*
  Warnings:

  - You are about to drop the `PrismaPoolStakingMasterChefFarm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PrismaPoolStakingMasterChefFarmRewarder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PrismaPoolStakingReliquaryFarm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PrismaPoolStakingReliquaryFarmLevel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PrismaPoolStakingMasterChefFarm" DROP CONSTRAINT "PrismaPoolStakingMasterChefFarm_stakingId_fkey";

-- DropForeignKey
ALTER TABLE "PrismaPoolStakingMasterChefFarmRewarder" DROP CONSTRAINT "PrismaPoolStakingMasterChefFarmRewarder_farmId_fkey";

-- DropForeignKey
ALTER TABLE "PrismaPoolStakingReliquaryFarm" DROP CONSTRAINT "PrismaPoolStakingReliquaryFarm_stakingId_fkey";

-- DropForeignKey
ALTER TABLE "PrismaPoolStakingReliquaryFarmLevel" DROP CONSTRAINT "PrismaPoolStakingReliquaryFarmLevel_farmId_fkey";

-- AlterTable
ALTER TABLE "PrismaTokenCurrentPrice" ADD COLUMN     "dexscreener" BOOLEAN;

-- AlterTable
ALTER TABLE "PrismaTokenDynamicData" ADD COLUMN     "dexscreenerPair" TEXT;

-- AlterTable
ALTER TABLE "PrismaTokenPrice" ADD COLUMN     "dexscreener" BOOLEAN;

-- DropTable
DROP TABLE "PrismaPoolStakingMasterChefFarm";

-- DropTable
DROP TABLE "PrismaPoolStakingMasterChefFarmRewarder";

-- DropTable
DROP TABLE "PrismaPoolStakingReliquaryFarm";

-- DropTable
DROP TABLE "PrismaPoolStakingReliquaryFarmLevel";
