import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionStatus, Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AffiliateService } from '../affiliate/affiliate.service';

@Injectable()
export class PremiumService {
  constructor(
    private prisma: PrismaService,
    private affiliateService: AffiliateService,
  ) { }

  /**
   * Get all available premium plans
   */
  async getPlans() {
    try {
      const plans = await this.prisma.premiumPlan.findMany({
        where: { isActive: true },
        orderBy: { duration: 'asc' },
      });
      
      return plans;
    } catch (error) {
      console.error('Error fetching premium plans:', error);
      throw new InternalServerErrorException('Failed to fetch premium plans');
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string) {
    try {
      const plan = await this.prisma.premiumPlan.findUnique({
        where: { id: planId },
      });
      
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }
      
      return plan;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching plan:', error);
      throw new InternalServerErrorException('Failed to fetch plan');
    }
  }

  /**
   * Subscribe to a premium plan (requires wallet funds)
   */
  async subscribe(userId: string, planId: string) {
    try {
      console.log(`Processing subscription for user ${userId}, plan ${planId}`);
      
      // Use transaction with timeout for paid subscription
      return await this.prisma.$transactionWithTimeout(async (tx) => {
        // Get plan
        const plan = await tx.premiumPlan.findUnique({
          where: { id: planId },
        });

        if (!plan || !plan.isActive) {
          throw new NotFoundException('Plan not found or inactive');
        }

        // Get user with wallet
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { wallet: true },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        if (!user.wallet) {
          throw new BadRequestException('User wallet not found');
        }

        // Check if user already has an active subscription
        const existingSubscription = await tx.premiumSubscription.findFirst({
          where: {
            userId,
            status: SubscriptionStatus.ACTIVE,
            endDate: { gt: new Date() },
          },
        });

        if (existingSubscription) {
          throw new BadRequestException('User already has an active subscription');
        }

        // Check wallet balance
        if (user.wallet.available.lt(plan.price)) {
          throw new BadRequestException('Insufficient funds in wallet');
        }

        // Calculate end date
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.duration);

        console.log(`Creating subscription: end date ${endDate}, amount ${plan.price}`);

        // Create subscription
        const subscription = await tx.premiumSubscription.create({
          data: {
            userId,
            planId,
            startDate,
            endDate,
            amountPaid: plan.price,
            status: SubscriptionStatus.ACTIVE,
          },
          include: {
            plan: true,
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

        // Create transaction record - Use PREMIUM_SUBSCRIPTION which exists in your enum
        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.PREMIUM_SUBSCRIPTION,
            amount: plan.price,
            status: TransactionStatus.COMPLETED,
            description: `Premium subscription: ${plan.name} (${plan.duration} months)`,
          },
        });

        console.log(`Subscription created successfully: ${subscription.id}`);
        
        return subscription;
      });
    } catch (error) {
      console.error('Subscription error:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  /**
   * Simulate subscription for testing (no payment required)
   */
  async simulateSubscription(userId: string, planId: string) {
    try {
      console.log(`Simulating subscription for user ${userId}, plan ${planId}`);
      
      // Use quick transaction for simulation
      const subscription = await this.prisma.$quickTransaction(async (tx) => {
        // Get plan
        const plan = await tx.premiumPlan.findUnique({
          where: { id: planId },
        });

        if (!plan || !plan.isActive) {
          throw new NotFoundException('Plan not found or inactive');
        }

        // Check user exists
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        // Check if user already has an active subscription
        const existingSubscription = await tx.premiumSubscription.findFirst({
          where: {
            userId,
            status: SubscriptionStatus.ACTIVE,
            endDate: { gt: new Date() },
          },
        });

        if (existingSubscription) {
          throw new BadRequestException('User already has an active subscription');
        }

        // Calculate end date
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.duration);

        console.log(`Creating simulated subscription: end date ${endDate}`);

        // Create simulated subscription
        const subscription = await tx.premiumSubscription.create({
          data: {
            userId,
            planId,
            startDate,
            endDate,
            amountPaid: 0,
            isSimulated: true,
            status: SubscriptionStatus.ACTIVE,
          },
          include: {
            plan: true,
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

        // Create transaction record for simulation - Use PREMIUM_SUBSCRIPTION
        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.PREMIUM_SUBSCRIPTION,
            amount: 0,
            status: TransactionStatus.COMPLETED,
            description: `Simulated premium subscription: ${plan.name}`,
          },
        });

        console.log(`Simulated subscription created successfully: ${subscription.id}`);
        
        return subscription;
      });

      // Process affiliate commission asynchronously (don't block the response)
      this.processAffiliateCommissionAsync(userId, planId)
        .catch(err => console.error('Affiliate commission failed:', err));

      return subscription;
    } catch (error) {
      console.error('Simulate subscription error:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to simulate subscription');
    }
  }

  /**
   * Process affiliate commission asynchronously
   */
  private async processAffiliateCommissionAsync(userId: string, planId: string) {
    try {
      console.log(`Processing affiliate commission for user ${userId}`);
      
      // Get plan to get price
      const plan = await this.prisma.premiumPlan.findUnique({
        where: { id: planId },
      });
      
      if (!plan) {
        console.warn(`Plan ${planId} not found for affiliate commission`);
        return;
      }

      // Process affiliate commission
      await this.affiliateService.processAffiliateCommission(
        userId,
        plan.price,
      );
      
      console.log(`Affiliate commission processed for user ${userId}`);
    } catch (error) {
      console.error('Failed to process affiliate commission:', error);
      // Don't throw - affiliate commission should not fail the subscription
    }
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string) {
    try {
      const subscription = await this.prisma.premiumSubscription.findFirst({
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

      if (!subscription) {
        throw new NotFoundException('No active subscription found');
      }

      return subscription;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user subscription:', error);
      throw new InternalServerErrorException('Failed to fetch subscription');
    }
  }

  /**
   * Get all user subscriptions (including expired)
   */
  async getUserSubscriptions(userId: string) {
    try {
      const subscriptions = await this.prisma.premiumSubscription.findMany({
        where: {
          userId,
        },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscriptions;
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      throw new InternalServerErrorException('Failed to fetch subscriptions');
    }
  }

  /**
   * Check and update expired subscriptions
   */
  async checkExpiredSubscriptions() {
    try {
      const now = new Date();
      const expiredSubscriptions = await this.prisma.premiumSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            lt: now,
          },
        },
        include: {
          user: true,
        },
      });

      console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

      const results = [];
      
      for (const subscription of expiredSubscriptions) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Update subscription status
            await tx.premiumSubscription.update({
              where: { id: subscription.id },
              data: { status: SubscriptionStatus.EXPIRED },
            });

            // Update user premium status
            await tx.user.update({
              where: { id: subscription.userId },
              data: {
                premium: false,
                premiumExpiresAt: null,
              },
            });
          });
          
          results.push({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            status: 'expired',
          });
          
          console.log(`Subscription ${subscription.id} expired for user ${subscription.userId}`);
        } catch (error) {
          console.error(`Failed to expire subscription ${subscription.id}:`, error);
          results.push({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            status: 'error',
            error: error.message,
          });
        }
      }

      return {
        totalExpired: expiredSubscriptions.length,
        processed: results.filter(r => r.status === 'expired').length,
        failed: results.filter(r => r.status === 'error').length,
        results,
      };
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      throw new InternalServerErrorException('Failed to check expired subscriptions');
    }
  }

  /**
   * Cancel active subscription
   */
  async cancelSubscription(userId: string) {
    try {
      console.log(`Cancelling subscription for user ${userId}`);
      
      return await this.prisma.$transaction(async (tx) => {
        const subscription = await tx.premiumSubscription.findFirst({
          where: {
            userId,
            status: SubscriptionStatus.ACTIVE,
            endDate: { gt: new Date() },
          },
          include: {
            plan: true,
          },
        });

        if (!subscription) {
          throw new NotFoundException('No active subscription found');
        }

        // Calculate refund if applicable (only for real subscriptions)
        let refundAmount = new Decimal(0);
        const daysRemaining = Math.ceil((subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        if (!subscription.isSimulated && daysRemaining > 0 && subscription.amountPaid.gt(0)) {
          // Refund proportional to remaining days
          const totalDays = Math.ceil((subscription.endDate.getTime() - subscription.startDate.getTime()) / (1000 * 60 * 60 * 24));
          const refundPercentage = daysRemaining / totalDays;
          refundAmount = subscription.amountPaid.mul(refundPercentage);
          
          // Round to 2 decimal places
          refundAmount = new Decimal(refundAmount.toDecimalPlaces(2));
          
          // Add refund to user's wallet
          await tx.wallet.update({
            where: { userId },
            data: {
              available: {
                increment: refundAmount,
              },
            },
          });

          // Create refund transaction - Use REFUND type which exists
          await tx.transaction.create({
            data: {
              userId,
              type: TransactionType.REFUND,
              amount: refundAmount,
              status: TransactionStatus.COMPLETED,
              description: `Refund for cancelled subscription: ${subscription.plan.name}`,
            },
          });
        }

        // Update subscription status
        await tx.premiumSubscription.update({
          where: { id: subscription.id },
          data: { 
            status: SubscriptionStatus.CANCELLED,
          },
        });

        // Update user premium status
        await tx.user.update({
          where: { id: userId },
          data: {
            premium: false,
            premiumExpiresAt: null,
          },
        });

        // Create cancellation transaction
        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.PREMIUM_SUBSCRIPTION,
            amount: 0,
            status: TransactionStatus.COMPLETED,
            description: `Subscription cancelled: ${subscription.plan.name}`,
          },
        });

        console.log(`Subscription ${subscription.id} cancelled for user ${userId}, refund: ${refundAmount}`);

        return { 
          message: 'Subscription cancelled successfully',
          subscriptionId: subscription.id,
          refundAmount: refundAmount.toString(),
          isSimulated: subscription.isSimulated,
        };
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  /**
   * Upgrade or change subscription plan
   */
  async changeSubscription(userId: string, newPlanId: string) {
    try {
      console.log(`Changing subscription for user ${userId} to plan ${newPlanId}`);
      
      return await this.prisma.$transactionWithTimeout(async (tx) => {
        // Get new plan
        const newPlan = await tx.premiumPlan.findUnique({
          where: { id: newPlanId },
        });

        if (!newPlan || !newPlan.isActive) {
          throw new NotFoundException('New plan not found or inactive');
        }

        // Get current active subscription
        const currentSubscription = await tx.premiumSubscription.findFirst({
          where: {
            userId,
            status: SubscriptionStatus.ACTIVE,
            endDate: { gt: new Date() },
          },
          include: {
            plan: true,
          },
        });

        if (!currentSubscription) {
          throw new NotFoundException('No active subscription found');
        }

        // Calculate prorated credit for old plan
        const now = new Date();
        const daysUsed = Math.ceil((now.getTime() - currentSubscription.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDaysOld = Math.ceil((currentSubscription.endDate.getTime() - currentSubscription.startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let creditAmount = new Decimal(0);
        if (!currentSubscription.isSimulated && currentSubscription.amountPaid.gt(0)) {
          const remainingDays = totalDaysOld - daysUsed;
          const creditPercentage = remainingDays / totalDaysOld;
          creditAmount = currentSubscription.amountPaid.mul(creditPercentage);
          creditAmount = new Decimal(creditAmount.toDecimalPlaces(2));
        }

        // Calculate new end date (extend from now)
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + newPlan.duration);

        // Calculate additional payment needed
        const additionalPayment = newPlan.price.sub(creditAmount);
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { wallet: true },
        });

        if (!user || !user.wallet) {
          throw new NotFoundException('User or wallet not found');
        }

        // Check if additional payment is needed and user has funds
        if (additionalPayment.gt(0) && user.wallet.available.lt(additionalPayment)) {
          throw new BadRequestException('Insufficient funds for plan upgrade');
        }

        // Cancel old subscription
        await tx.premiumSubscription.update({
          where: { id: currentSubscription.id },
          data: { 
            status: SubscriptionStatus.CANCELLED,
          },
        });

        // Create new subscription
        const newSubscription = await tx.premiumSubscription.create({
          data: {
            userId,
            planId: newPlanId,
            startDate: now,
            endDate: newEndDate,
            amountPaid: additionalPayment.gt(0) ? additionalPayment : new Decimal(0),
            isSimulated: currentSubscription.isSimulated,
            status: SubscriptionStatus.ACTIVE,
          },
          include: {
            plan: true,
          },
        });

        // Update user premium status
        await tx.user.update({
          where: { id: userId },
          data: {
            premium: true,
            premiumExpiresAt: newEndDate,
          },
        });

        // Process payment if needed
        if (additionalPayment.gt(0)) {
          await tx.wallet.update({
            where: { userId },
            data: {
              available: {
                decrement: additionalPayment,
              },
            },
          });

          await tx.transaction.create({
            data: {
              userId,
              type: TransactionType.PREMIUM_SUBSCRIPTION,
              amount: additionalPayment,
              status: TransactionStatus.COMPLETED,
              description: `Plan upgrade from ${currentSubscription.plan.name} to ${newPlan.name}`,
            },
          });
        }

        // Create upgrade record
        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.PREMIUM_SUBSCRIPTION,
            amount: 0,
            status: TransactionStatus.COMPLETED,
            description: `Subscription changed from ${currentSubscription.plan.name} to ${newPlan.name}`,
          },
        });

        console.log(`Subscription changed successfully for user ${userId}`);

        return {
          message: 'Subscription changed successfully',
          oldSubscriptionId: currentSubscription.id,
          newSubscriptionId: newSubscription.id,
          creditApplied: creditAmount.toString(),
          additionalPaid: additionalPayment.gt(0) ? additionalPayment.toString() : '0',
          newEndDate,
        };
      });
    } catch (error) {
      console.error('Change subscription error:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to change subscription');
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        simulatedSubscriptions,
        totalRevenue,
        plansStats,
      ] = await Promise.all([
        this.prisma.premiumSubscription.count(),
        this.prisma.premiumSubscription.count({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endDate: { gt: new Date() },
          },
        }),
        this.prisma.premiumSubscription.count({
          where: { isSimulated: true },
        }),
        this.prisma.premiumSubscription.aggregate({
          _sum: { amountPaid: true },
        }),
        this.prisma.premiumPlan.findMany({
          include: {
            _count: {
              select: { subscriptions: true },
            },
          },
        }),
      ]);

      return {
        totalSubscriptions,
        activeSubscriptions,
        simulatedSubscriptions,
        totalRevenue: totalRevenue._sum.amountPaid || new Decimal(0),
        plans: plansStats.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          subscriptionCount: plan._count.subscriptions,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      throw new InternalServerErrorException('Failed to fetch subscription statistics');
    }
  }

  /**
   * Extend subscription (add more time)
   */
  async extendSubscription(userId: string, additionalMonths: number) {
    try {
      if (additionalMonths <= 0) {
        throw new BadRequestException('Additional months must be greater than 0');
      }

      return await this.prisma.$transaction(async (tx) => {
        const subscription = await tx.premiumSubscription.findFirst({
          where: {
            userId,
            status: SubscriptionStatus.ACTIVE,
            endDate: { gt: new Date() },
          },
          include: {
            plan: true,
          },
        });

        if (!subscription) {
          throw new NotFoundException('No active subscription found');
        }

        // Calculate extension price (prorated based on current plan)
        const dailyRate = subscription.plan.price.div(30); // Approximate daily rate
        const extensionPrice = dailyRate.mul(additionalMonths * 30);
        
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { wallet: true },
        });

        if (!user || !user.wallet) {
          throw new NotFoundException('User or wallet not found');
        }

        // Check wallet balance for real subscriptions
        if (!subscription.isSimulated && user.wallet.available.lt(extensionPrice)) {
          throw new BadRequestException('Insufficient funds for extension');
        }

        // Extend end date
        const newEndDate = new Date(subscription.endDate);
        newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);

        // Update subscription
        await tx.premiumSubscription.update({
          where: { id: subscription.id },
          data: {
            endDate: newEndDate,
            amountPaid: subscription.amountPaid.add(extensionPrice),
          },
        });

        // Update user premium status
        await tx.user.update({
          where: { id: userId },
          data: {
            premiumExpiresAt: newEndDate,
          },
        });

        // Process payment for real subscriptions
        if (!subscription.isSimulated) {
          await tx.wallet.update({
            where: { userId },
            data: {
              available: {
                decrement: extensionPrice,
              },
            },
          });

          await tx.transaction.create({
            data: {
              userId,
              type: TransactionType.PREMIUM_SUBSCRIPTION,
              amount: extensionPrice,
              status: TransactionStatus.COMPLETED,
              description: `Subscription extended by ${additionalMonths} months`,
            },
          });
        }

        return {
          message: 'Subscription extended successfully',
          subscriptionId: subscription.id,
          additionalMonths,
          newEndDate,
          extensionPrice: extensionPrice.toString(),
        };
      });
    } catch (error) {
      console.error('Extend subscription error:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to extend subscription');
    }
  }
}