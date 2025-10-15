import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PremiumService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.premiumPlan.findMany({
      where: { isActive: true },
      orderBy: { duration: 'asc' },
    });
  }

  async subscribe(userId: string, planId: string) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.premiumPlan.findUnique({
        where: { id: planId },
      });

      if (!plan || !plan.isActive) {
        throw new NotFoundException('Plan not found or inactive');
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user || !user.wallet) {
        throw new NotFoundException('User or wallet not found');
      }

      if (user.wallet.available.lt(plan.price)) {
        throw new BadRequestException('Insufficient funds');
      }

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.duration);

      // Create subscription
      const subscription = await tx.premiumSubscription.create({
        data: {
          userId,
          planId,
          endDate,
          amountPaid: plan.price,
        },
      });

      // Update user premium status
      await tx.user.update({
        where: { id: userId },
        data: {
          premium: true,
          premiumExpiresAt: endDate,
        },
      });

      // Deduct payment from wallet
      await tx.wallet.update({
        where: { userId },
        data: {
          available: {
            decrement: plan.price,
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'PREMIUM_SUBSCRIPTION',
          amount: plan.price,
          status: 'COMPLETED',
          description: `Premium subscription: ${plan.name}`,
        },
      });

      return subscription;
    });
  }

  async getUserSubscription(userId: string) {
    return this.prisma.premiumSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          gt: new Date(),
        },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkExpiredSubscriptions() {
    const expiredSubscriptions = await this.prisma.premiumSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    // Update expired subscriptions
    for (const subscription of expiredSubscriptions) {
      await this.prisma.$transaction(async (tx) => {
        await tx.premiumSubscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });

        await tx.user.update({
          where: { id: subscription.userId },
          data: {
            premium: false,
            premiumExpiresAt: null,
          },
        });
      });
    }

    return expiredSubscriptions.length;
  }
}
