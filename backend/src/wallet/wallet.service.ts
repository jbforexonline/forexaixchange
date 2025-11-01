import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: RealtimeGateway,
  ) {}

  /**
   * Emit real-time wallet balance update to user
   */
  private async emitWalletUpdate(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

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
  }

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getWallet(userId);
    return {
      available: wallet.available,
      held: wallet.held,
      total: wallet.available.add(wallet.held),
    };
  }

  async deposit(userId: string, amount: Decimal, method: string, reference?: string) {
    this.logger.log(`🔍 Deposit request: ${userId} - $${amount.toString()} via ${method}`);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
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
      throw error;
    }
  }

  async withdraw(userId: string, amount: Decimal, method: string, reference?: string) {
    console.log('🔍 Withdrawal request:', { userId, amount: amount.toString(), method, reference });
    try {
      const result = await this.prisma.$transaction(async (tx) => {
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

      // Calculate withdrawal fee
      const fee = this.calculateWithdrawalFee(amount);

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

  async transferFunds(senderId: string, recipientId: string, amount: Decimal, feePayer: 'SENDER' | 'RECIPIENT') {
    return this.prisma.$transaction(async (tx) => {
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
}
