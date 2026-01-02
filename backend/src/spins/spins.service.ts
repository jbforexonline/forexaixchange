import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BetType, VolatilityType, ColorType, SpinOutcome } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SpinsService {
  constructor(private prisma: PrismaService) {}

  async createSpin(userId: string, betAmount: Decimal, betType: BetType, volatility?: VolatilityType, color?: ColorType, isDemo: boolean = false) {
    return this.prisma.$transaction(async (tx) => {
      // Get user and wallet
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user || !user.wallet) {
        throw new BadRequestException('User or wallet not found');
      }

      const availableBalance = isDemo ? user.wallet.demoAvailable : user.wallet.available;

      if (availableBalance.lt(betAmount)) {
        throw new BadRequestException(`Insufficient ${isDemo ? 'demo ' : ''}funds`);
      }

      // Get current round number
      const lastSpin = await tx.spin.findFirst({
        orderBy: { roundNumber: 'desc' },
      });
      const roundNumber = (lastSpin?.roundNumber || 0) + 1;

      // Generate spin outcome (stubbed logic)
      const outcome = this.generateSpinOutcome(betType, volatility, color);
      const isWin = outcome === SpinOutcome.WIN;
      const winAmount = isWin ? this.calculateWinAmount(betAmount, betType) : new Decimal(0);

      // Create spin record
      const spin = await tx.spin.create({
        data: {
          userId,
          betAmount,
          betType,
          volatility,
          color,
          outcome,
          winAmount: isWin ? winAmount : null,
          isWin,
          roundNumber,
          countdownTime: user.premium ? 300 : 1200, // 5 min for premium, 20 min for free
          isPremiumUser: user.premium,
          autoSpin: false, // TODO: Implement auto-spin logic
          isDemo,
        },
      });

      // Update wallet
      const walletUpdateData: any = {};
      
      if (isDemo) {
        walletUpdateData.demoAvailable = { decrement: betAmount };
        walletUpdateData.demoHeld = { increment: betAmount };

        if (isWin) {
          walletUpdateData.demoAvailable.increment = winAmount;
          walletUpdateData.demoTotalWon = { increment: winAmount };
        } else {
          walletUpdateData.demoTotalLost = { increment: betAmount };
        }
      } else {
        walletUpdateData.available = { decrement: betAmount };
        walletUpdateData.held = { increment: betAmount };

        if (isWin) {
          walletUpdateData.available.increment = winAmount;
          walletUpdateData.totalWon = { increment: winAmount };
        } else {
          walletUpdateData.totalLost = { increment: betAmount };
        }
      }

      await tx.wallet.update({
        where: { userId },
        data: walletUpdateData,
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: isWin ? 'SPIN_WIN' : 'SPIN_LOSS',
          amount: isWin ? winAmount : betAmount,
          status: 'COMPLETED',
          description: `Spin ${isWin ? 'win' : 'loss'} - ${betType}`,
          isDemo,
        },
      });

      return {
        spin,
        outcome,
        isWin,
        winAmount: isWin ? winAmount : null,
        newBalance: isDemo 
          ? user.wallet.demoAvailable.sub(betAmount).add(isWin ? winAmount : 0)
          : user.wallet.available.sub(betAmount).add(isWin ? winAmount : 0),
      };
    });
  }

  async getSpinHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [spins, total] = await Promise.all([
      this.prisma.spin.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.spin.count({ where: { userId } }),
    ]);

    return {
      data: spins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSpinStats(userId: string) {
    const [totalSpins, totalWins, totalLosses, totalWagered, totalWon] = await Promise.all([
      this.prisma.spin.count({ where: { userId } }),
      this.prisma.spin.count({ where: { userId, isWin: true } }),
      this.prisma.spin.count({ where: { userId, isWin: false } }),
      this.prisma.spin.aggregate({
        where: { userId },
        _sum: { betAmount: true },
      }),
      this.prisma.spin.aggregate({
        where: { userId, isWin: true },
        _sum: { winAmount: true },
      }),
    ]);

    const winRate = totalSpins > 0 ? (totalWins / totalSpins) * 100 : 0;
    const profitLoss = (totalWon._sum.winAmount || new Decimal(0)).sub(totalWagered._sum.betAmount || new Decimal(0));

    return {
      totalSpins,
      totalWins,
      totalLosses,
      winRate: Math.round(winRate * 100) / 100,
      totalWagered: totalWagered._sum.betAmount || 0,
      totalWon: totalWon._sum.winAmount || 0,
      profitLoss: profitLoss.toNumber(),
    };
  }

  async getCommunitySentiment() {
    const sentimentCounts = await this.prisma.communitySentiment.groupBy({
      by: ['sentiment'],
      _count: {
        sentiment: true,
      },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    const total = sentimentCounts.reduce((sum, item) => sum + item._count.sentiment, 0);
    
    return sentimentCounts.map(item => ({
      sentiment: item.sentiment,
      count: item._count.sentiment,
      percentage: total > 0 ? Math.round((item._count.sentiment / total) * 100) : 0,
    }));
  }

  async getRecentResults(limit = 10) {
    return this.prisma.spin.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });
  }

  private generateSpinOutcome(betType: BetType, volatility?: VolatilityType, color?: ColorType): SpinOutcome {
    // Stubbed logic - in real implementation, this would use market data
    const random = Math.random();
    
    // Base win probability
    let winProbability = 0.45; // 45% base win rate
    
    // Adjust based on bet type
    switch (betType) {
      case BetType.BUY:
        winProbability = 0.48;
        break;
      case BetType.SELL:
        winProbability = 0.48;
        break;
      case BetType.HIGH_VOLATILE:
        winProbability = 0.42;
        break;
      case BetType.LOW_VOLATILE:
        winProbability = 0.52;
        break;
      case BetType.BLUE:
        winProbability = 0.49;
        break;
      case BetType.RED:
        winProbability = 0.49;
        break;
      case BetType.INDECISION:
        winProbability = 0.30;
        break;
    }

    return random < winProbability ? SpinOutcome.WIN : SpinOutcome.LOSS;
  }

  private calculateWinAmount(betAmount: Decimal, betType: BetType): Decimal {
    // Stubbed payout calculation
    let multiplier = 1.8; // 80% profit

    switch (betType) {
      case BetType.HIGH_VOLATILE:
        multiplier = 2.2;
        break;
      case BetType.LOW_VOLATILE:
        multiplier = 1.6;
        break;
      case BetType.INDECISION:
        multiplier = 3.0;
        break;
    }

    return betAmount.mul(multiplier);
  }
}
