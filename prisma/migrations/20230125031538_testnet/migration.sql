-- CreateTable
CREATE TABLE "PrismaDexScreenerTokenDynamicData" (
    "tokenAddress" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceChange24h" DOUBLE PRECISION NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PrismaDexScreenerTokenDynamicData_pkey" PRIMARY KEY ("tokenAddress")
);

-- AddForeignKey
ALTER TABLE "PrismaDexScreenerTokenDynamicData" ADD CONSTRAINT "PrismaDexScreenerTokenDynamicData_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "PrismaToken"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
