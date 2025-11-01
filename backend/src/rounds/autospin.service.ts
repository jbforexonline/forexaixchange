// =============================================================================
// AUTO-SPIN SERVICE - Auto-Press Orders for Premium Users
// =============================================================================
// Path: backend/src/rounds/autospin.service.ts
// Implements: Up to 50 future spins for premium users
// =============================================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BetMarket, AutoSpinStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateAutoSpinDto {
  market: BetMarket;
  selection: string;
  amountUsd: number;
  roundsRemaining: number; // Number of rounds to execute for
  targetRoundNumber?: number; // Optional: specific round
  expiresAt?: Date; // Optional expiration
}

@Injectable()
export class AutoSpinService {
  private readonly logger = new Logger(AutoSpinService.name);
  private readonly MAX_AUTO_SPIN_ORDERS = 50;

  constructor(private prisma: PrismaService) {}

  /**
   * Create an auto-spin order (Premium only)
   */
  async createAutoSpinOrder(userId: string, dto: CreateAutoSpinDto) {
    // Check premium status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('User or wallet not found');
    }

    const isPremium =
      user.premium &&
      (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) >= new Date());

    if (!isPremium) {
      throw new ForbiddenException(
        'Auto-spin orders are available to premium users only',
      );
    }

    // Check active order limit
    const activeOrders = await this.prisma.autoSpinOrder.count({
      where: {
        userId,
        isActive: true,
        status: {
          in: [AutoSpinStatus.PENDING, AutoSpinStatus.ACTIVE],
        },
      },
    });

    if (activeOrders >= this.MAX_AUTO_SPIN_ORDERS) {
      throw new BadRequestException(
        `Maximum ${this.MAX_AUTO_SPIN_ORDERS} active auto-spin orders allowed`,
      );
    }

    // Validate bet amount
    const amount = new Decimal(dto.amountUsd);
    const minBet = new Decimal(1);
    const maxBet = new Decimal(200); // Premium limit

    if (amount.lt(minBet) || amount.gt(maxBet)) {
      throw new BadRequestException(
        `Amount must be between $${minBet.toString()} and $${maxBet.toString()}`,
      );
    }

    // Validate rounds
    if (dto.roundsRemaining < 1 || dto.roundsRemaining > 50) {
      throw new BadRequestException(
        'Rounds remaining must be between 1 and 50',
      );
    }

    return this.prisma.autoSpinOrder.create({
      data: {
        userId,
        market: dto.market,
        selection: dto.selection,
        amountUsd: amount,
        roundsRemaining: dto.roundsRemaining,
        targetRoundNumber: dto.targetRoundNumber,
        expiresAt: dto.expiresAt,
        status: AutoSpinStatus.PENDING,
        executedForRounds: [],
      },
    });
  }

  /**
   * Get user's auto-spin orders
   */
  async getUserAutoSpinOrders(userId: string) {
    return this.prisma.autoSpinOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel an auto-spin order (Premium only)
   */
  async cancelAutoSpinOrder(userId: string, orderId: string) {
    const order = await this.prisma.autoSpinOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Auto-spin order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this order');
    }

    if (order.status === AutoSpinStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed order');
    }

    if (order.status === AutoSpinStatus.CANCELLED) {
      throw new BadRequestException('Order already cancelled');
    }

    return this.prisma.autoSpinOrder.update({
      where: { id: orderId },
      data: {
        status: AutoSpinStatus.CANCELLED,
        isActive: false,
      },
    });
  }

  /**
   * Process auto-spin orders for a new round (called by scheduler)
   */
  async processAutoSpinOrdersForRound(roundId: string, roundNumber: number) {
    const activeOrders = await this.prisma.autoSpinOrder.findMany({
      where: {
        isActive: true,
        status: {
          in: [AutoSpinStatus.PENDING, AutoSpinStatus.ACTIVE],
        },
      },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    const processed = [];
    for (const order of activeOrders) {
      try {
        // Check expiration
        if (order.expiresAt && new Date(order.expiresAt) < new Date()) {
          await this.prisma.autoSpinOrder.update({
            where: { id: order.id },
            data: {
              status: AutoSpinStatus.EXPIRED,
              isActive: false,
            },
          });
          continue;
        }

        // Check if target round
        if (
          order.targetRoundNumber !== null &&
          order.targetRoundNumber !== roundNumber
        ) {
          continue;
        }

        // Check rounds remaining
        if (order.roundsRemaining <= 0) {
          await this.prisma.autoSpinOrder.update({
            where: { id: order.id },
            data: {
              status: AutoSpinStatus.COMPLETED,
              isActive: false,
            },
          });
          continue;
        }

        // Execute bet via BetsService (will be injected)
        // This is handled by the rounds scheduler that calls placeBet
        const executedForRounds = (order.executedForRounds as number[]) || [];
        executedForRounds.push(roundNumber);

        await this.prisma.autoSpinOrder.update({
          where: { id: order.id },
          data: {
            status: AutoSpinStatus.ACTIVE,
            roundsExecuted: order.roundsExecuted + 1,
            roundsRemaining: order.roundsRemaining - 1,
            executedForRounds,
            isActive: order.roundsRemaining > 1,
          },
        });

        if (order.roundsRemaining <= 1) {
          await this.prisma.autoSpinOrder.update({
            where: { id: order.id },
            data: {
              status: AutoSpinStatus.COMPLETED,
              isActive: false,
            },
          });
        }

        processed.push({
          orderId: order.id,
          userId: order.userId,
          roundNumber,
          market: order.market,
          selection: order.selection,
          amountUsd: order.amountUsd,
        });
      } catch (error) {
        this.logger.error(
          `Failed to process auto-spin order ${order.id}:`,
          error,
        );
      }
    }

    return processed;
  }

  /**
   * Get active auto-spin orders count for user
   */
  async getActiveOrdersCount(userId: string): Promise<number> {
    return this.prisma.autoSpinOrder.count({
      where: {
        userId,
        isActive: true,
        status: {
          in: [AutoSpinStatus.PENDING, AutoSpinStatus.ACTIVE],
        },
      },
    });
  }
}

