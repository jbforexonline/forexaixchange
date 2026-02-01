// =============================================================================
// RESERVE SERVICE - House Account & Reserve Ratio Management
// =============================================================================
// Manages system accounts, reserve ratio monitoring, and alerts
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LedgerService, SYSTEM_ACCOUNTS } from '../ledger/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AlertSeverity, AdminActionType } from '@prisma/client';

export interface ReserveStatus {
  bankBalance: Decimal;
  totalUserLiabilities: Decimal;
  reserveRatio: Decimal;
  minRatioThreshold: Decimal;
  warningRatioThreshold: Decimal;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  isWithdrawalsLocked: boolean;
  isLargeWithdrawalsPaused: boolean;
  alerts: any[];
}

export interface HouseAccountStatus {
  houseProfit: Decimal;
  operatingCapital: Decimal;
  clearing: Decimal;
  feeCollection: Decimal;
}

@Injectable()
export class ReserveService {
  private readonly logger = new Logger(ReserveService.name);

  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
  ) {}

  /**
   * Initialize house/system accounts
   */
  async initializeSystemAccounts() {
    return this.ledgerService.initializeSystemAccounts();
  }

  /**
   * Get current house account balances
   */
  async getHouseAccountStatus(): Promise<HouseAccountStatus> {
    const balances = await this.ledgerService.getSystemBalances();
    
    return {
      houseProfit: balances.HOUSE_PROFIT || new Decimal(0),
      operatingCapital: balances.OPERATING_CAPITAL || new Decimal(0),
      clearing: balances.CLEARING || new Decimal(0),
      feeCollection: balances.FEE_COLLECTION || new Decimal(0),
    };
  }

  /**
   * Get current reserve status and ratio
   */
  async getReserveStatus(): Promise<ReserveStatus> {
    // Get latest bank snapshot
    const latestSnapshot = await this.prisma.bankSnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // Get total user liabilities from ledger
    const totalUserLiabilities = await this.ledgerService.getTotalUserLiabilities();

    // Get thresholds from env
    const minRatioThreshold = new Decimal(process.env.RESERVE_RATIO_MIN || '1.1');
    const warningRatioThreshold = new Decimal(process.env.RESERVE_RATIO_WARNING || '1.2');

    // Calculate current values
    const bankBalance = latestSnapshot?.bankBalance || new Decimal(0);
    const reserveRatio = totalUserLiabilities.gt(0)
      ? bankBalance.div(totalUserLiabilities)
      : new Decimal(999); // If no liabilities, ratio is effectively infinite

    // Determine status
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    let isWithdrawalsLocked = false;
    let isLargeWithdrawalsPaused = false;

    if (reserveRatio.lt(minRatioThreshold)) {
      status = 'CRITICAL';
      isWithdrawalsLocked = true;
    } else if (reserveRatio.lt(warningRatioThreshold)) {
      status = 'WARNING';
      isLargeWithdrawalsPaused = true;
    }

    // Get active alerts
    const alerts = await this.prisma.alertLog.findMany({
      where: {
        isAcknowledged: false,
        alertType: { startsWith: 'RESERVE_' },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      bankBalance,
      totalUserLiabilities,
      reserveRatio,
      minRatioThreshold,
      warningRatioThreshold,
      status,
      isWithdrawalsLocked,
      isLargeWithdrawalsPaused,
      alerts,
    };
  }

  /**
   * Update bank balance and create snapshot (admin action)
   */
  async updateBankBalance(
    bankBalance: number,
    adminId: string,
    bankAccountRef?: string,
    notes?: string,
  ) {
    const amount = new Decimal(bankBalance);
    const totalUserLiabilities = await this.ledgerService.getTotalUserLiabilities();
    
    const reserveRatio = totalUserLiabilities.gt(0)
      ? amount.div(totalUserLiabilities)
      : new Decimal(999);

    const minRatio = new Decimal(process.env.RESERVE_RATIO_MIN || '1.1');
    const warningRatio = new Decimal(process.env.RESERVE_RATIO_WARNING || '1.2');

    const isWithdrawalsLocked = reserveRatio.lt(minRatio);
    const isLargeWithdrawalsPaused = reserveRatio.lt(warningRatio);

    // Create snapshot
    const snapshot = await this.prisma.bankSnapshot.create({
      data: {
        bankBalance: amount,
        bankAccountRef,
        totalUserLiabilities,
        reserveRatio,
        minRatioThreshold: minRatio,
        warningRatioThreshold: warningRatio,
        isWithdrawalsLocked,
        isLargeWithdrawalsPaused,
        createdBy: adminId,
        notes,
      },
    });

    // Log admin action
    await this.prisma.adminAction.create({
      data: {
        adminId,
        actionType: AdminActionType.RESERVE_UPDATE,
        targetType: 'BANK_SNAPSHOT',
        targetId: snapshot.id,
        amount,
        reason: notes || 'Bank balance updated',
        metadata: {
          previousSnapshot: (await this.getPreviousSnapshot())?.id,
          reserveRatio: reserveRatio.toNumber(),
        },
      },
    });

    // Create alerts if needed
    await this.checkAndCreateAlerts(reserveRatio, minRatio, warningRatio);

    this.logger.log(
      `🏦 Bank balance updated: $${amount.toFixed(2)} | Reserve Ratio: ${reserveRatio.toFixed(4)} | ` +
      `Status: ${isWithdrawalsLocked ? 'CRITICAL' : isLargeWithdrawalsPaused ? 'WARNING' : 'HEALTHY'}`
    );

    return snapshot;
  }

  /**
   * Get dashboard summary for admin
   */
  async getDashboardSummary() {
    const [
      reserveStatus,
      houseAccounts,
      pendingDeposits,
      pendingWithdrawals,
      recentAlerts,
      todayStats,
    ] = await Promise.all([
      this.getReserveStatus(),
      this.getHouseAccountStatus(),
      this.prisma.deposit.count({ where: { status: 'PENDING' } }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.alertLog.findMany({
        where: { isAcknowledged: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.getTodayStats(),
    ]);

    return {
      reserveStatus,
      houseAccounts,
      pendingActions: {
        deposits: pendingDeposits,
        withdrawals: pendingWithdrawals,
      },
      alerts: recentAlerts,
      todayStats,
    };
  }

  /**
   * Get today's financial statistics
   */
  private async getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [deposits, withdrawals, settlements] = await Promise.all([
      this.prisma.deposit.aggregate({
        where: {
          status: 'CREDITED',
          creditedAt: { gte: today, lt: tomorrow },
        },
        _sum: { netAmount: true },
        _count: true,
      }),
      this.prisma.withdrawal.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: today, lt: tomorrow },
        },
        _sum: { netAmount: true },
        _count: true,
      }),
      this.prisma.roundSettlement.aggregate({
        where: {
          settledAt: { gte: today, lt: tomorrow },
        },
        _sum: { houseProfit: true },
        _count: true,
      }),
    ]);

    return {
      depositsTotal: deposits._sum.netAmount || new Decimal(0),
      depositsCount: deposits._count,
      withdrawalsTotal: withdrawals._sum.netAmount || new Decimal(0),
      withdrawalsCount: withdrawals._count,
      settlementProfit: settlements._sum.houseProfit || new Decimal(0),
      settlementsCount: settlements._count,
    };
  }

  /**
   * Check and create alerts for reserve ratio changes
   */
  private async checkAndCreateAlerts(
    currentRatio: Decimal,
    minRatio: Decimal,
    warningRatio: Decimal,
  ) {
    if (currentRatio.lt(minRatio)) {
      await this.createAlert(
        'RESERVE_RATIO_CRITICAL',
        AlertSeverity.CRITICAL,
        'CRITICAL: Reserve Ratio Below Minimum',
        `Reserve ratio is ${currentRatio.toFixed(4)}, below minimum threshold of ${minRatio.toFixed(4)}. ` +
        `All withdrawals have been automatically locked. Immediate action required.`,
        { currentRatio: currentRatio.toNumber(), threshold: minRatio.toNumber() },
      );
    } else if (currentRatio.lt(warningRatio)) {
      await this.createAlert(
        'RESERVE_RATIO_WARNING',
        AlertSeverity.WARNING,
        'Warning: Reserve Ratio Low',
        `Reserve ratio is ${currentRatio.toFixed(4)}, below warning threshold of ${warningRatio.toFixed(4)}. ` +
        `Large withdrawals (>$1000) have been paused.`,
        { currentRatio: currentRatio.toNumber(), threshold: warningRatio.toNumber() },
      );
    }
  }

  /**
   * Create system alert
   */
  async createAlert(
    alertType: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: any,
  ) {
    // Check for duplicate recent alert
    const recentAlert = await this.prisma.alertLog.findFirst({
      where: {
        alertType,
        isAcknowledged: false,
        createdAt: { gte: new Date(Date.now() - 3600000) }, // Within last hour
      },
    });

    if (recentAlert) {
      this.logger.debug(`Skipping duplicate alert: ${alertType}`);
      return recentAlert;
    }

    return this.prisma.alertLog.create({
      data: {
        alertType,
        severity,
        title,
        message,
        metadata,
      },
    });
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, adminId: string) {
    const alert = await this.prisma.alertLog.update({
      where: { id: alertId },
      data: {
        isAcknowledged: true,
        acknowledgedBy: adminId,
        acknowledgedAt: new Date(),
      },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        actionType: AdminActionType.ALERT_ACKNOWLEDGE,
        targetType: 'ALERT',
        targetId: alertId,
        reason: `Acknowledged alert: ${alert.title}`,
      },
    });

    return alert;
  }

  /**
   * Get all alerts
   */
  async getAlerts(options?: {
    isAcknowledged?: boolean;
    severity?: AlertSeverity;
    alertType?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options?.isAcknowledged !== undefined) {
      where.isAcknowledged = options.isAcknowledged;
    }
    if (options?.severity) where.severity = options.severity;
    if (options?.alertType) where.alertType = options.alertType;

    const [alerts, total] = await Promise.all([
      this.prisma.alertLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          acknowledger: { select: { id: true, username: true } },
        },
      }),
      this.prisma.alertLog.count({ where }),
    ]);

    return { alerts, total };
  }

  /**
   * Get bank snapshot history
   */
  async getBankSnapshots(limit: number = 30) {
    return this.prisma.bankSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        creator: { select: { id: true, username: true } },
      },
    });
  }

  /**
   * Get previous bank snapshot
   */
  private async getPreviousSnapshot() {
    const snapshots = await this.prisma.bankSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    return snapshots[1] || null;
  }

  /**
   * Get admin action audit log
   */
  async getAdminActions(options?: {
    adminId?: string;
    targetUserId?: string;
    actionType?: AdminActionType;
    targetType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options?.adminId) where.adminId = options.adminId;
    if (options?.targetUserId) where.targetUserId = options.targetUserId;
    if (options?.actionType) where.actionType = options.actionType;
    if (options?.targetType) where.targetType = options.targetType;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [actions, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
        include: {
          admin: { select: { id: true, username: true, email: true } },
          targetUser: { select: { id: true, username: true, email: true } },
        },
      }),
      this.prisma.adminAction.count({ where }),
    ]);

    return { actions, total };
  }

  // ==========================================================================
  // HOUSE ACCOUNT MANAGEMENT
  // ==========================================================================

  /**
   * Get detailed house account info with recent transactions
   */
  async getHouseAccountsDetailed() {
    // First try to find accounts with specific IDs
    let accounts = await this.prisma.ledgerAccount.findMany({
      where: {
        id: {
          in: Object.values(SYSTEM_ACCOUNTS),
        },
      },
      orderBy: { type: 'asc' },
    });

    // If no accounts found by ID, try by type
    if (accounts.length === 0) {
      accounts = await this.prisma.ledgerAccount.findMany({
        where: {
          type: {
            in: ['HOUSE_PROFIT', 'OPERATING_CAPITAL', 'CLEARING', 'FEE_COLLECTION'],
          },
        },
        orderBy: { type: 'asc' },
      });
    }

    // If still no accounts, return empty array with log
    if (accounts.length === 0) {
      this.logger.warn('No house accounts found. Run seed or initialize system accounts.');
      return [];
    }

    const accountsWithDetails = await Promise.all(
      accounts.map(async (account) => {
        // Get recent transactions (both debits and credits)
        const recentTransactions = await this.prisma.ledgerEntry.findMany({
          where: {
            OR: [
              { debitAccountId: account.id },
              { creditAccountId: account.id },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            debitAccount: { select: { id: true, type: true, name: true } },
            creditAccount: { select: { id: true, type: true, name: true } },
          },
        });

        // Get transaction counts
        const [totalDebitCount, totalCreditCount] = await Promise.all([
          this.prisma.ledgerEntry.count({ where: { debitAccountId: account.id } }),
          this.prisma.ledgerEntry.count({ where: { creditAccountId: account.id } }),
        ]);

        // Get total amounts in/out
        const [totalDebits, totalCredits] = await Promise.all([
          this.prisma.ledgerEntry.aggregate({
            where: { debitAccountId: account.id },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: { creditAccountId: account.id },
            _sum: { amount: true },
          }),
        ]);

        return {
          ...account,
          stats: {
            transactionCount: totalDebitCount + totalCreditCount,
            totalDebits: totalDebits._sum.amount || new Decimal(0),
            totalCredits: totalCredits._sum.amount || new Decimal(0),
          },
          recentTransactions: recentTransactions.map(tx => ({
            id: tx.id,
            type: tx.entryType,
            amount: tx.amount,
            description: tx.description,
            direction: tx.debitAccountId === account.id ? 'DEBIT' : 'CREDIT',
            counterparty: tx.debitAccountId === account.id 
              ? tx.creditAccount?.name 
              : tx.debitAccount?.name,
            createdAt: tx.createdAt,
          })),
        };
      }),
    );

    return accountsWithDetails;
  }

  /**
   * Get transaction history for a specific house account
   */
  async getHouseAccountTransactions(
    accountId: string,
    options: { limit?: number; offset?: number },
  ) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const [transactions, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: {
          OR: [
            { debitAccountId: accountId },
            { creditAccountId: accountId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          debitAccount: { select: { id: true, type: true, name: true } },
          creditAccount: { select: { id: true, type: true, name: true } },
        },
      }),
      this.prisma.ledgerEntry.count({
        where: {
          OR: [
            { debitAccountId: accountId },
            { creditAccountId: accountId },
          ],
        },
      }),
    ]);

    return {
      account,
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.entryType,
        amount: tx.amount,
        description: tx.description,
        direction: tx.debitAccountId === accountId ? 'DEBIT' : 'CREDIT',
        counterparty: tx.debitAccountId === accountId 
          ? (tx as any).creditAccount
          : (tx as any).debitAccount,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        createdAt: tx.createdAt,
        createdBy: tx.createdBy,
      })),
      total,
    };
  }

  /**
   * Transfer funds between house accounts
   */
  async transferBetweenHouseAccounts(params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    reason: string;
    adminId: string;
    ipAddress?: string;
  }) {
    const amount = new Decimal(params.amount);

    if (amount.lte(0)) {
      throw new Error('Amount must be positive');
    }

    // Verify both accounts are house accounts
    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.ledgerAccount.findUnique({ where: { id: params.fromAccountId } }),
      this.prisma.ledgerAccount.findUnique({ where: { id: params.toAccountId } }),
    ]);

    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }

    const houseTypes = ['HOUSE_PROFIT', 'OPERATING_CAPITAL', 'CLEARING', 'FEE_COLLECTION'];
    if (!houseTypes.includes(fromAccount.type) || !houseTypes.includes(toAccount.type)) {
      throw new Error('Both accounts must be house accounts');
    }

    // Check balance
    if (fromAccount.balance.lt(amount)) {
      throw new Error(`Insufficient balance. Available: $${fromAccount.balance.toFixed(2)}`);
    }

    // Create transfer in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update balances
      await tx.ledgerAccount.update({
        where: { id: params.fromAccountId },
        data: { balance: { decrement: amount } },
      });

      await tx.ledgerAccount.update({
        where: { id: params.toAccountId },
        data: { balance: { increment: amount } },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          entryType: 'ADMIN_ADJUSTMENT',
          debitAccountId: params.toAccountId,
          creditAccountId: params.fromAccountId,
          amount,
          description: `House transfer: ${params.reason}`,
          referenceType: 'HOUSE_TRANSFER',
          createdBy: params.adminId,
        },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId: params.adminId,
          actionType: AdminActionType.CONFIG_UPDATE,
          targetType: 'HOUSE_TRANSFER',
          targetId: entry.id,
          reason: params.reason,
          metadata: {
            fromAccountId: params.fromAccountId,
            toAccountId: params.toAccountId,
            amount: amount.toNumber(),
          },
          ipAddress: params.ipAddress,
        },
      });

      return entry;
    });

    this.logger.log(`🔄 House transfer: $${amount.toFixed(2)} from ${fromAccount.type} to ${toAccount.type}`);

    return result;
  }

  /**
   * Withdraw from house account to external bank
   * NOTE: Only OPERATING_CAPITAL can withdraw to external bank (Treasury model)
   */
  async withdrawHouseToBank(params: {
    fromAccountId: string;
    amount: number;
    bankReference?: string;
    reason: string;
    adminId: string;
    ipAddress?: string;
  }) {
    const amount = new Decimal(params.amount);

    if (amount.lte(0)) {
      throw new Error('Amount must be positive');
    }

    // Enforce Treasury Model: Only OPERATING_CAPITAL can withdraw to bank
    if (params.fromAccountId !== SYSTEM_ACCOUNTS.OPERATING_CAPITAL) {
      throw new Error('Only OPERATING_CAPITAL (Treasury) can withdraw to external bank. Transfer funds to Operating Capital first.');
    }

    const fromAccount = await this.prisma.ledgerAccount.findUnique({
      where: { id: params.fromAccountId },
    });

    if (!fromAccount) {
      throw new Error('Account not found');
    }

    if (fromAccount.balance.lt(amount)) {
      throw new Error(`Insufficient balance. Available: $${fromAccount.balance.toFixed(2)}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Decrease account balance
      await tx.ledgerAccount.update({
        where: { id: params.fromAccountId },
        data: { balance: { decrement: amount } },
      });

      // Create ledger entry (debit to external bank conceptually)
      const entry = await tx.ledgerEntry.create({
        data: {
          entryType: 'ADMIN_ADJUSTMENT',
          debitAccountId: SYSTEM_ACCOUNTS.CLEARING, // Use clearing as external party
          creditAccountId: params.fromAccountId,
          amount,
          description: `Bank withdrawal: ${params.reason}`,
          referenceType: 'BANK_WITHDRAWAL',
          referenceId: params.bankReference,
          metadata: { bankReference: params.bankReference },
          createdBy: params.adminId,
        },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId: params.adminId,
          actionType: AdminActionType.CONFIG_UPDATE,
          targetType: 'BANK_WITHDRAWAL',
          targetId: entry.id,
          reason: params.reason,
          metadata: {
            fromAccountId: params.fromAccountId,
            amount: amount.toNumber(),
            bankReference: params.bankReference,
          },
          ipAddress: params.ipAddress,
        },
      });

      return { entry, newBalance: fromAccount.balance.sub(amount) };
    });

    this.logger.log(`💸 Bank withdrawal: $${amount.toFixed(2)} from ${fromAccount.type}`);

    return result;
  }

  /**
   * Record deposit from external bank to house account
   * NOTE: Only OPERATING_CAPITAL can receive deposits from external bank (Treasury model)
   */
  async depositHouseFromBank(params: {
    toAccountId: string;
    amount: number;
    bankReference?: string;
    reason: string;
    adminId: string;
    ipAddress?: string;
  }) {
    const amount = new Decimal(params.amount);

    if (amount.lte(0)) {
      throw new Error('Amount must be positive');
    }

    // Enforce Treasury Model: Only OPERATING_CAPITAL can receive deposits from bank
    if (params.toAccountId !== SYSTEM_ACCOUNTS.OPERATING_CAPITAL) {
      throw new Error('Only OPERATING_CAPITAL (Treasury) can receive deposits from external bank. Deposit to Operating Capital, then transfer internally.');
    }

    const toAccount = await this.prisma.ledgerAccount.findUnique({
      where: { id: params.toAccountId },
    });

    if (!toAccount) {
      throw new Error('Account not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Increase account balance
      await tx.ledgerAccount.update({
        where: { id: params.toAccountId },
        data: { balance: { increment: amount } },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          entryType: 'ADMIN_ADJUSTMENT',
          debitAccountId: params.toAccountId,
          creditAccountId: SYSTEM_ACCOUNTS.CLEARING, // From external party
          amount,
          description: `Bank deposit: ${params.reason}`,
          referenceType: 'BANK_DEPOSIT',
          referenceId: params.bankReference,
          metadata: { bankReference: params.bankReference },
          createdBy: params.adminId,
        },
      });

      // Also update bank snapshot to reflect new bank balance
      const latestSnapshot = await tx.bankSnapshot.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      const newBankBalance = latestSnapshot 
        ? latestSnapshot.bankBalance.add(amount) 
        : amount;

      await tx.bankSnapshot.create({
        data: {
          bankBalance: newBankBalance,
          bankAccountRef: params.bankReference,
          totalUserLiabilities: latestSnapshot?.totalUserLiabilities || new Decimal(0),
          reserveRatio: latestSnapshot?.reserveRatio || new Decimal(999),
          minRatioThreshold: latestSnapshot?.minRatioThreshold || new Decimal(1.1),
          warningRatioThreshold: latestSnapshot?.warningRatioThreshold || new Decimal(1.2),
          isWithdrawalsLocked: latestSnapshot?.isWithdrawalsLocked || false,
          isLargeWithdrawalsPaused: latestSnapshot?.isLargeWithdrawalsPaused || false,
          notes: `Bank deposit: ${params.reason}`,
          creator: { connect: { id: params.adminId } },
        },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId: params.adminId,
          actionType: AdminActionType.CONFIG_UPDATE,
          targetType: 'BANK_DEPOSIT',
          targetId: entry.id,
          reason: params.reason,
          metadata: {
            toAccountId: params.toAccountId,
            amount: amount.toNumber(),
            bankReference: params.bankReference,
          },
          ipAddress: params.ipAddress,
        },
      });

      return { entry, newBalance: toAccount.balance.add(amount) };
    });

    this.logger.log(`💰 Bank deposit: $${amount.toFixed(2)} to ${toAccount.type}`);

    return result;
  }

  // ==========================================================================
  // SETTLEMENTS & ANALYTICS
  // ==========================================================================

  /**
   * Get round settlement history
   */
  async getSettlements(options: { limit?: number; offset?: number }) {
    const [settlements, total] = await Promise.all([
      this.prisma.roundSettlement.findMany({
        orderBy: { settledAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          round: {
            select: {
              id: true,
              roundNumber: true,
              state: true,
              indecisionTriggered: true,
              outerWinner: true,
              middleWinner: true,
              innerWinner: true,
              settledAt: true,
            },
          },
          settler: { select: { id: true, username: true } },
        },
      }),
      this.prisma.roundSettlement.count(),
    ]);

    return { settlements, total };
  }

  /**
   * Get settlement analytics summary
   */
  async getSettlementsSummary() {
    const [
      totalSettlements,
      aggregates,
      todaySettlements,
      weekSettlements,
    ] = await Promise.all([
      this.prisma.roundSettlement.count(),
      this.prisma.roundSettlement.aggregate({
        _sum: {
          totalPool: true,
          totalPayouts: true,
          houseProfit: true,
          houseFee: true,
        },
        _avg: {
          totalPool: true,
          houseProfit: true,
        },
      }),
      // Today's settlements
      this.prisma.roundSettlement.aggregate({
        where: {
          settledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { houseProfit: true, totalPool: true },
        _count: true,
      }),
      // This week's settlements
      this.prisma.roundSettlement.aggregate({
        where: {
          settledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { houseProfit: true, totalPool: true },
        _count: true,
      }),
    ]);

    // Get platform account totals
    const platformAccount = await this.prisma.platformAccount.findUnique({
      where: { id: 'HOUSE' },
    });

    return {
      totalSettlements,
      totalPool: aggregates._sum.totalPool || new Decimal(0),
      totalPayouts: aggregates._sum.totalPayouts || new Decimal(0),
      totalHouseProfit: aggregates._sum.houseProfit || new Decimal(0),
      totalHouseFees: aggregates._sum.houseFee || new Decimal(0),
      avgPoolPerRound: aggregates._avg.totalPool || new Decimal(0),
      avgProfitPerRound: aggregates._avg.houseProfit || new Decimal(0),
      today: {
        settlements: todaySettlements._count,
        profit: todaySettlements._sum.houseProfit || new Decimal(0),
        volume: todaySettlements._sum.totalPool || new Decimal(0),
      },
      thisWeek: {
        settlements: weekSettlements._count,
        profit: weekSettlements._sum.houseProfit || new Decimal(0),
        volume: weekSettlements._sum.totalPool || new Decimal(0),
      },
      platformAccount: platformAccount ? {
        balance: platformAccount.balance,
        reserveBalance: platformAccount.reserveBalance,
        totalFees: platformAccount.totalFees,
        totalPaidOut: platformAccount.totalPaidOut,
        totalCollected: platformAccount.totalCollected,
        totalSubsidy: platformAccount.totalSubsidy,
      } : null,
    };
  }

  /**
   * Get platform ledger entries (old system)
   */
  async getPlatformLedger(options: { type?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (options.type) where.type = options.type;

    const [entries, total] = await Promise.all([
      this.prisma.platformLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 100,
        skip: options.offset || 0,
      }),
      this.prisma.platformLedger.count({ where }),
    ]);

    return { entries, total };
  }
}
