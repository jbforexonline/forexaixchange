/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `InternalTransfer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "InternalTransfer" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InternalTransfer_idempotencyKey_key" ON "InternalTransfer"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");
