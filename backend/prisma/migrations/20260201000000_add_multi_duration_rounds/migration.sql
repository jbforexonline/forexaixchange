-- =============================================================================
-- Multi-Duration Rounds Migration
-- =============================================================================
-- Adds support for premium multi-duration rounds (5, 10, 20 minutes)
-- with separate pools per duration and shared UI aggregation
-- =============================================================================

-- Create DurationMinutes enum
CREATE TYPE "DurationMinutes" AS ENUM ('FIVE', 'TEN', 'TWENTY');

-- Create MarketInstanceStatus enum
CREATE TYPE "MarketInstanceStatus" AS ENUM ('ACTIVE', 'FROZEN', 'SETTLING', 'SETTLED');

-- Create MarketInstance table (separate pools per duration per checkpoint window)
CREATE TABLE "MarketInstance" (
    "id" TEXT NOT NULL,
    "masterRoundId" TEXT NOT NULL,
    "durationMinutes" "DurationMinutes" NOT NULL DEFAULT 'TWENTY',
    "windowStartMinutes" INTEGER NOT NULL,
    "windowEndMinutes" INTEGER NOT NULL,
    "status" "MarketInstanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freezeAt" TIMESTAMP(3) NOT NULL,
    "settleAt" TIMESTAMP(3) NOT NULL,
    "frozenAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "outerBuy" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outerSell" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "middleBlue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "middleRed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "innerHighVol" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "innerLowVol" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "globalIndecision" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalVolume" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "indecisionTriggered" BOOLEAN NOT NULL DEFAULT false,
    "outerWinner" TEXT,
    "middleWinner" TEXT,
    "innerWinner" TEXT,
    "outerTied" BOOLEAN NOT NULL DEFAULT false,
    "middleTied" BOOLEAN NOT NULL DEFAULT false,
    "innerTied" BOOLEAN NOT NULL DEFAULT false,
    "totalHouseFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "seedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seedSnapshotJson" JSONB,
    "frozenPoolsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketInstance_pkey" PRIMARY KEY ("id")
);

-- Create MarketSnapshot table (pool snapshots at freeze time)
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "marketInstanceId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL DEFAULT 'FREEZE',
    "outerBuy" DECIMAL(18,2) NOT NULL,
    "outerSell" DECIMAL(18,2) NOT NULL,
    "middleBlue" DECIMAL(18,2) NOT NULL,
    "middleRed" DECIMAL(18,2) NOT NULL,
    "innerHighVol" DECIMAL(18,2) NOT NULL,
    "innerLowVol" DECIMAL(18,2) NOT NULL,
    "globalIndecision" DECIMAL(18,2) NOT NULL,
    "totalVolume" DECIMAL(18,2) NOT NULL,
    "totalBetsCount" INTEGER NOT NULL,
    "uniqueUsersCount" INTEGER NOT NULL,
    "snapshotData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- Create MarketInstanceSettlement table (idempotency for settlement)
CREATE TABLE "MarketInstanceSettlement" (
    "id" TEXT NOT NULL,
    "marketInstanceId" TEXT NOT NULL,
    "settlementVersion" INTEGER NOT NULL DEFAULT 1,
    "totalPool" DECIMAL(18,2) NOT NULL,
    "totalPayouts" DECIMAL(18,2) NOT NULL,
    "houseFee" DECIMAL(18,2) NOT NULL,
    "houseProfit" DECIMAL(18,2) NOT NULL,
    "totalBets" INTEGER NOT NULL,
    "winningBets" INTEGER NOT NULL,
    "losingBets" INTEGER NOT NULL,
    "clearingLedgerEntryId" TEXT,
    "profitLedgerEntryId" TEXT,
    "settledBy" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketInstanceSettlement_pkey" PRIMARY KEY ("id")
);

-- Add columns to Bet table for multi-duration support
ALTER TABLE "Bet" ADD COLUMN "durationMinutes" "DurationMinutes" NOT NULL DEFAULT 'TWENTY';
ALTER TABLE "Bet" ADD COLUMN "marketInstanceId" TEXT;

-- Create indexes for MarketInstance
CREATE INDEX "MarketInstance_masterRoundId_idx" ON "MarketInstance"("masterRoundId");
CREATE INDEX "MarketInstance_status_freezeAt_idx" ON "MarketInstance"("status", "freezeAt");
CREATE INDEX "MarketInstance_status_settleAt_idx" ON "MarketInstance"("status", "settleAt");
CREATE INDEX "MarketInstance_durationMinutes_status_idx" ON "MarketInstance"("durationMinutes", "status");
CREATE UNIQUE INDEX "MarketInstance_masterRoundId_durationMinutes_windowStartMinutes_key" ON "MarketInstance"("masterRoundId", "durationMinutes", "windowStartMinutes");

-- Create indexes for MarketSnapshot
CREATE INDEX "MarketSnapshot_marketInstanceId_idx" ON "MarketSnapshot"("marketInstanceId");
CREATE INDEX "MarketSnapshot_snapshotType_idx" ON "MarketSnapshot"("snapshotType");

-- Create indexes for MarketInstanceSettlement
CREATE UNIQUE INDEX "MarketInstanceSettlement_marketInstanceId_key" ON "MarketInstanceSettlement"("marketInstanceId");
CREATE UNIQUE INDEX "MarketInstanceSettlement_clearingLedgerEntryId_key" ON "MarketInstanceSettlement"("clearingLedgerEntryId");
CREATE UNIQUE INDEX "MarketInstanceSettlement_profitLedgerEntryId_key" ON "MarketInstanceSettlement"("profitLedgerEntryId");
CREATE INDEX "MarketInstanceSettlement_settledAt_idx" ON "MarketInstanceSettlement"("settledAt");

-- Create indexes for Bet multi-duration fields
CREATE INDEX "Bet_marketInstanceId_idx" ON "Bet"("marketInstanceId");
CREATE INDEX "Bet_durationMinutes_status_idx" ON "Bet"("durationMinutes", "status");

-- Add foreign key constraints
ALTER TABLE "MarketInstance" ADD CONSTRAINT "MarketInstance_masterRoundId_fkey" FOREIGN KEY ("masterRoundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketSnapshot" ADD CONSTRAINT "MarketSnapshot_marketInstanceId_fkey" FOREIGN KEY ("marketInstanceId") REFERENCES "MarketInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketInstanceSettlement" ADD CONSTRAINT "MarketInstanceSettlement_marketInstanceId_fkey" FOREIGN KEY ("marketInstanceId") REFERENCES "MarketInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bet" ADD CONSTRAINT "Bet_marketInstanceId_fkey" FOREIGN KEY ("marketInstanceId") REFERENCES "MarketInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
