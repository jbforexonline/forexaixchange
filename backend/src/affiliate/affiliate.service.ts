import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AffiliateTier } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class AffiliateService {
  constructor(
    private prisma: PrismaService,
    private gateway: RealtimeGateway,
  ) { }

  private async emitWalletUpdate(userId: string) {
    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (wallet && this.gateway.server) {
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
        console.log(`Real-time wallet update emitted for user ${userId} after commission`);
      }
    } catch (error) {
      console.error('Failed to emit wallet update after commission:', error);
    }
  }

  async getUserAffiliateData(userId: string) {
    try {
      console.log(`Getting affiliate data for user: ${userId}`);

      // Get user with basic info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          affiliateCode: true,
          username: true,
          email: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Ensure user has an affiliate code
      let affiliateCode = user.affiliateCode;
      if (!affiliateCode) {
        affiliateCode = await this.generateAffiliateCode(userId);
      }

      // Get referrals count
      const totalReferrals = await this.prisma.user.count({
        where: { referredBy: userId },
      });

      // Get affiliate earnings
      const earnings = await this.prisma.affiliateEarning.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate totals
      let totalEarnings = new Decimal(0);
      let totalPaid = new Decimal(0);

      earnings.forEach(earning => {
        totalEarnings = totalEarnings.add(earning.amount);
        if (earning.isPaid) {
          totalPaid = totalPaid.add(earning.amount);
        }
      });

      const pendingPayout = totalEarnings.sub(totalPaid);

      // Aggregated earnings per referral
      const referralEarnings = await this.prisma.affiliateEarning.groupBy({
        by: ['referredUserId'],
        where: { userId },
        _sum: {
          amount: true,
        },
      });

      const earningMap = new Map();
      referralEarnings.forEach(re => {
        earningMap.set(re.referredUserId, re._sum.amount?.toNumber() || 0);
      });

      // Get basic referrals info
      const referrals = await this.prisma.user.findMany({
        where: { referredBy: userId },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          wallet: {
            select: {
              totalDeposited: true,
              available: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Format response
      return {
        affiliateCode,
        totalReferrals,
        activeReferrals: referrals.filter(ref => (ref.wallet?.totalDeposited?.toNumber() || 0) > 0).length,
        totalEarnings: totalEarnings.toNumber(),
        totalPaid: totalPaid.toNumber(),
        pendingPayout: pendingPayout.toNumber(),
        referrals: referrals.map(ref => ({
          id: ref.id,
          username: ref.username,
          email: ref.email,
          createdAt: ref.createdAt,
          totalDeposited: ref.wallet?.totalDeposited?.toNumber() || 0,
          yourCommission: earningMap.get(ref.id) || 0,
          status: (ref.wallet?.totalDeposited?.toNumber() || 0) > 0 ? 'Active' : 'Inactive',
        })),
        earnings: earnings.map(e => ({
          id: e.id,
          amount: e.amount.toNumber(),
          tier: e.tier,
          isPaid: e.isPaid,
          createdAt: e.createdAt,
          description: e.referredUserId ? `Commission from referral` : 'Affiliate commission',
        })),
      };
    } catch (error) {
      console.error('Error in getUserAffiliateData:', error);
      console.error('Error stack:', error.stack);

      // Return default data if there's an error
      return {
        affiliateCode: '',
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        totalPaid: 0,
        pendingPayout: 0,
        referrals: [],
        earnings: [],
      };
    }
  }

  async getUserReferrals(userId: string) {
    try {
      // Aggregated earnings per referral
      const referralEarnings = await this.prisma.affiliateEarning.groupBy({
        by: ['referredUserId'],
        where: { userId },
        _sum: {
          amount: true,
        },
      });

      const earningMap = new Map();
      referralEarnings.forEach(re => {
        earningMap.set(re.referredUserId, re._sum.amount?.toNumber() || 0);
      });

      const referrals = await this.prisma.user.findMany({
        where: { referredBy: userId },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          wallet: {
            select: {
              totalDeposited: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      return referrals.map(ref => ({
        id: ref.id,
        username: ref.username,
        email: ref.email,
        createdAt: ref.createdAt,
        totalDeposited: ref.wallet?.totalDeposited?.toNumber() || 0,
        yourCommission: earningMap.get(ref.id) || 0,
        paidCommission: earningMap.get(ref.id) || 0,
        pendingCommission: 0,
        status: (ref.wallet?.totalDeposited?.toNumber() || 0) > 0 ? 'Active' : 'Inactive',
      }));
    } catch (error) {
      console.error('Error in getUserReferrals:', error);
      return [];
    }
  }

  async generateAffiliateCode(userId: string): Promise<string> {
    try {
      // Generate a unique affiliate code
      const generateCode = () => {
        return `REF${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      };

      let code = generateCode();
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure code is unique
      while (attempts < maxAttempts) {
        const existing = await this.prisma.user.findUnique({
          where: { affiliateCode: code },
        });

        if (!existing) {
          break;
        }

        code = generateCode();
        attempts++;
      }

      // Save to user
      await this.prisma.user.update({
        where: { id: userId },
        data: { affiliateCode: code },
      });

      return code;
    } catch (error) {
      console.error('Error generating affiliate code:', error);
      // Return a fallback code
      return `REF${userId.substring(0, 8).toUpperCase()}`;
    }
  }

  async getAffiliateStats() {
    try {
      const totalAffiliates = await this.prisma.user.count({
        where: {
          affiliateCode: {
            not: null,
          },
        },
      });

      const totalReferrals = await this.prisma.user.count({
        where: {
          referredBy: {
            not: null,
          },
        },
      });

      // Get total commissions
      const earnings = await this.prisma.affiliateEarning.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          isPaid: true,
        },
      });

      const pendingEarnings = await this.prisma.affiliateEarning.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          isPaid: false,
        },
      });

      return {
        totalAffiliates,
        totalReferrals,
        totalCommissions: earnings._sum.amount?.toNumber() || 0,
        paidCommissions: earnings._sum.amount?.toNumber() || 0,
        pendingCommissions: pendingEarnings._sum.amount?.toNumber() || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in getAffiliateStats:', error);
      return {
        totalAffiliates: 0,
        totalReferrals: 0,
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // REMOVE WITHDRAWAL METHOD FOR NOW
  // async withdrawCommission(userId: string, amount: Decimal) {
  //   // Remove this method for now
  // }

  async getRecentEarnings(userId: string, limit: number = 10) {
    try {
      const earnings = await this.prisma.affiliateEarning.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return earnings.map(e => ({
        id: e.id,
        amount: e.amount.toNumber(),
        tier: e.tier,
        isPaid: e.isPaid,
        createdAt: e.createdAt,
      }));
    } catch (error) {
      console.error('Error in getRecentEarnings:', error);
      return [];
    }
  }

  async getAffiliateLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'allTime' = 'allTime', limit = 10) {
    try {
      const now = new Date();
      let where: any = {};

      if (period === 'daily') {
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        where = { createdAt: { gte: since } };
      } else if (period === 'weekly') {
        const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where = { createdAt: { gte: since } };
      } else if (period === 'monthly') {
        const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        where = { createdAt: { gte: since } };
      }

      // Group earnings by affiliate (userId) and sum amounts
      const grouped = await this.prisma.affiliateEarning.groupBy({
        by: ['userId'],
        where,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      });

      // Fetch user info for the top entries
      const results = [] as any[];
      let rank = 1;
      for (const g of grouped) {
        const user = await this.prisma.user.findUnique({ where: { id: g.userId }, select: { id: true, username: true } });
        results.push({
          rank: rank++,
          userId: g.userId,
          username: user?.username || 'Unknown',
          totalCommissionsEarned: g._sum.amount?.toNumber() || 0,
          totalReferrals: 0,
          period,
        });
      }

      // Optionally fill totalReferrals counts
      for (const r of results) {
        const count = await this.prisma.user.count({ where: { referredBy: r.userId } });
        r.totalReferrals = count;
      }

      return results;
    } catch (error) {
      console.error('Error in getAffiliateLeaderboard:', error);
      return [];
    }
  }

  async processAffiliateCommission(
    referredUserId: string,
    depositAmount: Decimal,
  ) {
    try {
      const referredUser = await this.prisma.user.findUnique({
        where: { id: referredUserId },
        include: { referrer: true },
      });

      if (!referredUser || !referredUser.referredBy || !referredUser.referrer) {
        console.log(`No referrer found for user ${referredUserId}`);
        return null;
      }

      const referrer = referredUser.referrer;
      console.log(`Processing affiliate commission for ${referredUser.username} referred by ${referrer.username}`);

      // Calculate commission based on tier
      const commissionRate = this.getCommissionRate(depositAmount);
      const commissionAmount = depositAmount.mul(new Decimal(commissionRate));

      // Determine tier
      const tier = this.getTierForAmount(depositAmount);

      // Use transaction for atomic update
      const result = await this.prisma.$transaction(async (tx) => {
        // Create affiliate earning
        const earning = await tx.affiliateEarning.create({
          data: {
            userId: referrer.id,
            referredUserId,
            amount: commissionAmount,
            tier,
            isPaid: true, // Mark as paid since we credit directly
          },
        });

        // Credit the referrer's wallet
        await tx.wallet.update({
          where: { userId: referrer.id },
          data: {
            available: {
              increment: commissionAmount,
            },
          },
        });

        return earning;
      });

      console.log(`Commission recorded and credited to wallet: $${commissionAmount} (${commissionRate * 100}%)`);
      
      // Emit real-time update to referrer
      await this.emitWalletUpdate(referrer.id);
      
      return result;
    } catch (error) {
      console.error('Error processing affiliate commission:', error);
      return null;
    }
  }

  async processWithdrawalCommission(
    referredUserId: string,
    withdrawalAmount: Decimal,
  ) {
    try {
      const referredUser = await this.prisma.user.findUnique({
        where: { id: referredUserId },
        include: { referrer: true },
      });

      if (!referredUser || !referredUser.referredBy || !referredUser.referrer) {
        console.log(`No referrer found for user ${referredUserId} for withdrawal commission`);
        return null;
      }

      const referrer = referredUser.referrer;
      console.log(`Processing withdrawal commission for ${referredUser.username} referred by ${referrer.username}`);

      // Fixed 2% commission for withdrawals for now (can be made dynamic)
      const commissionRate = 0.02;
      const commissionAmount = withdrawalAmount.mul(new Decimal(commissionRate));

      // Use transaction for atomic update
      const result = await this.prisma.$transaction(async (tx) => {
        // Create affiliate earning record for withdrawal
        const earning = await tx.affiliateEarning.create({
          data: {
            userId: referrer.id,
            referredUserId,
            amount: commissionAmount,
            tier: AffiliateTier.TIER_1, // Default tier for withdrawals
            isPaid: true,
          },
        });

        // Credit the referrer's wallet
        await tx.wallet.update({
          where: { userId: referrer.id },
          data: {
            available: {
              increment: commissionAmount,
            },
          },
        });

        return earning;
      });

      console.log(`Withdrawal commission recorded and credited to wallet: $${commissionAmount} (2%)`);
      
      // Emit real-time update to referrer
      await this.emitWalletUpdate(referrer.id);
      
      return result;
    } catch (error) {
      console.error('Error processing withdrawal commission:', error);
      return null;
    }
  }

  private calculateCommission(depositAmount: number): number {
    if (depositAmount < 50) return 0;
    if (depositAmount < 100) return depositAmount * 0.01; // 1%
    if (depositAmount < 500) return depositAmount * 0.02; // 2%
    if (depositAmount < 2000) return depositAmount * 0.05; // 5%
    return depositAmount * 0.07; // 7%
  }

  private getCommissionRate(depositAmount: Decimal): number {
    const amount = depositAmount.toNumber();
    if (amount < 50) return 0;
    if (amount < 100) return 0.01; // 1%
    if (amount < 500) return 0.02; // 2%
    if (amount < 2000) return 0.05; // 5%
    return 0.07; // 7%
  }

  private getTierForAmount(depositAmount: Decimal): AffiliateTier {
    const amount = depositAmount.toNumber();
    if (amount < 50) return AffiliateTier.TIER_1;
    if (amount < 100) return AffiliateTier.TIER_2;
    if (amount < 500) return AffiliateTier.TIER_3;
    if (amount < 2000) return AffiliateTier.TIER_4;
    return AffiliateTier.TIER_5;
  }
}