-- CreateTable
CREATE TABLE "PlatformAccount" (
    "id" TEXT NOT NULL DEFAULT 'HOUSE',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalFees" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPaidOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCollected" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalSubsidy" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reserveBalance" DECIMAL(18,2) NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformLedger" (
    "id" TEXT NOT NULL,
    "roundId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformLedger_roundId_idx" ON "PlatformLedger"("roundId");

-- CreateIndex
CREATE INDEX "PlatformLedger_type_idx" ON "PlatformLedger"("type");
