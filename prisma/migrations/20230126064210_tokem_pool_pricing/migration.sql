-- AlterTable
ALTER TABLE "PrismaToken" ADD COLUMN     "usePoolPricing" BOOLEAN,
ALTER COLUMN "useDexscreener" DROP DEFAULT;
