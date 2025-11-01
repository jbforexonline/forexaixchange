// =============================================================================
// SUGGESTIONS SERVICE - Minority Rule Based Suggestions
// =============================================================================
// Path: backend/src/rounds/suggestions.service.ts
// Analyzes first 3 orders and suggests minority option
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BetMarket } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface SuggestionResult {
  market: BetMarket;
  suggestedSelection: string;
  reason: string;
  confidence: number; // 0-1
  currentTotals: {
    optionA: { label: string; amount: number };
    optionB: { label: string; amount: number };
  };
}

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get suggestions based on first 3 bets placed on current round
   */
  async getSuggestionsForRound(roundId: string): Promise<SuggestionResult[]> {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        bets: {
          where: {
            status: 'ACCEPTED',
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 3, // First 3 bets only
        },
      },
    });

    if (!round) {
      throw new Error('Round not found');
    }

    if (round.bets.length < 3) {
      // Not enough bets yet, return empty suggestions
      return [];
    }

    // Calculate totals from first 3 bets only
    const totals = {
      outer: { buy: new Decimal(0), sell: new Decimal(0) },
      middle: { blue: new Decimal(0), red: new Decimal(0) },
      inner: { highVol: new Decimal(0), lowVol: new Decimal(0) },
      global: { indecision: new Decimal(0) },
    };

    for (const bet of round.bets) {
      const amount = bet.amountUsd;
      switch (bet.market) {
        case BetMarket.OUTER:
          if (bet.selection === 'BUY') totals.outer.buy = totals.outer.buy.add(amount);
          else if (bet.selection === 'SELL') totals.outer.sell = totals.outer.sell.add(amount);
          break;
        case BetMarket.MIDDLE:
          if (bet.selection === 'BLUE') totals.middle.blue = totals.middle.blue.add(amount);
          else if (bet.selection === 'RED') totals.middle.red = totals.middle.red.add(amount);
          break;
        case BetMarket.INNER:
          if (bet.selection === 'HIGH_VOL') totals.inner.highVol = totals.inner.highVol.add(amount);
          else if (bet.selection === 'LOW_VOL') totals.inner.lowVol = totals.inner.lowVol.add(amount);
          break;
        case BetMarket.GLOBAL:
          if (bet.selection === 'INDECISION') totals.global.indecision = totals.global.indecision.add(amount);
          break;
      }
    }

    const suggestions: SuggestionResult[] = [];

    // OUTER layer suggestion (BUY vs SELL)
    if (totals.outer.buy.gt(0) || totals.outer.sell.gt(0)) {
      const suggestion = this.generateSuggestion(
        BetMarket.OUTER,
        totals.outer.buy,
        totals.outer.sell,
        'BUY',
        'SELL',
      );
      if (suggestion) suggestions.push(suggestion);
    }

    // MIDDLE layer suggestion (BLUE vs RED)
    if (totals.middle.blue.gt(0) || totals.middle.red.gt(0)) {
      const suggestion = this.generateSuggestion(
        BetMarket.MIDDLE,
        totals.middle.blue,
        totals.middle.red,
        'BLUE',
        'RED',
      );
      if (suggestion) suggestions.push(suggestion);
    }

    // INNER layer suggestion (HIGH_VOL vs LOW_VOL)
    if (totals.inner.highVol.gt(0) || totals.inner.lowVol.gt(0)) {
      const suggestion = this.generateSuggestion(
        BetMarket.INNER,
        totals.inner.highVol,
        totals.inner.lowVol,
        'HIGH_VOL',
        'LOW_VOL',
      );
      if (suggestion) suggestions.push(suggestion);
    }

    return suggestions;
  }

  /**
   * Generate suggestion for a layer based on minority rule
   */
  private generateSuggestion(
    market: BetMarket,
    optionA: Decimal,
    optionB: Decimal,
    labelA: string,
    labelB: string,
  ): SuggestionResult | null {
    // Minority rule: suggest the option with less money
    const isAMinority = optionA.lt(optionB);
    const suggestedSelection = isAMinority ? labelA : labelB;
    const suggestedTotal = isAMinority ? optionA : optionB;
    const otherTotal = isAMinority ? optionB : optionA;

    // Calculate confidence based on difference
    const total = optionA.add(optionB);
    const difference = otherTotal.sub(suggestedTotal);
    const confidence = total.gt(0)
      ? Math.min(1, difference.div(total).toNumber() + 0.3) // At least 30% confidence
      : 0.5;

    // Generate reason
    const reason = this.generateReason(
      suggestedSelection,
      suggestedTotal,
      otherTotal,
      difference,
    );

    return {
      market,
      suggestedSelection,
      reason,
      confidence,
      currentTotals: {
        optionA: {
          label: labelA,
          amount: optionA.toNumber(),
        },
        optionB: {
          label: labelB,
          amount: optionB.toNumber(),
        },
      },
    };
  }

  /**
   * Generate human-readable reason for suggestion
   */
  private generateReason(
    suggested: string,
    suggestedTotal: Decimal,
    otherTotal: Decimal,
    difference: Decimal,
  ): string {
    if (suggestedTotal.eq(0)) {
      return `${suggested} has no bets yet. Based on minority rule, this could be a good opportunity.`;
    }

    const diffPercentage = otherTotal.gt(0)
      ? difference.div(otherTotal).mul(100).toFixed(1)
      : '100';

    return `${suggested} has $${suggestedTotal.toFixed(2)} while the other side has $${otherTotal.toFixed(2)}. ` +
      `Following the minority rule (winner = less USD), ${suggested} is ${diffPercentage}% behind, making it the suggested pick.`;
  }

  /**
   * Get suggestions for current active round
   */
  async getCurrentRoundSuggestions() {
    const currentRound = await this.prisma.round.findFirst({
      where: {
        state: 'OPEN',
      },
      orderBy: {
        roundNumber: 'desc',
      },
    });

    if (!currentRound) {
      return [];
    }

    return this.getSuggestionsForRound(currentRound.id);
  }
}

