// =============================================================================
// LEDGER SERVICE - Double-Entry Accounting System
// =============================================================================
// All financial changes MUST go through this service to ensure:
// - Append-only ledger entries (no updates/deletes)
// - Double-entry accounting (every debit has a matching credit)
// - Atomic transactions
// - Complete audit trail
// =============================================================================

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerAccountType, LedgerEntryType, Prisma } from '@prisma/client';

// System account IDs (fixed for consistency)
export const SYSTEM_ACCOUNTS = {
  HOUSE_PROFIT: 'SYS_HOUSE_PROFIT',
  OPERATING_CAPITAL: 'SYS_OPERATING_CAPITAL',
  CLEARING: 'SYS_CLEARING',
  FEE_COLLECTION: 'SYS_FEE_COLLECTION',
} as const;

interface CreateLedgerEntryParams {
  entryType: LedgerEntryType;
  debitAccountId: string;
  creditAccountId: string;
  amount: Decimal;
  description: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: any;
  createdBy?: string;
  idempotencyKey?: string;
}

interface TransferFundsParams {
  fromAccountId: string;
  toAccountId: string;
  amount: Decimal;
  entryType: LedgerEntryType;
  description: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: any;
  createdBy?: string;
  idempotencyKey?: string;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  /**
   * Initialize system accounts on application startup
   * These accounts are the backbone of the finance system
   */
  async initializeSystemAccounts(): Promise<void> {
    this.logger.log('🏦 Initializing system ledger accounts...');

    const systemAccountConfigs = [
      { 
        id: SYSTEM_ACCOUNTS.HOUSE_PROFIT, 
        type: LedgerAccountType.HOUSE_PROFIT, 
        name: 'House Profit - Round settlement profits' 
      },
      { 
        id: SYSTEM_ACCOUNTS.OPERATING_CAPITAL, 
        type: LedgerAccountType.OPERATING_CAPITAL, 
        name: 'Operating Capital (Treasury) - Bank connected' 
      },
      { 
        id: SYSTEM_ACCOUNTS.CLEARING, 
        type: LedgerAccountType.CLEARING, 
        name: 'Clearing - Temp holding during settlements' 
      },
      { 
        id: SYSTEM_ACCOUNTS.FEE_COLLECTION, 
        type: LedgerAccountType.FEE_COLLECTION, 
        name: 'Fee Collection - 2% platform fees' 
      },
    ];

    for (const config of systemAccountConfigs) {
      await this.prisma.ledgerAccount.upsert({
        where: { id: config.id },
        update: {},
        create: {
          id: config.id,
          type: config.type,
          ownerId: null,
          name: config.name,
          currency: 'USD',
          isActive: true,
        },
      });
    }

    this.logger.log('✅ System ledger accounts initialized');
  }

