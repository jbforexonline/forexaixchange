// =============================================================================
// WITHDRAWAL SERVICE - User-Initiated + OTP + Admin Approval
// =============================================================================
// Status flow: DRAFT -> CONFIRMED -> PENDING_REVIEW -> APPROVED -> PAID
//              (or REJECTED -> REFUNDED)
// Funds are held when confirmed, released if rejected, debited when paid
// =============================================================================

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LedgerService, SYSTEM_ACCOUNTS } from '../ledger/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalStatus, AdminActionType, LedgerEntryType, AlertSeverity } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { randomInt } from 'crypto';

interface CreateWithdrawalParams {
  userId: string;
  amount: number;
  payoutMethod: string;
  payoutDestination: string;
  idempotencyKey?: string;
}

interface ConfirmWithdrawalParams {
  withdrawalId: string;
  userId: string;
  otpCode: string;
}

interface ProcessWithdrawalParams {
  withdrawalId: string;
  adminId: string;
  action: 'APPROVE' | 'REJECT' | 'PAY';
  reason?: string;
  payoutReference?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private gateway: RealtimeGateway,
  ) {}

  /**
   * Create a new withdrawal request (DRAFT status)
   */
  async createWithdrawal(params: CreateWithdrawalParams) {
    this.logger.log(`📤 Creating withdrawal: User ${params.userId}, Amount: $${params.amount}`);

    const amount = new Decimal(params.amount);

    // Validate amount
    if (amount.lte(0)) {
      throw new BadRequestException('Withdrawal amount must be positive');
    }

    // Get user and check limits
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check available balance (from legacy wallet for now)
    if (!user.wallet || user.wallet.available.lt(amount)) {
      throw new BadRequestException(
        `Insufficient funds. Available: $${user.wallet?.available?.toFixed(2) || '0.00'}`
      );
    }

    // Check daily withdrawal limits
    await this.checkWithdrawalLimits(user, amount);

    // Check reserve ratio
    const reserveCheck = await this.checkReserveRatio(amount);
    if (reserveCheck.blocked) {
      throw new BadRequestException(reserveCheck.message);
    }

    // Calculate fee
    const fee = await this.calculateWithdrawalFee(amount, user.premium);
    const netAmount = amount.sub(fee);

    // Check idempotency
    if (params.idempotencyKey) {
      const existing = await this.prisma.withdrawal.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) {
        this.logger.warn(`Duplicate withdrawal attempt: ${params.idempotencyKey}`);
        return existing;
      }
    }

    // Generate OTP
    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRATION_SECONDS || '300') * 1000));

    // Create withdrawal in DRAFT status
    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        userId: params.userId,
        amount,
        fee,
        netAmount,
        payoutMethod: params.payoutMethod,
        payoutDestination: params.payoutDestination,
        status: WithdrawalStatus.DRAFT,
        otpCode,
        otpExpiresAt,
        idempotencyKey: params.idempotencyKey,
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // TODO: Send OTP via email/SMS
    this.logger.log(`📧 OTP for withdrawal ${withdrawal.id}: ${otpCode} (expires: ${otpExpiresAt})`);

    this.logger.log(`✅ Withdrawal created: ${withdrawal.id} - Status: DRAFT - Awaiting OTP confirmation`);

    // Return withdrawal WITHOUT OTP for security
    return {
      ...withdrawal,
      otpCode: undefined, // Don't expose OTP
      message: 'OTP sent to your registered email/phone. Please confirm within 5 minutes.',
    };
  }

  /**
   * Confirm withdrawal with OTP (moves to PENDING_REVIEW and holds funds)
   */
  async confirmWithdrawal(params: ConfirmWithdrawalParams) {
    this.logger.log(`🔐 Confirming withdrawal ${params.withdrawalId} with OTP`);

    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: params.withdrawalId },
        include: { user: { include: { wallet: true } } },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal not found');
      }

      // Verify user owns this withdrawal
      if (withdrawal.userId !== params.userId) {
        throw new ForbiddenException('Not authorized to confirm this withdrawal');
      }

      // Check status
      if (withdrawal.status !== WithdrawalStatus.DRAFT) {
        throw new BadRequestException(
          `Withdrawal cannot be confirmed in status: ${withdrawal.status}`
        );
      }

      // Verify OTP
      if (!withdrawal.otpCode || withdrawal.otpCode !== params.otpCode) {
        throw new BadRequestException('Invalid OTP code');
      }

      // Check OTP expiration
      if (!withdrawal.otpExpiresAt || new Date() > withdrawal.otpExpiresAt) {
        throw new BadRequestException('OTP has expired. Please create a new withdrawal request.');
      }

      // Verify funds still available
      if (!withdrawal.user.wallet || withdrawal.user.wallet.available.lt(withdrawal.amount)) {
        throw new BadRequestException('Insufficient funds');
      }

      // Hold funds via ledger
      const holdResult = await this.ledgerService.holdFunds(
        withdrawal.userId,
        withdrawal.amount,
        LedgerEntryType.WITHDRAWAL_HOLD,
        `Withdrawal hold: $${withdrawal.amount} via ${withdrawal.payoutMethod}`,
        'WITHDRAWAL',
        withdrawal.id,
        params.userId,
        `withdrawal-hold-${withdrawal.id}`,
        tx,
      );

      // Update legacy wallet
      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: {
          available: { decrement: withdrawal.amount },
          held: { increment: withdrawal.amount },
        },
      });

      // Update withdrawal status
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: WithdrawalStatus.PENDING_REVIEW,
          confirmedAt: new Date(),
          otpVerifiedAt: new Date(),
          holdLedgerEntryId: holdResult.ledgerEntryId,
        },
        include: {
          user: { select: { id: true, username: true, email: true } },
        },
      });

      // Emit wallet update
      this.emitWalletUpdate(withdrawal.userId);

      this.logger.log(
        `✅ Withdrawal CONFIRMED: ${withdrawal.id} - Funds held - Awaiting admin review`
      );

      return updatedWithdrawal;
    });
  }

  /**
   * Process withdrawal (approve/reject/pay) - Admin only
   */
  async processWithdrawal(params: ProcessWithdrawalParams) {
    this.logger.log(`🔄 Processing withdrawal ${params.withdrawalId}: ${params.action}`);

    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: params.withdrawalId },
        include: { user: { include: { wallet: true } } },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal not found');
      }

      // Validate admin has permission
      const admin = await tx.user.findUnique({
        where: { id: params.adminId },
      });

      if (!admin || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'].includes(admin.role)) {
        throw new ForbiddenException('Insufficient permissions to process withdrawals');
      }

      switch (params.action) {
        case 'APPROVE':
          return this.approveWithdrawal(tx, withdrawal, params);
        case 'REJECT':
          return this.rejectWithdrawal(tx, withdrawal, params);
        case 'PAY':
          return this.markWithdrawalPaid(tx, withdrawal, params);
        default:
          throw new BadRequestException(`Invalid action: ${params.action}`);
      }
    });
  }

  /**
   * Approve withdrawal (moves to APPROVED status)
   */
  private async approveWithdrawal(
    tx: any,
    withdrawal: any,
    params: ProcessWithdrawalParams,
  ) {
    // Validate current status
    if (withdrawal.status !== WithdrawalStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot approve withdrawal in status: ${withdrawal.status}`
      );
    }

    const updatedWithdrawal = await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: WithdrawalStatus.APPROVED,
        reviewedBy: params.adminId,
        reviewedAt: new Date(),
        approvedBy: params.adminId,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Log admin action
    await this.logAdminAction({
      adminId: params.adminId,
      actionType: AdminActionType.WITHDRAWAL_APPROVE,
      targetUserId: withdrawal.userId,
      targetType: 'WITHDRAWAL',
      targetId: withdrawal.id,
      amount: withdrawal.netAmount,
      reasonCode: 'APPROVED',
      reason: params.reason || 'Withdrawal approved',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }, tx);

    this.logger.log(
      `✅ Withdrawal APPROVED: ${withdrawal.id} - Ready for payout`
    );

    return updatedWithdrawal;
  }

  /**
   * Reject withdrawal and refund held funds
   */
  private async rejectWithdrawal(
    tx: any,
    withdrawal: any,
    params: ProcessWithdrawalParams,
  ) {
    // Validate current status
    if (!['PENDING_REVIEW', 'APPROVED'].includes(withdrawal.status)) {
      throw new BadRequestException(
        `Cannot reject withdrawal in status: ${withdrawal.status}`
      );
    }

    // Release held funds via ledger
    const releaseResult = await this.ledgerService.releaseFunds(
      withdrawal.userId,
      withdrawal.amount,
      LedgerEntryType.WITHDRAWAL_RELEASE,
      `Withdrawal rejected: Funds released back to available`,
      'WITHDRAWAL',
      withdrawal.id,
      params.adminId,
      `withdrawal-release-${withdrawal.id}`,
      tx,
    );

    // Update legacy wallet
    await tx.wallet.update({
      where: { userId: withdrawal.userId },
      data: {
        available: { increment: withdrawal.amount },
        held: { decrement: withdrawal.amount },
      },
    });

    // Update withdrawal status
    const updatedWithdrawal = await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: WithdrawalStatus.REFUNDED,
        rejectedBy: params.adminId,
        rejectedAt: new Date(),
        rejectionReason: params.reason,
        refundedAt: new Date(),
        releaseLedgerEntryId: releaseResult.ledgerEntryId,
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Log admin action
    await this.logAdminAction({
      adminId: params.adminId,
      actionType: AdminActionType.WITHDRAWAL_REJECT,
      targetUserId: withdrawal.userId,
      targetType: 'WITHDRAWAL',
      targetId: withdrawal.id,
      amount: withdrawal.amount,
      reasonCode: 'REJECTED',
      reason: params.reason || 'Withdrawal rejected',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }, tx);

    // Emit wallet update
    this.emitWalletUpdate(withdrawal.userId);

    this.logger.log(
      `❌ Withdrawal REJECTED & REFUNDED: ${withdrawal.id} - User: ${withdrawal.userId}`
    );

    return updatedWithdrawal;
  }

  /**
   * Mark withdrawal as paid (after actual external payout)
   */
  private async markWithdrawalPaid(
    tx: any,
    withdrawal: any,
    params: ProcessWithdrawalParams,
  ) {
    // Validate current status
    if (withdrawal.status !== WithdrawalStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot mark as paid. Withdrawal must be APPROVED, currently: ${withdrawal.status}`
      );
    }

    // Debit held funds permanently via ledger
    const debitResult = await this.ledgerService.debitHeldFunds(
      withdrawal.userId,
      withdrawal.amount,
      SYSTEM_ACCOUNTS.CLEARING, // Goes to clearing account
      LedgerEntryType.WITHDRAWAL_DEBIT,
      `Withdrawal paid: $${withdrawal.netAmount} via ${withdrawal.payoutMethod}`,
      'WITHDRAWAL',
      withdrawal.id,
      params.adminId,
      `withdrawal-debit-${withdrawal.id}`,
      tx,
    );

    // Record fee
    if (withdrawal.fee.gt(0)) {
      await this.ledgerService.recordFee(
        withdrawal.fee,
        `Withdrawal fee for ${withdrawal.id}`,
        'WITHDRAWAL',
        withdrawal.id,
        `withdrawal-fee-${withdrawal.id}`,
        tx,
      );
    }

    // Update legacy wallet
    await tx.wallet.update({
      where: { userId: withdrawal.userId },
      data: {
        held: { decrement: withdrawal.amount },
        totalWithdrawn: { increment: withdrawal.amount },
      },
    });

    // Update withdrawal status
    const updatedWithdrawal = await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: WithdrawalStatus.PAID,
        paidBy: params.adminId,
        paidAt: new Date(),
        payoutReference: params.payoutReference,
        releaseLedgerEntryId: debitResult.ledgerEntryId,
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Create payout transaction record
    await tx.payoutTransaction.create({
      data: {
        withdrawalId: withdrawal.id,
        externalRef: params.payoutReference,
        payoutMethod: withdrawal.payoutMethod,
        payoutDestination: withdrawal.payoutDestination,
        amount: withdrawal.netAmount,
        status: 'SUCCESS',
        initiatedBy: params.adminId,
        completedAt: new Date(),
      },
    });

    // Log admin action
    await this.logAdminAction({
      adminId: params.adminId,
      actionType: AdminActionType.WITHDRAWAL_PAID,
      targetUserId: withdrawal.userId,
      targetType: 'WITHDRAWAL',
      targetId: withdrawal.id,
      amount: withdrawal.netAmount,
      reasonCode: 'PAID',
      reason: `Payout completed. Ref: ${params.payoutReference || 'N/A'}`,
      metadata: { payoutReference: params.payoutReference },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }, tx);

    // Emit wallet update
    this.emitWalletUpdate(withdrawal.userId);

    this.logger.log(
      `💸 Withdrawal PAID: ${withdrawal.id} - Net: $${withdrawal.netAmount} - Ref: ${params.payoutReference}`
    );

    return updatedWithdrawal;
  }

  /**
   * Check withdrawal limits for user
   */
  private async checkWithdrawalLimits(user: any, amount: Decimal) {
    const isPremium = user.premium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) >= new Date());

    // Get limits from env
    const dailyLimit = new Decimal(
      isPremium
        ? process.env.PREMIUM_DAILY_WITHDRAWAL_LIMIT || '10000'
        : process.env.FREE_DAILY_WITHDRAWAL_LIMIT || '500'
    );

    const largeThreshold = new Decimal(process.env.LARGE_WITHDRAWAL_THRESHOLD || '1000');

    // Calculate today's withdrawals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayWithdrawals = await this.prisma.withdrawal.aggregate({
      where: {
        userId: user.id,
        status: {
          in: [
            WithdrawalStatus.CONFIRMED,
            WithdrawalStatus.PENDING_REVIEW,
            WithdrawalStatus.APPROVED,
            WithdrawalStatus.PAID,
          ],
        },
        createdAt: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
    });

    const todayTotal = todayWithdrawals._sum.amount || new Decimal(0);
    const afterThisWithdrawal = (todayTotal as Decimal).add(amount);

    if (afterThisWithdrawal.gt(dailyLimit)) {
      const remaining = dailyLimit.sub(todayTotal as Decimal);
      throw new BadRequestException(
        `Daily withdrawal limit exceeded. ` +
        `Limit: $${dailyLimit.toFixed(2)}, ` +
        `Already requested today: $${(todayTotal as Decimal).toFixed(2)}, ` +
        `Remaining: $${remaining.gt(0) ? remaining.toFixed(2) : '0.00'}. ` +
        (isPremium ? '' : 'Premium users have higher limits.')
      );
    }

    // Check large withdrawal threshold (will require extra review)
    if (amount.gt(largeThreshold)) {
      this.logger.warn(`⚠️ Large withdrawal detected: $${amount} by user ${user.id}`);
      // Create alert for large withdrawal
      await this.createAlert(
        'LARGE_WITHDRAWAL',
        AlertSeverity.WARNING,
        'Large Withdrawal Request',
        `User ${user.username} (${user.id}) requested withdrawal of $${amount.toFixed(2)}`,
        { userId: user.id, amount: amount.toNumber() },
      );
    }
  }

  /**
   * Check reserve ratio before allowing withdrawal
   */
  private async checkReserveRatio(amount: Decimal): Promise<{ blocked: boolean; message?: string }> {
    // Get latest bank snapshot
    const latestSnapshot = await this.prisma.bankSnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latestSnapshot) {
      // No snapshot = allow withdrawal but warn
      this.logger.warn('⚠️ No bank snapshot found - cannot verify reserve ratio');
      return { blocked: false };
    }

    const minRatio = new Decimal(process.env.RESERVE_RATIO_MIN || '1.1');
    const warningRatio = new Decimal(process.env.RESERVE_RATIO_WARNING || '1.2');
    const largeThreshold = new Decimal(process.env.LARGE_WITHDRAWAL_THRESHOLD || '1000');

    // Check if withdrawals are locked
    if (latestSnapshot.isWithdrawalsLocked) {
      return {
        blocked: true,
        message: 'Withdrawals are temporarily suspended due to low reserve ratio. Please try again later.',
      };
    }

    // Check if large withdrawals are paused
    if (latestSnapshot.isLargeWithdrawalsPaused && amount.gt(largeThreshold)) {
      return {
        blocked: true,
        message: `Large withdrawals (>${largeThreshold.toFixed(2)}) are temporarily paused. Maximum: $${largeThreshold.toFixed(2)}`,
      };
    }

    // Check if reserve ratio is at warning level
    if (latestSnapshot.reserveRatio.lt(warningRatio)) {
      this.logger.warn(`⚠️ Reserve ratio at warning level: ${latestSnapshot.reserveRatio}`);
    }

    return { blocked: false };
  }

  /**
   * Calculate withdrawal fee
   */
  private async calculateWithdrawalFee(amount: Decimal, isPremium: boolean): Promise<Decimal> {
    // Premium users may have reduced or no fees
    if (isPremium) {
      return new Decimal(0);
    }

    // Tiered fee structure (round UP for fees)
    const amountNum = amount.toNumber();

    if (amountNum < 50) return new Decimal(1);
    if (amountNum < 100) return new Decimal(2);
    if (amountNum < 500) return new Decimal(3);
    if (amountNum < 2000) return new Decimal(6);

    // 1% for amounts >= $2000, rounded up
    const feePercent = new Decimal(process.env.WITHDRAWAL_FEE_PERCENT || '2');
    return amount.mul(feePercent).div(100).ceil().div(100).mul(100); // Round up to nearest cent
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return randomInt(100000, 999999).toString();
  }

  /**
   * Resend OTP for withdrawal
   */
  async resendOTP(withdrawalId: string, userId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (withdrawal.status !== WithdrawalStatus.DRAFT) {
      throw new BadRequestException('Cannot resend OTP for this withdrawal');
    }

    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRATION_SECONDS || '300') * 1000));

    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { otpCode, otpExpiresAt },
    });

    // TODO: Send OTP via email/SMS
    this.logger.log(`📧 Resent OTP for withdrawal ${withdrawalId}: ${otpCode}`);

    return { message: 'OTP resent successfully' };
  }

  /**
   * Cancel withdrawal (user can cancel before confirmation)
   */
  async cancelWithdrawal(withdrawalId: string, userId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (withdrawal.status !== WithdrawalStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot cancel withdrawal. Only DRAFT withdrawals can be cancelled.'
      );
    }

    await this.prisma.withdrawal.delete({
      where: { id: withdrawalId },
    });

    this.logger.log(`🗑️ Withdrawal cancelled: ${withdrawalId}`);

    return { message: 'Withdrawal cancelled' };
  }

  // ============== Query Methods ==============

  async getWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        reviewer: { select: { id: true, username: true } },
        approver: { select: { id: true, username: true } },
        rejecter: { select: { id: true, username: true } },
        payer: { select: { id: true, username: true } },
        payoutTransactions: true,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    // Remove OTP from response
    return { ...withdrawal, otpCode: undefined };
  }

  async getUserWithdrawals(
    userId: string,
    options?: {
      status?: WithdrawalStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { userId };
    if (options?.status) {
      where.status = options.status;
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        select: {
          id: true,
          amount: true,
          fee: true,
          netAmount: true,
          payoutMethod: true,
          payoutDestination: true,
          status: true,
          confirmedAt: true,
          approvedAt: true,
          paidAt: true,
          rejectedAt: true,
          rejectionReason: true,
          createdAt: true,
        },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return { withdrawals, total };
  }

  async getAllWithdrawals(options?: {
    status?: WithdrawalStatus;
    userId?: string;
    method?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options?.status) where.status = options.status;
    if (options?.userId) where.userId = options.userId;
    if (options?.method) where.payoutMethod = options.method;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          user: { select: { id: true, username: true, email: true } },
          approver: { select: { id: true, username: true } },
          payer: { select: { id: true, username: true } },
        },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    // Remove OTPs from response
    return {
      withdrawals: withdrawals.map(w => ({ ...w, otpCode: undefined })),
      total,
    };
  }

  async getPendingCount(): Promise<number> {
    return this.prisma.withdrawal.count({
      where: { status: WithdrawalStatus.PENDING_REVIEW },
    });
  }

  // ============== Helper Methods ==============

  private async logAdminAction(
    params: {
      adminId: string;
      actionType: AdminActionType;
      targetUserId?: string;
      targetType?: string;
      targetId?: string;
      amount?: Decimal;
      reasonCode?: string;
      reason?: string;
      metadata?: any;
      ipAddress?: string;
      userAgent?: string;
    },
    tx?: any,
  ) {
    const prismaClient = tx || this.prisma;

    await prismaClient.adminAction.create({
      data: {
        adminId: params.adminId,
        actionType: params.actionType,
        targetUserId: params.targetUserId,
        targetType: params.targetType,
        targetId: params.targetId,
        amount: params.amount,
        reasonCode: params.reasonCode,
        reason: params.reason,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  private async createAlert(
    alertType: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: any,
  ) {
    await this.prisma.alertLog.create({
      data: {
        alertType,
        severity,
        title,
        message,
        metadata,
      },
    });
  }

  private async emitWalletUpdate(userId: string) {
    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      if (wallet) {
        this.gateway.server.to(`user:${userId}`).emit('walletUpdated', {
          userId,
          available: wallet.available.toNumber(),
          held: wallet.held.toNumber(),
          total: wallet.available.add(wallet.held).toNumber(),
          reason: 'withdrawal_update',
        });
      }
    } catch (error) {
      this.logger.error(`Failed to emit wallet update: ${error.message}`);
    }
  }
}
