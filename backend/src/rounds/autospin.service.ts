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
  targetRoundNumber?: number; // Optional: specific round (auto-bet scheduling)
  expiresAt?: Date; // Optional expiration (auto-bet scheduling: up to 2 hours ahead)
  scheduledFor?: Date; // Optional: schedule bet for specific time (auto-bet: up to 2 hours ahead)
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

    // Auto-bet scheduling validation (Premium feature: schedule up to 2 hours or 24 rounds ahead)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours in ms

    // Validate targetRoundNumber (auto-bet: up to 24 rounds ahead for 5-min intervals)
    if (dto.targetRoundNumber !== undefined && dto.targetRoundNumber !== null) {
      const currentRound = await this.getCurrentRoundNumber();
      const roundsAhead = dto.targetRoundNumber - currentRound;
      
      if (roundsAhead < 0) {
        throw new BadRequestException('Target round number must be in the future');
      }
      
      if (roundsAhead > 24) {
        throw new BadRequestException(
          'Auto-bet scheduling: Cannot schedule more than 24 rounds ahead (2 hours at 5-min interval)'
        );
      }
    }

    // Validate expiresAt (auto-bet: up to 2 hours ahead)
    if (dto.expiresAt) {
      if (dto.expiresAt < now) {
        throw new BadRequestException('Expiration time must be in the future');
      }
      
      if (dto.expiresAt > twoHoursFromNow) {
        throw new BadRequestException(
          'Auto-bet scheduling: Cannot schedule more than 2 hours ahead'
        );
      }
    }

    // Validate scheduledFor (auto-bet: up to 2 hours ahead)
    if (dto.scheduledFor) {
      if (dto.scheduledFor < now) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
      
      if (dto.scheduledFor > twoHoursFromNow) {
        throw new BadRequestException(
          'Auto-bet scheduling: Cannot schedule more than 2 hours ahead'
        );
      }
      
      // If scheduledFor is provided, set expiresAt to scheduledFor + buffer
      dto.expiresAt = dto.scheduledFor;
    }

    return this.prisma.autoSpinOrder.create({
      data: {
        userId,
        market: dto.market,
        selection: dto.selection,
        amountUsd: amount,
        roundsRemaining: dto.roundsRemaining,
        targetRoundNumber: dto.targetRoundNumber,
        expiresAt: dto.expiresAt || dto.scheduledFor,
        status: AutoSpinStatus.PENDING,
        executedForRounds: [],
      },
    });
  }

  /**
   * Get current round number for validation
   */
  private async getCurrentRoundNumber(): Promise<number> {
    const lastRound = await this.prisma.round.findFirst({
      orderBy: { roundNumber: 'desc' },
      select: { roundNumber: true },
    });
    return lastRound?.roundNumber || 0;
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
   * Handles both auto-spin (rounds remaining) and auto-bet scheduling:
   * - Round-based: targetRoundNumber matches current round
   * - Time-based: expiresAt (scheduledFor) time has arrived
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
    const now = new Date();
    
    for (const order of activeOrders) {
      try {
        // Check if target round (round-based auto-bet scheduling)
        // If targetRoundNumber is set and doesn't match, skip this round
        if (
          order.targetRoundNumber !== null &&
          order.targetRoundNumber !== roundNumber
        ) {
          continue;
        }
        
        // For time-based scheduling: Check if scheduled time has arrived
        // If expiresAt is set (for scheduledFor), check if time has arrived
        if (order.expiresAt) {
          const scheduledTime = new Date(order.expiresAt);
          
          // If scheduled time is in the future, skip this round
          if (scheduledTime > now) {
            continue; // Scheduled time hasn't arrived yet
          }
          
          // If scheduled time has passed and no targetRoundNumber, 
          // this is an expired order (should have executed already)
          if (scheduledTime < now && order.targetRoundNumber === null && order.roundsRemaining <= 1) {
            await this.prisma.autoSpinOrder.update({
              where: { id: order.id },
              data: {
                status: AutoSpinStatus.EXPIRED,
                isActive: false,
              },
            });
            continue;
          }
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

