-- =============================================================================
-- Finance System v2 - Ledger-Based Accounting
-- =============================================================================
-- Adds LedgerAccount, LedgerEntry, Deposit, Withdrawal, and related tables
-- =============================================================================

-- Create enums
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'APPROVED', 'CREDITED', 'REJECTED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'REFUNDED');
CREATE TYPE "LedgerAccountType" AS ENUM ('USER_AVAILABLE', 'USER_HELD', 'HOUSE_PROFIT', 'RESERVE_FUND', 'OPERATING_CAPITAL', 'CLEARING', 'FEE_COLLECTION');
CREATE TYPE "LedgerEntryType" AS ENUM ('DEPOSIT_CREDIT', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_RELEASE', 'WITHDRAWAL_DEBIT', 'BET_HOLD', 'BET_RELEASE', 'BET_LOSS', 'BET_WIN', 'ROUND_SETTLEMENT', 'FEE_COLLECTION', 'HOUSE_PROFIT', 'RESERVE_TRANSFER', 'ADMIN_ADJUSTMENT', 'REFUND');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "AdminActionType" AS ENUM ('DEPOSIT_APPROVE', 'DEPOSIT_REJECT', 'WITHDRAWAL_APPROVE', 'WITHDRAWAL_REJECT', 'WITHDRAWAL_PAID', 'CONFIG_UPDATE', 'USER_UPDATE', 'ROUND_FORCE_SETTLE', 'RESERVE_UPDATE', 'ALERT_ACKNOWLEDGE');

-- LedgerAccount
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LedgerAccount_type_ownerId_key" ON "LedgerAccount"("type", "ownerId");
CREATE INDEX "LedgerAccount_ownerId_idx" ON "LedgerAccount"("ownerId");
CREATE INDEX "LedgerAccount_type_idx" ON "LedgerAccount"("type");

-- LedgerEntry
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "debitAccountId" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdBy" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_debitAccountId_idx" ON "LedgerEntry"("debitAccountId");
CREATE INDEX "LedgerEntry_creditAccountId_idx" ON "LedgerEntry"("creditAccountId");
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");
CREATE INDEX "LedgerEntry_entryType_idx" ON "LedgerEntry"("entryType");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- Deposit
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "method" TEXT NOT NULL,
    "referenceId" TEXT,
    "paymentProof" TEXT,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "ledgerEntryId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Deposit_ledgerEntryId_key" ON "Deposit"("ledgerEntryId");
CREATE UNIQUE INDEX "Deposit_idempotencyKey_key" ON "Deposit"("idempotencyKey");
CREATE INDEX "Deposit_userId_idx" ON "Deposit"("userId");
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");
CREATE INDEX "Deposit_createdAt_idx" ON "Deposit"("createdAt");
CREATE INDEX "Deposit_method_idx" ON "Deposit"("method");

-- Withdrawal
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "payoutMethod" TEXT NOT NULL,
    "payoutDestination" TEXT NOT NULL,
    "payoutReference" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'DRAFT',
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpVerifiedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paidBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "holdLedgerEntryId" TEXT,
    "releaseLedgerEntryId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Withdrawal_holdLedgerEntryId_key" ON "Withdrawal"("holdLedgerEntryId");
CREATE UNIQUE INDEX "Withdrawal_releaseLedgerEntryId_key" ON "Withdrawal"("releaseLedgerEntryId");
CREATE UNIQUE INDEX "Withdrawal_idempotencyKey_key" ON "Withdrawal"("idempotencyKey");
CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");
CREATE INDEX "Withdrawal_payoutMethod_idx" ON "Withdrawal"("payoutMethod");

-- BankSnapshot
CREATE TABLE "BankSnapshot" (
    "id" TEXT NOT NULL,
    "bankBalance" DECIMAL(18,2) NOT NULL,
    "bankAccountRef" TEXT,
    "totalUserLiabilities" DECIMAL(18,2) NOT NULL,
    "reserveRatio" DECIMAL(10,4) NOT NULL,
    "minRatioThreshold" DECIMAL(10,4) NOT NULL,
    "warningRatioThreshold" DECIMAL(10,4) NOT NULL,
    "isWithdrawalsLocked" BOOLEAN NOT NULL DEFAULT false,
    "isLargeWithdrawalsPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankSnapshot_createdAt_idx" ON "BankSnapshot"("createdAt");

-- AdminAction
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "actionType" "AdminActionType" NOT NULL,
    "targetUserId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "amount" DECIMAL(18,2),
    "reasonCode" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAction_adminId_idx" ON "AdminAction"("adminId");
CREATE INDEX "AdminAction_targetUserId_idx" ON "AdminAction"("targetUserId");
CREATE INDEX "AdminAction_actionType_idx" ON "AdminAction"("actionType");
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");
CREATE INDEX "AdminAction_targetType_targetId_idx" ON "AdminAction"("targetType", "targetId");

-- RoundSettlement
CREATE TABLE "RoundSettlement" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
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

    CONSTRAINT "RoundSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoundSettlement_roundId_key" ON "RoundSettlement"("roundId");
CREATE UNIQUE INDEX "RoundSettlement_clearingLedgerEntryId_key" ON "RoundSettlement"("clearingLedgerEntryId");
CREATE UNIQUE INDEX "RoundSettlement_profitLedgerEntryId_key" ON "RoundSettlement"("profitLedgerEntryId");
CREATE INDEX "RoundSettlement_roundNumber_idx" ON "RoundSettlement"("roundNumber");
CREATE INDEX "RoundSettlement_settledAt_idx" ON "RoundSettlement"("settledAt");

-- PayoutTransaction
CREATE TABLE "PayoutTransaction" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "externalRef" TEXT,
    "payoutMethod" TEXT NOT NULL,
    "payoutDestination" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "providerResponse" JSONB,
    "initiatedBy" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PayoutTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PayoutTransaction_withdrawalId_idx" ON "PayoutTransaction"("withdrawalId");
CREATE INDEX "PayoutTransaction_status_idx" ON "PayoutTransaction"("status");
CREATE INDEX "PayoutTransaction_initiatedAt_idx" ON "PayoutTransaction"("initiatedAt");

-- AlertLog
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertLog_alertType_idx" ON "AlertLog"("alertType");
CREATE INDEX "AlertLog_severity_idx" ON "AlertLog"("severity");
CREATE INDEX "AlertLog_isAcknowledged_idx" ON "AlertLog"("isAcknowledged");
CREATE INDEX "AlertLog_createdAt_idx" ON "AlertLog"("createdAt");

-- FeeConfiguration
CREATE TABLE "FeeConfiguration" (
    "id" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "tiers" JSONB NOT NULL,
    "minFee" DECIMAL(18,2) NOT NULL,
    "maxFee" DECIMAL(18,2),
    "premiumDiscount" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeConfiguration_feeType_key" ON "FeeConfiguration"("feeType");
CREATE INDEX "FeeConfiguration_feeType_idx" ON "FeeConfiguration"("feeType");

-- WithdrawalLimit
CREATE TABLE "WithdrawalLimit" (
    "id" TEXT NOT NULL,
    "limitType" TEXT NOT NULL,
    "dailyLimit" DECIMAL(18,2) NOT NULL,
    "singleTransactionMax" DECIMAL(18,2) NOT NULL,
    "largeWithdrawalThreshold" DECIMAL(18,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WithdrawalLimit_limitType_key" ON "WithdrawalLimit"("limitType");

-- Foreign keys
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankSnapshot" ADD CONSTRAINT "BankSnapshot_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoundSettlement" ADD CONSTRAINT "RoundSettlement_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoundSettlement" ADD CONSTRAINT "RoundSettlement_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_initiator_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FeeConfiguration" ADD CONSTRAINT "FeeConfiguration_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WithdrawalLimit" ADD CONSTRAINT "WithdrawalLimit_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
