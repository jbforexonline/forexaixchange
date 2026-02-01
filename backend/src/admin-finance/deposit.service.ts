// =============================================================================
// DEPOSIT SERVICE - Admin-Controlled Deposit Workflow
// =============================================================================
// Status flow: PENDING -> APPROVED -> CREDITED (or REJECTED)
// All balance changes go through the ledger system
// =============================================================================

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { DepositStatus, AdminActionType, LedgerEntryType } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface CreateDepositParams {
  userId: string;
  amount: number;
  method: string;
  referenceId?: string;
  paymentProof?: string;
  idempotencyKey?: string;
  createdByAdminId?: string; // If admin creates on behalf of user
}

interface ProcessDepositParams {
  depositId: string;
  adminId: string;
  action: 'APPROVE' | 'REJECT';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private gateway: RealtimeGateway,
  ) {}

  /**
   * Create a new deposit request (user or admin initiated)
   */
  async createDeposit(params: CreateDepositParams) {
    this.logger.log(`📥 Creating deposit: User ${params.userId}, Amount: $${params.amount}`);

    const amount = new Decimal(params.amount);
    
    // Validate amount
    if (amount.lte(0)) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    // Calculate fee (if any)
    const feePercent = parseFloat(process.env.DEPOSIT_FEE_PERCENT || '0');
    const fee = amount.mul(feePercent).div(100);
    const netAmount = amount.sub(fee);

    // Check idempotency
    if (params.idempotencyKey) {
      const existing = await this.prisma.deposit.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) {
        this.logger.warn(`Duplicate deposit attempt: ${params.idempotencyKey}`);
        return existing;
      }
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create deposit record
    const deposit = await this.prisma.deposit.create({
      data: {
        userId: params.userId,
        amount,
        fee,
        netAmount,
        method: params.method,
        referenceId: params.referenceId,
        paymentProof: params.paymentProof,
        status: DepositStatus.PENDING,
        idempotencyKey: params.idempotencyKey,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    // Log admin action if admin created
    if (params.createdByAdminId) {
      await this.logAdminAction({
        adminId: params.createdByAdminId,
        actionType: AdminActionType.DEPOSIT_APPROVE, // Using closest match
        targetUserId: params.userId,
        targetType: 'DEPOSIT',
        targetId: deposit.id,
        amount,
        reasonCode: 'ADMIN_CREATED',
        reason: 'Admin created deposit on behalf of user',
      });
    }

    this.logger.log(`✅ Deposit created: ${deposit.id} - Status: ${deposit.status}`);

    return deposit;
  }

  /**
   * Process deposit (approve/reject) - Admin only
   */
  async processDeposit(params: ProcessDepositParams) {
    this.logger.log(`🔄 Processing deposit ${params.depositId}: ${params.action}`);

    return this.prisma.$transaction(async (tx) => {
      // Get deposit with lock
      const deposit = await tx.deposit.findUnique({
        where: { id: params.depositId },
        include: {
          user: true,
        },
      });

      if (!deposit) {
        throw new NotFoundException('Deposit not found');
      }

      // Validate current status
      if (deposit.status !== DepositStatus.PENDING) {
        throw new BadRequestException(
          `Cannot ${params.action.toLowerCase()} deposit in status: ${deposit.status}`
        );
      }

      // Validate admin has permission (check role)
      const admin = await tx.user.findUnique({
        where: { id: params.adminId },
      });

      if (!admin || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'].includes(admin.role)) {
        throw new ForbiddenException('Insufficient permissions to process deposits');
      }

      if (params.action === 'APPROVE') {
        return this.approveDeposit(tx, deposit, params);
      } else {
        return this.rejectDeposit(tx, deposit, params);
      }
    });
  }

  /**
   * Approve deposit and credit user balance
   */
  private async approveDeposit(
    tx: any,
    deposit: any,
    params: ProcessDepositParams,
  ) {
    // First, update to APPROVED status
    let updatedDeposit = await tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.APPROVED,
        approvedBy: params.adminId,
        approvedAt: new Date(),
      },
    });

    // Create ledger entry to credit user balance
    const ledgerResult = await this.ledgerService.creditUserAvailable(
      deposit.userId,
      deposit.netAmount,
      `Deposit approved: $${deposit.amount} via ${deposit.method}${deposit.fee.gt(0) ? ` (fee: $${deposit.fee})` : ''}`,
      'DEPOSIT',
      deposit.id,
      params.adminId,
      `deposit-credit-${deposit.id}`,
      tx,
    );

    // Update to CREDITED status with ledger entry reference
    updatedDeposit = await tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.CREDITED,
        creditedAt: new Date(),
        ledgerEntryId: ledgerResult.ledgerEntryId,
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Also update the legacy wallet for backward compatibility
    await tx.wallet.update({
      where: { userId: deposit.userId },
      data: {
        available: { increment: deposit.netAmount },
        totalDeposited: { increment: deposit.amount },
      },
    });

    // Log admin action
    await this.logAdminAction({
      adminId: params.adminId,
      actionType: AdminActionType.DEPOSIT_APPROVE,
      targetUserId: deposit.userId,
      targetType: 'DEPOSIT',
      targetId: deposit.id,
      amount: deposit.netAmount,
      reasonCode: 'APPROVED',
      reason: params.reason || 'Deposit approved',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }, tx);

    // Emit real-time update
    this.emitWalletUpdate(deposit.userId);

    this.logger.log(
      `✅ Deposit APPROVED & CREDITED: ${deposit.id} - User: ${deposit.userId} - Amount: $${deposit.netAmount}`
    );

    return updatedDeposit;
  }

  /**
   * Reject deposit
   */
  private async rejectDeposit(
    tx: any,
    deposit: any,
    params: ProcessDepositParams,
  ) {
    const updatedDeposit = await tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.REJECTED,
        rejectedBy: params.adminId,
        rejectedAt: new Date(),
        rejectionReason: params.reason,
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Log admin action
    await this.logAdminAction({
      adminId: params.adminId,
      actionType: AdminActionType.DEPOSIT_REJECT,
      targetUserId: deposit.userId,
      targetType: 'DEPOSIT',
      targetId: deposit.id,
      amount: deposit.amount,
      reasonCode: 'REJECTED',
      reason: params.reason || 'Deposit rejected',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }, tx);

    this.logger.log(
      `❌ Deposit REJECTED: ${deposit.id} - User: ${deposit.userId} - Reason: ${params.reason}`
    );

    return updatedDeposit;
  }

  /**
   * Get deposit by ID
   */
  async getDeposit(depositId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        approver: { select: { id: true, username: true } },
        rejecter: { select: { id: true, username: true } },
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    return deposit;
  }

  /**
   * Get user's deposits
   */
  async getUserDeposits(
    userId: string,
    options?: {
      status?: DepositStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { userId };
    if (options?.status) {
      where.status = options.status;
    }

    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          approver: { select: { id: true, username: true } },
          rejecter: { select: { id: true, username: true } },
        },
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return { deposits, total };
  }

  /**
   * Get all deposits (admin)
   */
  async getAllDeposits(options?: {
    status?: DepositStatus;
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
    if (options?.method) where.method = options.method;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          user: { select: { id: true, username: true, email: true } },
          approver: { select: { id: true, username: true } },
          rejecter: { select: { id: true, username: true } },
        },
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return { deposits, total };
  }

  /**
   * Get pending deposits count (for admin dashboard)
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.deposit.count({
      where: { status: DepositStatus.PENDING },
    });
  }

  /**
   * Log admin action for audit trail
   */
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

  /**
   * Emit wallet update via WebSocket
   */
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
          reason: 'deposit_credited',
        });
      }
    } catch (error) {
      this.logger.error(`Failed to emit wallet update: ${error.message}`);
    }
  }
}
