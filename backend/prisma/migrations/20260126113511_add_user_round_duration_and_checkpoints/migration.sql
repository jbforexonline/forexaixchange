-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "userRoundDuration" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "checkpoint10min" JSONB,
ADD COLUMN     "checkpoint15min" JSONB,
ADD COLUMN     "checkpoint5min" JSONB;

-- CreateIndex
CREATE INDEX "Bet_roundId_userRoundDuration_idx" ON "Bet"("roundId", "userRoundDuration");
