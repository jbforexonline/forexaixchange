import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { inspect } from 'util';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  // Demo mode in-memory store used when Prisma DB is unavailable
  private demoMode = false;
  private demoStore: Map<string, {
    available: Decimal;
    held: Decimal;
    totalDeposited: Decimal;
    totalWithdrawn: Decimal;
    totalWon: Decimal;
    totalLost: Decimal;
    user?: { id: string; username?: string; email?: string; premium?: boolean; verificationBadge?: boolean };
  }> = new Map();

  constructor(
    private prisma: PrismaService,
    private gateway: RealtimeGateway,
  ) {}

  private enableDemoMode(reason?: any) {
    if (this.demoMode) return;
    const msg = reason ? (reason.message || String(reason)) : 'unknown';
    this.logger.warn(`⚠️ Switching to demo wallet mode due to DB error: ${msg}`);
    this.logger.debug(inspect(reason, { depth: 2 }));
    this.demoMode = true;
  }

  private ensureDemoWallet(userId: string) {
    if (!this.demoStore.has(userId)) {
      this.demoStore.set(userId, {
        available: new Decimal(1000),
        held: new Decimal(0),
        totalDeposited: new Decimal(1000),
        totalWithdrawn: new Decimal(0),
        totalWon: new Decimal(0),
        totalLost: new Decimal(0),
        user: { id: userId, username: `demo-${userId}`, email: `${userId}@demo.local`, premium: false, verificationBadge: false },
      });
    }
    return this.demoStore.get(userId)!;
  }

  /**
   * Emit real-time wallet balance update to user
   */
  private async emitWalletUpdate(userId: string) {
    try {
      if (this.demoMode) {
        const dw = this.ensureDemoWallet(userId);
        this.gateway.server.to(`user:${userId}`).emit('walletUpdated', {
          userId,
          available: dw.available.toNumber(),
          held: dw.held.toNumber(),
          total: dw.available.add(dw.held).toNumber(),
          totalDeposited: dw.totalDeposited.toNumber(),
          totalWithdrawn: dw.totalWithdrawn.toNumber(),
          totalWon: dw.totalWon.toNumber(),
          totalLost: dw.totalLost.toNumber(),
        });
        return;
      }

      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (wallet) {
        this.gateway.server.to(`user:${userId}`).emit('walletUpdated', {
          userId,
          available: wallet.available.toNumber(),
          held: wallet.held.toNumber(),
          total: wallet.available.add(wallet.held).toNumber(),
          totalDeposited: wallet.totalDeposited.toNumber(),
          totalWithdrawn: wallet.totalWithdrawn.toNumber(),
          totalWon: wallet.totalWon.toNumber(),
          totalLost: wallet.totalLost.toNumber(),
        });
      }
    } catch (error) {
      // If DB error detected, enable demo mode and emit demo state
      const code = error?.code || error?.meta?.code;
      const msg = String(error?.message || error);
      if (msg.includes('does not exist') || ['P2021', 'P1001', 'P3018', 'P3009'].includes(code)) {
        this.enableDemoMode(error);
        const dw = this.ensureDemoWallet(userId);
        this.gateway.server.to(`user:${userId}`).emit('walletUpdated', {
          userId,
          available: dw.available.toNumber(),
          held: dw.held.toNumber(),
          total: dw.available.add(dw.held).toNumber(),
          totalDeposited: dw.totalDeposited.toNumber(),
          totalWithdrawn: dw.totalWithdrawn.toNumber(),
          totalWon: dw.totalWon.toNumber(),
          totalLost: dw.totalLost.toNumber(),
        });
      } else {
        this.logger.error('emitWalletUpdate error', error);
      }
    }
  }

  async getWallet(userId: string) {
    try {
      if (this.demoMode || process.env.DEMO_WALLET === 'true') {
        this.enableDemoMode('env-demo');
        const dw = this.ensureDemoWallet(userId);
        return {
          userId,
          available: dw.available,
          held: dw.held,
          totalDeposited: dw.totalDeposited,
          totalWithdrawn: dw.totalWithdrawn,
          totalWon: dw.totalWon,
          totalLost: dw.totalLost,
        };
      }

      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      return wallet;
    } catch (error) {
      const code = error?.code || error?.meta?.code;
      const msg = String(error?.message || error);
      if (msg.includes('does not exist') || ['P2021', 'P1001', 'P3018', 'P3009'].includes(code) || process.env.DEMO_WALLET === 'true') {
        this.enableDemoMode(error);
        const dw = this.ensureDemoWallet(userId);
        return {
          userId,
          available: dw.available,
          held: dw.held,
          totalDeposited: dw.totalDeposited,
          totalWithdrawn: dw.totalWithdrawn,
          totalWon: dw.totalWon,
          totalLost: dw.totalLost,
        };
      }

      throw error;
    }
  }

  async getBalance(userId: string) {
    const wallet = await this.getWallet(userId);
    // wallet may be Prisma wallet (Decimal) or demo object
    return {
      available: wallet.available,
      held: wallet.held,
      total: (wallet.available as Decimal).add(wallet.held as Decimal),
    };
  }

  async deposit(userId: string, amount: Decimal, method: string, reference?: string, idempotencyKey?: string) {
    this.logger.log(`🔍 Deposit request: ${userId} - $${amount.toString()} via ${method}`);
    try {
      if (this.demoMode || process.env.DEMO_WALLET === 'true') {
        this.enableDemoMode('demo-deposit');
        const dw = this.ensureDemoWallet(userId);
        // idempotency not persisted across restarts for demo, do a simple allowance
        dw.available = dw.available.add(amount);
        dw.totalDeposited = dw.totalDeposited.add(amount);

        // Emit update
        await this.emitWalletUpdate(userId);

        const transaction = {
          id: `demo-deposit-${Date.now()}`,
          userId,
          type: TransactionType.DEPOSIT,
          amount,
          status: TransactionStatus.COMPLETED,
          method,
          reference,
          idempotencyKey,
          processedAt: new Date(),
        } as any;

        return {
          transaction,
          wallet: dw,
          newBalance: dw.available,
          instant: true,
        };
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Check idempotency
        if (idempotencyKey) {
          const existing = await tx.transaction.findUnique({
            where: { idempotencyKey },
          });
          if (existing) {
            this.logger.warn(`Duplicate deposit attempt: ${idempotencyKey}`);
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            return {
              transaction: existing,
              wallet,
              newBalance: wallet?.available || new Decimal(0),
              instant: existing.status === TransactionStatus.COMPLETED,
            };
          }
        }

        // Check if method is mobile money (instant processing)
        const isMobileMoney = ['MTN', 'MoMo', 'momo', 'mtn', 'Mobile Money', 'mobile money'].includes(method);
        const status = isMobileMoney ? TransactionStatus.COMPLETED : TransactionStatus.PENDING;

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.DEPOSIT,
            amount,
            status,
            method,
            reference,
            idempotencyKey,
            description: `Deposit via ${method}`,
            processedAt: isMobileMoney ? new Date() : null,
          },
        });

        // For mobile money, update wallet immediately (instant)
        // For other methods, wallet is updated when admin approves
        if (isMobileMoney) {
          const wallet = await tx.wallet.update({
            where: { userId },
            data: {
              available: {
                increment: amount,
              },
              totalDeposited: {
                increment: amount,
              },
            },
          });

          return {
            transaction,
            wallet,
            newBalance: wallet.available,
            instant: true,
          };
        }

        // For non-mobile money, return pending transaction
        const wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        return {
          transaction,
          wallet,
          newBalance: wallet?.available || new Decimal(0),
          instant: false,
        };
      });
      
      this.logger.log(`✅ Deposit ${result.instant ? 'INSTANT' : 'PENDING'}: ${result.transaction.id}`);

      // Emit real-time balance update
      if (result.instant) {
        await this.emitWalletUpdate(userId);
      }

      return result;
    } catch (error) {
      this.logger.error('❌ Deposit transaction error:', error);
      const code = error?.code || error?.meta?.code;
      const msg = String(error?.message || error);
      if (msg.includes('does not exist') || ['P2021', 'P1001', 'P3018', 'P3009'].includes(code)) {
        // Enable demo mode and re-run deposit in demo
        this.enableDemoMode(error);
        return this.deposit(userId, amount, method, reference, idempotencyKey);
      }

      throw error;
    }
  }

  async withdraw(userId: string, amount: Decimal, method: string, reference?: string, idempotencyKey?: string) {
    this.logger.log(`🔍 Withdrawal request: ${userId} - $${amount.toString()} via ${method}`);
    try {
      if (this.demoMode || process.env.DEMO_WALLET === 'true') {
        this.enableDemoMode('demo-withdraw');
        const dw = this.ensureDemoWallet(userId);
        if (dw.available.lt(amount)) {
          throw new BadRequestException('Insufficient funds (demo)');
        }

        const isPremium = dw.user?.premium || false;
        const fee = isPremium ? new Decimal(0) : this.calculateWithdrawalFee(amount);

        // Create pseudo transaction
        const transaction = {
          id: `demo-withdraw-${Date.now()}`,
          userId,
          type: TransactionType.WITHDRAWAL,
          amount,
          fee,
          status: TransactionStatus.PENDING,
          method,
          reference,
          idempotencyKey,
          description: `Demo withdrawal via ${method}`,
        } as any;

        // Hold the funds
        dw.available = dw.available.sub(amount);
        dw.held = dw.held.add(amount);

        // Emit update
        await this.emitWalletUpdate(userId);

        return {
          transaction,
          amount,
          fee,
          totalDeduction: amount.add(fee),
        };
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Check idempotency
        if (idempotencyKey) {
          const existing = await tx.transaction.findUnique({
            where: { idempotencyKey },
          });
          if (existing) {
            this.logger.warn(`Duplicate withdrawal attempt: ${idempotencyKey}`);
            return {
              transaction: existing,
              amount: existing.amount,
              fee: existing.fee,
              totalDeduction: existing.amount.add(existing.fee),
            };
          }
        }

        const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user || !user.wallet) {
        throw new NotFoundException('User or wallet not found');
      }

      const wallet = user.wallet;

      if (wallet.available.lt(amount)) {
        throw new BadRequestException('Insufficient funds');
      }

      // Check withdrawal limits: Premium unlimited, Regular $2000/day
      const isPremium = user.premium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) >= new Date());
      if (!isPremium) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayWithdrawals = await tx.transaction.aggregate({
          where: {
            userId,
            type: 'WITHDRAWAL',
            status: { in: ['PENDING', 'COMPLETED'] },
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const todayTotal = todayWithdrawals._sum.amount || new Decimal(0);
        const dailyLimit = new Decimal(2000); // $2000/day for regular users
        const afterThisWithdrawal = todayTotal.add(amount);

        if (afterThisWithdrawal.gt(dailyLimit)) {
          const remaining = dailyLimit.sub(todayTotal);
          throw new BadRequestException(
            `Daily withdrawal limit exceeded. Limit: $${dailyLimit.toString()}/day. ` +
            `Already withdrawn today: $${todayTotal.toString()}. ` +
            `Remaining: $${remaining.gt(0) ? remaining.toString() : '0'}. ` +
            `Premium users have unlimited withdrawals.`
          );
        }
      }

      // Calculate withdrawal fee: Premium users have NO fee, Regular users pay fee
      const fee = isPremium ? new Decimal(0) : this.calculateWithdrawalFee(amount);

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.WITHDRAWAL,
          amount,
          fee,
          status: TransactionStatus.PENDING,
          method,
          reference,
          idempotencyKey,
          description: `Withdrawal via ${method}`,
        },
      });

      // Hold the funds
      await tx.wallet.update({
        where: { userId },
        data: {
          available: {
            decrement: amount,
          },
          held: {
            increment: amount,
          },
        },
      });

        return {
          transaction,
          amount,
          fee,
          totalDeduction: amount.add(fee),
        };
      });
      
      this.logger.log(`✅ Withdrawal request created: ${result.transaction.id}`);

      // Emit real-time balance update (funds held)
      await this.emitWalletUpdate(userId);

      return result;
    } catch (error) {
      this.logger.error('❌ Withdrawal transaction error:', error);
      const code = error?.code || error?.meta?.code;
      const msg = String(error?.message || error);
      if (msg.includes('does not exist') || ['P2021', 'P1001', 'P3018', 'P3009'].includes(code)) {
        this.enableDemoMode(error);
        return this.withdraw(userId, amount, method, reference, idempotencyKey);
      }

      throw error;
    }
  }

  async processWithdrawal(transactionId: string, approved: boolean, approverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { user: { include: { wallet: true } } },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.type !== TransactionType.WITHDRAWAL) {
        throw new BadRequestException('Invalid transaction type');
      }

      const status = approved ? TransactionStatus.COMPLETED : TransactionStatus.FAILED;

      if (approved) {
        // Remove held funds and update totals
        await tx.wallet.update({
          where: { userId: transaction.userId },
          data: {
            held: {
              decrement: transaction.amount,
            },
            totalWithdrawn: {
              increment: transaction.amount,
            },
          },
        });
      } else {
        // Return held funds to available
        await tx.wallet.update({
          where: { userId: transaction.userId },
          data: {
            available: {
              increment: transaction.amount,
            },
            held: {
              decrement: transaction.amount,
            },
          },
        });
      }

      // Update transaction status
      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status,
          processedAt: new Date(),
        },
      });

      return updatedTransaction;
    }).then(async (updatedTransaction) => {
      // Emit real-time balance update (funds withdrawn or returned)
      await this.emitWalletUpdate(updatedTransaction.userId);
      this.logger.log(
        `💰 Withdrawal ${approved ? 'APPROVED' : 'REJECTED'} - User: ${updatedTransaction.userId}, Balance updated in real-time`,
      );
      return updatedTransaction;
    });
  }

  async transferFunds(senderId: string, recipientId: string, amount: Decimal, feePayer: 'SENDER' | 'RECIPIENT', idempotencyKey?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Check idempotency
      if (idempotencyKey) {
        const existing = await tx.internalTransfer.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          this.logger.warn(`Duplicate transfer attempt: ${idempotencyKey}`);
          return existing;
        }
      }

      const senderWallet = await tx.wallet.findUnique({
        where: { userId: senderId },
      });

      const recipientWallet = await tx.wallet.findUnique({
        where: { userId: recipientId },
      });

      if (!senderWallet || !recipientWallet) {
        throw new NotFoundException('Wallet not found');
      }

      const fee = this.calculateTransferFee(amount);
      const totalDeduction = feePayer === 'SENDER' ? amount.add(fee) : amount;

      if (senderWallet.available.lt(totalDeduction)) {
        throw new BadRequestException('Insufficient funds');
      }

      // Create internal transfer record
      const transfer = await tx.internalTransfer.create({
        data: {
          senderId,
          recipientId,
          amount,
          fee,
          feePayer,
          status: 'PENDING',
          idempotencyKey,
        },
      });

      // Hold the funds (instant deduction from available)
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          available: {
            decrement: totalDeduction,
          },
          held: {
            increment: totalDeduction,
          },
        },
      });

      return transfer;
    }).then(async (transfer) => {
      // Emit real-time balance update for sender (funds held instantly)
      await this.emitWalletUpdate(senderId);
      return transfer;
    });
  }

  /**
   * Get transfer details with recipient info for contact
   */
  async getTransferWithRecipient(transferId: string, userId: string) {
    const transfer = await this.prisma.internalTransfer.findUnique({
      where: { id: transferId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            username: true,
            email: true,
            verificationBadge: true,
            premium: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    // Only sender or recipient can view
    if (transfer.senderId !== userId && transfer.recipientId !== userId) {
      throw new ForbiddenException('Not authorized to view this transfer');
    }

    return transfer;
  }

  async processTransfer(transferId: string, approved: boolean, approverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.internalTransfer.findUnique({
        where: { id: transferId },
        include: {
          sender: { include: { wallet: true } },
          recipient: { include: { wallet: true } },
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer not found');
      }

      const status = approved ? 'APPROVED' : 'REJECTED';

      if (approved) {
        // Move funds to recipient
        const recipientAmount = transfer.feePayer === 'RECIPIENT' 
          ? transfer.amount.sub(transfer.fee) 
          : transfer.amount;

        await tx.wallet.update({
          where: { userId: transfer.recipientId },
          data: {
            available: {
              increment: recipientAmount,
            },
          },
        });

        // Remove held funds from sender
        const senderDeduction = transfer.feePayer === 'SENDER' 
          ? transfer.amount.add(transfer.fee) 
          : transfer.amount;

        await tx.wallet.update({
          where: { userId: transfer.senderId },
          data: {
            held: {
              decrement: senderDeduction,
            },
          },
        });

        // Create transaction records
        await tx.transaction.createMany({
          data: [
            {
              userId: transfer.senderId,
              type: TransactionType.INTERNAL_TRANSFER_SENT,
              amount: transfer.amount,
              fee: transfer.feePayer === 'SENDER' ? transfer.fee : new Decimal(0),
              status: TransactionStatus.COMPLETED,
              description: `Internal transfer to ${transfer.recipient.username}`,
            },
            {
              userId: transfer.recipientId,
              type: TransactionType.INTERNAL_TRANSFER_RECEIVED,
              amount: recipientAmount,
              fee: transfer.feePayer === 'RECIPIENT' ? transfer.fee : new Decimal(0),
              status: TransactionStatus.COMPLETED,
              description: `Internal transfer from ${transfer.sender.username}`,
            },
          ],
        });
      } else {
        // Return held funds to sender
        const returnAmount = transfer.feePayer === 'SENDER' 
          ? transfer.amount.add(transfer.fee) 
          : transfer.amount;

        await tx.wallet.update({
          where: { userId: transfer.senderId },
          data: {
            available: {
              increment: returnAmount,
            },
            held: {
              decrement: returnAmount,
            },
          },
        });
      }

      // Update transfer status
      const updatedTransfer = await tx.internalTransfer.update({
        where: { id: transferId },
        data: {
          status,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      });

      return updatedTransfer;
    }).then(async (transfer) => {
      // Emit real-time wallet updates for both sender and recipient
      await this.emitWalletUpdate(transfer.senderId);
      if (approved) {
        await this.emitWalletUpdate(transfer.recipientId);
        this.logger.log(
          `💰 Transfer APPROVED - Sender: ${transfer.senderId}, Recipient: ${transfer.recipientId} - Balances updated in real-time`,
        );
      } else {
        this.logger.log(
          `❌ Transfer REJECTED - Sender: ${transfer.senderId} - Funds returned, balance updated in real-time`,
        );
      }
      return transfer;
    });
  }

  calculateWithdrawalFee(amount: Decimal): Decimal {
    const amountNum = amount.toNumber();
    
    if (amountNum < 50) return new Decimal(1);
    if (amountNum < 100) return new Decimal(2);
    if (amountNum < 500) return new Decimal(3);
    if (amountNum < 2000) return new Decimal(6);
    
    // 1% for amounts >= $2000
    return amount.mul(0.01);
  }

  calculateTransferFee(amount: Decimal): Decimal {
    const amountNum = amount.toNumber();
    
    if (amountNum < 50) return new Decimal(1);
    if (amountNum < 100) return new Decimal(2);
    if (amountNum < 500) return new Decimal(3);
    if (amountNum < 2000) return new Decimal(6);
    
    // 1% for amounts >= $2000
    return amount.mul(0.01);
  }

  calculateAffiliateCommission(amount: Decimal): Decimal {
    const amountNum = amount.toNumber();
    
    if (amountNum < 50) return new Decimal(0);
    if (amountNum < 100) return new Decimal(1);
    if (amountNum < 500) return new Decimal(2);
    if (amountNum < 2000) return new Decimal(5);
    
    return new Decimal(7);
  }

  /**
   * Find user by username, ID, or email
   */
  async findUserByIdentifier(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { id: identifier },
          { email: identifier },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        verificationBadge: true,
        premium: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found. Search by username, ID, or email.');
    }

    return user;
  }

  /**
   * Search users for transfer
   */
  async searchUsers(query: string, excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        id: { not: excludeUserId },
        isActive: true,
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        verificationBadge: true,
        premium: true,
        isVerified: true,
      },
      take: 10,
    });
  }

  /**
   * Get all internal transfers (admin)
   */
  async getAllTransfers() {
    return this.prisma.internalTransfer.findMany({
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