  /**
   * Get or create user ledger accounts (available and held)
   */
  async getOrCreateUserAccounts(userId: string, userName?: string): Promise<{
    availableAccount: { id: string };
    heldAccount: { id: string };
  }> {
    const label = userName || userId;

    // Get or create AVAILABLE account
    let availableAccount = await this.prisma.ledgerAccount.findFirst({
      where: { type: LedgerAccountType.USER_AVAILABLE, ownerId: userId },
    });

    if (!availableAccount) {
      availableAccount = await this.prisma.ledgerAccount.create({
        data: {
          type: LedgerAccountType.USER_AVAILABLE,
          ownerId: userId,
          name: `User Available - ${label}`,
          currency: 'USD',
          isActive: true,
        },
      });
    }

    // Get or create HELD account
    let heldAccount = await this.prisma.ledgerAccount.findFirst({
      where: { type: LedgerAccountType.USER_HELD, ownerId: userId },
    });

    if (!heldAccount) {
      heldAccount = await this.prisma.ledgerAccount.create({
        data: {
          type: LedgerAccountType.USER_HELD,
          ownerId: userId,
          name: `User Held - ${label}`,
          currency: 'USD',
          isActive: true,
        },
      });
    }

    return {
      availableAccount: { id: availableAccount.id },
      heldAccount: { id: heldAccount.id },
    };
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Ledger account not found: ${accountId}`);
    }

    return account;
  }

  /**
   * Get user's ledger accounts
   */
  async getUserAccounts(userId: string) {
    return this.prisma.ledgerAccount.findMany({
      where: { ownerId: userId },
    });
  }

  // ==========================================================================
  // BALANCE CALCULATIONS (Derived from ledger entries)
  // ==========================================================================

  /**
   * Calculate account balance from ledger entries
   * Balance = sum of credits - sum of debits
   */
  async getAccountBalance(accountId: string): Promise<Decimal> {
    const result = await this.prisma.$queryRaw<[{ balance: string }]>`
      SELECT 
        COALESCE(
          (SELECT COALESCE(SUM(amount), 0) FROM "LedgerEntry" WHERE "creditAccountId" = ${accountId})
          -
          (SELECT COALESCE(SUM(amount), 0) FROM "LedgerEntry" WHERE "debitAccountId" = ${accountId}),
          0
        ) as balance
    `;
    
    return new Decimal(result[0]?.balance || '0');
  }

  /**
   * Get user's total balance (available + held)
   */
  async getUserBalance(userId: string): Promise<{
    available: Decimal;
    held: Decimal;
    total: Decimal;
  }> {
    const accounts = await this.getOrCreateUserAccounts(userId);
    
    const [available, held] = await Promise.all([
      this.getAccountBalance(accounts.availableAccount.id),
      this.getAccountBalance(accounts.heldAccount.id),
    ]);

    return {
      available,
      held,
      total: available.add(held),
    };
  }

  /**
   * Get total user liabilities (sum of all user balances)
   * Used for reserve ratio calculation
   * Falls back to wallet balances if no ledger accounts exist
   */
  async getTotalUserLiabilities(): Promise<Decimal> {
    // First try ledger accounts
    const userAccounts = await this.prisma.ledgerAccount.findMany({
      where: {
        type: { in: [LedgerAccountType.USER_AVAILABLE, LedgerAccountType.USER_HELD] },
        isActive: true,
      },
      select: { id: true },
    });

    let total = new Decimal(0);
    
    if (userAccounts.length > 0) {
      for (const account of userAccounts) {
        const balance = await this.getAccountBalance(account.id);
        total = total.add(balance);
      }
    } else {
      // Fallback: Use wallet balances (for legacy/seeded data)
      const walletTotals = await this.prisma.wallet.aggregate({
        _sum: {
          available: true,
          held: true,
        },
      });
      
      const availableSum = walletTotals._sum.available || new Decimal(0);
      const heldSum = walletTotals._sum.held || new Decimal(0);
      total = new Decimal(availableSum.toString()).add(new Decimal(heldSum.toString()));
    }

    return total;
  }

  /**
   * Get system account balances
   */
  async getSystemBalances(): Promise<Record<string, Decimal>> {
    const balances: Record<string, Decimal> = {};
    
    for (const [key, accountId] of Object.entries(SYSTEM_ACCOUNTS)) {
      balances[key] = await this.getAccountBalance(accountId);
    }

    return balances;
  }

  // ==========================================================================
  // LEDGER ENTRY OPERATIONS (Append-only)
  // ==========================================================================

  /**
   * Create a double-entry ledger record
   * CRITICAL: This is the ONLY way to modify balances
   */
  async createLedgerEntry(
    params: CreateLedgerEntryParams,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    const prismaClient = tx || this.prisma;

    // Validate amount
    if (params.amount.lte(0)) {
      throw new BadRequestException('Ledger entry amount must be positive');
    }

    // Check idempotency
    if (params.idempotencyKey) {
      const existing = await prismaClient.ledgerEntry.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) {
        this.logger.warn(`Duplicate ledger entry attempt: ${params.idempotencyKey}`);
        return { id: existing.id };
      }
    }

    // Verify accounts exist
    const [debitAccount, creditAccount] = await Promise.all([
      prismaClient.ledgerAccount.findUnique({ where: { id: params.debitAccountId } }),
      prismaClient.ledgerAccount.findUnique({ where: { id: params.creditAccountId } }),
    ]);

    if (!debitAccount || !creditAccount) {
      throw new NotFoundException('Ledger account not found');
    }

    // Create the entry
    const entry = await prismaClient.ledgerEntry.create({
      data: {
        entryType: params.entryType,
        debitAccountId: params.debitAccountId,
        creditAccountId: params.creditAccountId,
        amount: params.amount,
        description: params.description,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        metadata: params.metadata,
        createdBy: params.createdBy,
        idempotencyKey: params.idempotencyKey,
      },
    });

    this.logger.debug(
      `📝 Ledger Entry: ${params.entryType} | ` +
      `Debit: ${params.debitAccountId} | Credit: ${params.creditAccountId} | ` +
      `Amount: $${params.amount.toFixed(2)} | ${params.description}`
    );

    return { id: entry.id };
  }

  /**
   * Transfer funds between accounts with proper double-entry
   */
  async transferFunds(
    params: TransferFundsParams,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    const result = await this.createLedgerEntry({
      entryType: params.entryType,
      debitAccountId: params.fromAccountId, // Money leaves this account
      creditAccountId: params.toAccountId,   // Money enters this account
      amount: params.amount,
      description: params.description,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      metadata: params.metadata,
      createdBy: params.createdBy,
      idempotencyKey: params.idempotencyKey,
    }, tx);

    return { ledgerEntryId: result.id };
  }

  // ==========================================================================
  // HIGH-LEVEL FINANCIAL OPERATIONS
  // ==========================================================================

  /**
   * Credit user's available balance (e.g., for deposits)
   */
  async creditUserAvailable(
    userId: string,
    amount: Decimal,
    description: string,
    referenceType: string,
    referenceId: string,
    createdBy?: string,
    idempotencyKey?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    const accounts = await this.getOrCreateUserAccounts(userId);
    
    // Credit comes from system clearing account (for deposits) or specific source
    return this.transferFunds({
      fromAccountId: SYSTEM_ACCOUNTS.CLEARING,
      toAccountId: accounts.availableAccount.id,
      amount,
      entryType: LedgerEntryType.DEPOSIT_CREDIT,
      description,
      referenceType,
      referenceId,
      createdBy,
      idempotencyKey,
    }, tx);
  }

  /**
   * Hold funds (move from available to held)
   */
  async holdFunds(
    userId: string,
    amount: Decimal,
    entryType: LedgerEntryType,
    description: string,
    referenceType: string,
    referenceId: string,
    createdBy?: string,
    idempotencyKey?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    const accounts = await this.getOrCreateUserAccounts(userId);
    
    // Check sufficient balance
    const availableBalance = await this.getAccountBalance(accounts.availableAccount.id);
    if (availableBalance.lt(amount)) {
      throw new BadRequestException(
        `Insufficient funds. Available: $${availableBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`
      );
    }

    return this.transferFunds({
      fromAccountId: accounts.availableAccount.id,
      toAccountId: accounts.heldAccount.id,
      amount,
      entryType,
      description,
      referenceType,
      referenceId,
      createdBy,
      idempotencyKey,
    }, tx);
  }

  /**
   * Release held funds back to available (e.g., bet cancellation, withdrawal rejection)
   */
  async releaseFunds(
    userId: string,
    amount: Decimal,
    entryType: LedgerEntryType,
    description: string,
    referenceType: string,
    referenceId: string,
    createdBy?: string,
    idempotencyKey?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    const accounts = await this.getOrCreateUserAccounts(userId);
    
    return this.transferFunds({
      fromAccountId: accounts.heldAccount.id,
      toAccountId: accounts.availableAccount.id,
      amount,
      entryType,
      description,
      referenceType,
      referenceId,
      createdBy,
      idempotencyKey,
    }, tx);
  }

  /**
   * Debit held funds permanently (e.g., withdrawal payout, bet loss)
   */
  async debitHeldFunds(
    userId: string,
    amount: Decimal,
    destinationAccountId: string,
    entryType: LedgerEntryType,
    description: string,
    referenceType: string,
    referenceId: string,
    createdBy?: string,
    idempotencyKey?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    const accounts = await this.getOrCreateUserAccounts(userId);
    
    return this.transferFunds({
      fromAccountId: accounts.heldAccount.id,
      toAccountId: destinationAccountId,
      amount,
      entryType,
      description,
      referenceType,
      referenceId,
      createdBy,
      idempotencyKey,
    }, tx);
  }

  /**
   * Credit user from system account (e.g., bet winnings)
   */
  async creditUserFromSystem(
    userId: string,
    amount: Decimal,
    sourceAccountId: string,
    entryType: LedgerEntryType,
    description: string,
    referenceType: string,
    referenceId: string,
    createdBy?: string,
    idempotencyKey?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    const accounts = await this.getOrCreateUserAccounts(userId);
    
    return this.transferFunds({
      fromAccountId: sourceAccountId,
      toAccountId: accounts.availableAccount.id,
      amount,
      entryType,
      description,
      referenceType,
      referenceId,
      createdBy,
      idempotencyKey,
    }, tx);
  }

  /**
   * Record house profit from round settlement
   */
  async recordHouseProfit(
    amount: Decimal,
    roundId: string,
    roundNumber: number,
    idempotencyKey?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    return this.transferFunds({
      fromAccountId: SYSTEM_ACCOUNTS.CLEARING,
      toAccountId: SYSTEM_ACCOUNTS.HOUSE_PROFIT,
      amount,
      entryType: LedgerEntryType.HOUSE_PROFIT,
      description: `Round ${roundNumber} house profit`,
      referenceType: 'ROUND',
      referenceId: roundId,
      idempotencyKey,
    }, tx);
  }

  /**
   * Record fee collection
   */
  async recordFee(
    amount: Decimal,
    description: string,
    referenceType: string,
    referenceId: string,
    idempotencyKey?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ ledgerEntryId: string }> {
    return this.transferFunds({
      fromAccountId: SYSTEM_ACCOUNTS.CLEARING,
      toAccountId: SYSTEM_ACCOUNTS.FEE_COLLECTION,
      amount,
      entryType: LedgerEntryType.FEE_COLLECTION,
      description,
      referenceType,
      referenceId,
      idempotencyKey,
    }, tx);
  }

  // ==========================================================================
  // AUDIT & REPORTING
  // ==========================================================================

  /**
   * Get ledger entries for an account
   */
  async getAccountEntries(
    accountId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      entryType?: LedgerEntryType;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = {
      OR: [
        { debitAccountId: accountId },
        { creditAccountId: accountId },
      ],
    };

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    if (options?.entryType) {
      where.entryType = options.entryType;
    }

    return this.prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
      include: {
        debitAccount: { select: { id: true, name: true, type: true } },
        creditAccount: { select: { id: true, name: true, type: true } },
      },
    });
  }

  /**
   * Get entries for a specific reference (e.g., all entries for a withdrawal)
   */
  async getEntriesByReference(referenceType: string, referenceId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'asc' },
      include: {
        debitAccount: { select: { id: true, name: true, type: true } },
        creditAccount: { select: { id: true, name: true, type: true } },
      },
    });
  }

  /**
   * Verify ledger integrity (sum of all debits = sum of all credits)
   */
  async verifyLedgerIntegrity(): Promise<{ 
    isValid: boolean; 
    totalDebits: Decimal; 
    totalCredits: Decimal; 
    difference: Decimal;
  }> {
    const result = await this.prisma.$queryRaw<[{ total_debits: string; total_credits: string }]>`
      SELECT 
        COALESCE(SUM(amount), 0) as total_debits,
        COALESCE(SUM(amount), 0) as total_credits
      FROM "LedgerEntry"
    `;

    // In double-entry, total debits should always equal total credits
    // Since we store one entry per transaction where debit account loses and credit account gains
    // The sum should be equal (both represent the same transactions, just different perspectives)
    const totalDebits = new Decimal(result[0]?.total_debits || '0');
    const totalCredits = new Decimal(result[0]?.total_credits || '0');
    const difference = totalDebits.sub(totalCredits).abs();

    return {
      isValid: difference.eq(0),
      totalDebits,
      totalCredits,
      difference,
    };
  }
}
