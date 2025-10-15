import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AffiliateTier } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AffiliateService {
  constructor(private prisma: PrismaService) {}

  async getUserAffiliateData(userId: string) {
    const [user, referrals, earnings] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          affiliateCode: true,
          referrals: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
              wallet: {
                select: {
                  totalDeposited: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({
        where: { referredBy: userId },
      }),
      this.prisma.affiliateEarning.findMany({
        where: { userId },
        include: {
          referredUser: {
            select: {
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalEarnings = earnings.reduce((sum, earning) => sum.add(earning.amount), new Decimal(0));
    const totalPaid = earnings.filter(e => e.isPaid).reduce((sum, earning) => sum.add(earning.amount), new Decimal(0));
    const pendingPayout = totalEarnings.sub(totalPaid);

    return {
      affiliateCode: user.affiliateCode,
      totalReferrals: referrals,
      totalEarnings: totalEarnings.toNumber(),
      totalPaid: totalPaid.toNumber(),
      pendingPayout: pendingPayout.toNumber(),
      earnings,
    };
  }

  async getAffiliateStats() {
    const [
      totalAffiliates,
      totalReferrals,
      totalCommissions,
      paidCommissions,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          referrals: {
            some: {},
          },
        },
      }),
      this.prisma.user.count({
        where: {
          referredBy: {
            not: null,
          },
        },
      }),
      this.prisma.affiliateEarning.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.affiliateEarning.aggregate({
        where: { isPaid: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalAffiliates,
      totalReferrals,
      totalCommissions: totalCommissions._sum.amount || 0,
      paidCommissions: paidCommissions._sum.amount || 0,
      pendingCommissions: (totalCommissions._sum.amount || new Decimal(0)).sub(paidCommissions._sum.amount || new Decimal(0)).toNumber(),
    };
  }

  calculateAffiliateTier(totalDeposited: Decimal): AffiliateTier {
    const amount = totalDeposited.toNumber();
    
    if (amount < 50) return AffiliateTier.TIER_1;
    if (amount < 100) return AffiliateTier.TIER_2;
    if (amount < 500) return AffiliateTier.TIER_3;
    if (amount < 2000) return AffiliateTier.TIER_4;
    
    return AffiliateTier.TIER_5;
  }

  async processAffiliateCommission(referredUserId: string, depositAmount: Decimal) {
    const referredUser = await this.prisma.user.findUnique({
      where: { id: referredUserId },
      include: {
        referrer: true,
      },
    });

    if (!referredUser || !referredUser.referredBy) {
      return; // No referrer, no commission
    }

    const referrer = referredUser.referrer;
    if (!referrer) return;

    // Calculate commission based on tier
    const tier = await this.calculateAffiliateTier(depositAmount);
    const commission = this.calculateCommission(depositAmount, tier);

    if (commission.gt(0)) {
      // Create affiliate earning record
      await this.prisma.affiliateEarning.create({
        data: {
          userId: referrer.id,
          referredUserId,
          amount: commission,
          tier,
        },
      });

      // Add commission to referrer's wallet
      await this.prisma.wallet.update({
        where: { userId: referrer.id },
        data: {
          available: {
            increment: commission,
          },
        },
      });

      // Create transaction record
      await this.prisma.transaction.create({
        data: {
          userId: referrer.id,
          type: 'AFFILIATE_EARNING',
          amount: commission,
          status: 'COMPLETED',
          description: `Affiliate commission from ${referredUser.username}`,
        },
      });
    }
  }

  private calculateCommission(amount: Decimal, tier: AffiliateTier): Decimal {
    switch (tier) {
      case AffiliateTier.TIER_1:
        return new Decimal(0);
      case AffiliateTier.TIER_2:
        return new Decimal(1);
      case AffiliateTier.TIER_3:
        return new Decimal(2);
      case AffiliateTier.TIER_4:
        return new Decimal(5);
      case AffiliateTier.TIER_5:
        return new Decimal(7);
      default:
        return new Decimal(0);
    }
  }
}
