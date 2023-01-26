-- AlterTable
ALTER TABLE "PrismaPoolStakingGauge" ADD COLUMN     "depositFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isKilled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symbol" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "totalSupply" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "withdrawFee" INTEGER NOT NULL DEFAULT 0;