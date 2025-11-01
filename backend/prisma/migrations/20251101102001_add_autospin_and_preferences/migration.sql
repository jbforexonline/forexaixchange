-- CreateEnum
CREATE TYPE "AutoSpinStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AutoSpinOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "market" "BetMarket" NOT NULL,
    "selection" TEXT NOT NULL,
    "amountUsd" DECIMAL(18,2) NOT NULL,
    "status" "AutoSpinStatus" NOT NULL DEFAULT 'PENDING',
    "roundsRemaining" INTEGER NOT NULL,
    "roundsExecuted" INTEGER NOT NULL DEFAULT 0,
    "targetRoundNumber" INTEGER,
    "executedForRounds" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoSpinOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredRoundDuration" INTEGER,
    "autoSpinEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxAutoSpinOrders" INTEGER NOT NULL DEFAULT 50,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoSpinOrder_userId_status_idx" ON "AutoSpinOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "AutoSpinOrder_status_createdAt_idx" ON "AutoSpinOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AutoSpinOrder_isActive_createdAt_idx" ON "AutoSpinOrder"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- AddForeignKey
ALTER TABLE "AutoSpinOrder" ADD CONSTRAINT "AutoSpinOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
