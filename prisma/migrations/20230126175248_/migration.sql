/*
  Warnings:

  - The values [MASTER_CHEF,RELIQUARY,FRESH_BEETS] on the enum `PrismaPoolStakingType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PrismaPoolStakingType_new" AS ENUM ('GAUGE');
ALTER TABLE "PrismaPoolStaking" ALTER COLUMN "type" TYPE "PrismaPoolStakingType_new" USING ("type"::text::"PrismaPoolStakingType_new");
ALTER TYPE "PrismaPoolStakingType" RENAME TO "PrismaPoolStakingType_old";
ALTER TYPE "PrismaPoolStakingType_new" RENAME TO "PrismaPoolStakingType";
DROP TYPE "PrismaPoolStakingType_old";
COMMIT;
