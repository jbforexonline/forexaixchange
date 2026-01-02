/*
  Warnings:

  - You are about to drop the column `googleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,referredUserId]` on the table `AffiliateEarning` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `InternalTransfer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_googleId_key";

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InternalTransfer" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "PremiumSubscription" ADD COLUMN     "isSimulated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Spin" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "googleId",
DROP COLUMN "provider";

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "demoAvailable" DECIMAL(18,2) NOT NULL DEFAULT 10000,
ADD COLUMN     "demoHeld" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "demoTotalLost" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "demoTotalWon" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AffiliateEarning_userId_idx" ON "AffiliateEarning"("userId");

-- CreateIndex
CREATE INDEX "AffiliateEarning_referredUserId_idx" ON "AffiliateEarning"("referredUserId");

-- CreateIndex
CREATE INDEX "AffiliateEarning_date_idx" ON "AffiliateEarning"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateEarning_userId_referredUserId_key" ON "AffiliateEarning"("userId", "referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalTransfer_idempotencyKey_key" ON "InternalTransfer"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");
