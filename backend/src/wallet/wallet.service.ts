import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

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
    console.log('🔍 Deposit request:', { userId, amount: amount.toString(), method, reference });
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.DEPOSIT,
            amount,
            status: TransactionStatus.PENDING,
            method,
            reference,
            description: `Deposit via ${method}`,
          },
        });

        // Update wallet
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
        };
      });
      
      console.log('✅ Deposit successful:', result.transaction.id);
      return result;
    } catch (error) {
      console.error('❌ Deposit transaction error:', error);
      throw error;
    }
  }

  async withdraw(userId: string, amount: Decimal, method: string, reference?: string) {
    console.log('🔍 Withdrawal request:', { userId, amount: amount.toString(), method, reference });
    try {
      const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.available.lt(amount)) {
        throw new BadRequestException('Insufficient funds');
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
      
      console.log('✅ Withdrawal successful:', result.transaction.id);
      return result;
    } catch (error) {
      console.error('❌ Withdrawal transaction error:', error);
      throw error;
    }
  }

  async processWithdrawal(transactionId: string, approved: boolean) {
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

      // Hold the funds
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
    });
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
