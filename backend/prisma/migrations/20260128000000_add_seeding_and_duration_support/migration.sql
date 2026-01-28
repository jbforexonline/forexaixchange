-- ============================================================================
-- Migration: Add System Liquidity Seeding and Sub-Round Duration Support (v2.1)
-- Date: 2026-01-28
-- Description: Implements Technical Specification v2.1 features:
--   1. System Liquidity Seeding to prevent 0-0 pairs from triggering Indecision
--   2. Sub-round duration tracking for 5/10/20 minute settlements
-- ============================================================================

-- Add seeding columns to Bet table
ALTER TABLE "Bet" ADD COLUMN IF NOT EXISTS "isSystemSeed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Bet" ADD COLUMN IF NOT EXISTS "seedType" TEXT;

-- Add seeding columns to Round table
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "seedEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "seedSnapshotJson" JSONB;
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "userPoolSnapshotJson" JSONB;

-- Create HouseSeedWallet table for tracking seed funds
CREATE TABLE IF NOT EXISTS "HouseSeedWallet" (
    "id" TEXT NOT NULL DEFAULT 'SEED_HOUSE',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalSeeded" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalReturned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netSeedCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseSeedWallet_pkey" PRIMARY KEY ("id")
);

-- Create SeedLedger table for audit trail
CREATE TABLE IF NOT EXISTS "SeedLedger" (
    "id" TEXT NOT NULL,
    "roundId" TEXT,
    "market" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "selection" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedLedger_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Bet_roundId_isSystemSeed_idx" ON "Bet"("roundId", "isSystemSeed");
CREATE INDEX IF NOT EXISTS "SeedLedger_roundId_idx" ON "SeedLedger"("roundId");
CREATE INDEX IF NOT EXISTS "SeedLedger_type_idx" ON "SeedLedger"("type");
CREATE INDEX IF NOT EXISTS "SeedLedger_createdAt_idx" ON "SeedLedger"("createdAt");

-- Create a SYSTEM_SEED user if it doesn't exist (for seed bet ownership)
-- This is a placeholder user that owns all system seed bets
INSERT INTO "User" (
    "id", 
    "username", 
    "role", 
    "isActive",
    "isBanned",
    "isVerified",
    "verificationBadge",
    "premium",
    "kycStatus",
    "affiliateCode",
    "isAge18Confirmed",
    "createdAt", 
    "updatedAt"
)
SELECT 
    'SYSTEM_SEED', 
    'system_seed', 
    'USER', 
    false,
    false,
    false,
    false,
    false,
    'PENDING',
    'SYSTEM_SEED_AFF_' || substr(md5(random()::text), 1, 8),
    false,
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = 'SYSTEM_SEED');

-- Create a wallet for the system seed user
INSERT INTO "Wallet" ("id", "userId", "available", "held", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SYSTEM_SEED', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Wallet" WHERE "userId" = 'SYSTEM_SEED');
