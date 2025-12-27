/**
 * Mock Rounds Service - Development Fallback
 * 
 * Use this when database is unavailable
 * Generates realistic round data for frontend testing
 */

import { Injectable, Logger } from '@nestjs/common';
import { RoundState } from '@prisma/client';

interface MockRound {
  id: string;
  roundNumber: number;
  state: RoundState;
  openedAt: Date;
  freezeAt: Date;
  settleAt: Date;
  roundDuration: number;
  freezeOffset: number;
  artifact: {
    commitHash: string;
  };
  _count: {
    bets: number;
  };
  // Winner fields (optional, only present when state === 'SETTLED')
  outerWinner?: string | null;
  middleWinner?: string | null;
  innerWinner?: string | null;
  indecisionTriggered?: boolean;
  outerTied?: boolean;
  middleTied?: boolean;
  innerTied?: boolean;
}

@Injectable()
export class MockRoundsService {
  private readonly logger = new Logger(MockRoundsService.name);
  private currentRoundNumber = 1000;
  private roundStartTime = new Date();

  constructor() {
    this.logger.warn('🚨 MockRoundsService initialized - Database unavailable');
  }

  /**
   * Generate a mock current round
   */
  getCurrentRound(): MockRound {
    const now = new Date();
    const roundDuration = 60; // 60 seconds for testing
    const freezeOffset = 5; // Freeze 5 seconds before end

    // Calculate if we're in open or frozen state
    const timeSinceStart = (now.getTime() - this.roundStartTime.getTime()) / 1000;
    const currentRoundProgress = timeSinceStart % roundDuration;
    const isFrozen = currentRoundProgress >= roundDuration - freezeOffset;

    // Generate new round if we've passed the duration
    if (timeSinceStart >= roundDuration) {
      this.roundStartTime = new Date();
      this.currentRoundNumber += 1;
    }

    const openedAt = new Date(this.roundStartTime);
    const freezeAt = new Date(openedAt.getTime() + (roundDuration - freezeOffset) * 1000);
    const settleAt = new Date(openedAt.getTime() + roundDuration * 1000);

    return {
      id: `mock-round-${this.currentRoundNumber}`,
      roundNumber: this.currentRoundNumber,
      state: isFrozen ? RoundState.FROZEN : RoundState.OPEN,
      openedAt,
      freezeAt,
      settleAt,
      roundDuration,
      freezeOffset,
      artifact: {
        commitHash: this.generateHash(),
      },
      _count: {
        bets: Math.floor(Math.random() * 50) + 10, // 10-60 bets
      },
      // Winner fields (undefined for mock rounds since they're not settled)
      outerWinner: undefined,
      middleWinner: undefined,
      innerWinner: undefined,
      indecisionTriggered: false,
      outerTied: false,
      middleTied: false,
      innerTied: false,
    };
  }

  /**
   * Generate mock totals
   */
  getRoundTotals(roundId: string) {
    const totalBets = Math.floor(Math.random() * 10000) + 1000;
    const distribution = {
      outer: {
        BUY: Math.floor(totalBets * 0.35),
        SELL: Math.floor(totalBets * 0.25),
      },
      middle: {
        BLUE: Math.floor(totalBets * 0.2),
        RED: Math.floor(totalBets * 0.2),
      },
      inner: {
        HIGH_VOL: Math.floor(totalBets * 0.15),
        LOW_VOL: Math.floor(totalBets * 0.15),
      },
      global: {
        INDECISION: Math.floor(totalBets * 0.1),
      },
    };

    return {
      roundId,
      totals: distribution,
    };
  }

  /**
   * Generate mock bets for current round
   */
  getCurrentRoundBets() {
    const round = this.getCurrentRound();
    const betsCount = Math.floor(Math.random() * 5) + 1; // 1-5 bets

    return Array.from({ length: betsCount }, (_, i) => ({
      id: `mock-bet-${round.roundNumber}-${i}`,
      roundId: round.id,
      market: ['OUTER', 'MIDDLE', 'INNER', 'GLOBAL'][Math.floor(Math.random() * 4)] as any,
      selection: ['BUY', 'SELL', 'BLUE', 'RED', 'HIGH_VOL', 'LOW_VOL', 'INDECISION'][
        Math.floor(Math.random() * 7)
      ] as any,
      amountUsd: Math.floor(Math.random() * 100) + 10,
      status: 'ACCEPTED',
      isWinner: null,
      payoutAmount: null,
      profitAmount: null,
      createdAt: new Date(),
    }));
  }

  private generateHash(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
