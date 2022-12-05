/*
  Warnings:

  - You are about to drop the `PrismaFbeets` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "PrismaToken" ADD COLUMN     "dexscreenPairAddress" TEXT,
ADD COLUMN     "useDexscreener" BOOLEAN DEFAULT true;

-- DropTable
DROP TABLE "PrismaFbeets";
