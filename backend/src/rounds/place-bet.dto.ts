// =============================================================================
// PLACE BET DTO - Validation for Bet Placement
// =============================================================================
// Path: backend/src/rounds/dto/place-bet.dto.ts
// =============================================================================

import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BetMarket } from '@prisma/client';
import { Type } from 'class-transformer';

export class PlaceBetDto {
  @ApiProperty({
    description: 'Market to bet on',
    enum: BetMarket,
    example: 'OUTER',
    enumName: 'BetMarket',
  })
  @IsEnum(BetMarket, {
    message: 'Market must be one of: OUTER, MIDDLE, INNER, GLOBAL',
  })
  market: BetMarket;

  @ApiProperty({
    description: 'Selection within the market',
    example: 'BUY',
    enum: [
      'BUY',
      'SELL',
      'BLUE',
      'RED',
      'HIGH_VOL',
      'LOW_VOL',
      'INDECISION',
    ],
  })
  @IsString()
  @IsIn(
    ['BUY', 'SELL', 'BLUE', 'RED', 'HIGH_VOL', 'LOW_VOL', 'INDECISION'],
    {
      message:
        'Selection must be one of: BUY, SELL, BLUE, RED, HIGH_VOL, LOW_VOL, INDECISION',
    },
  )
  selection: string;

  @ApiProperty({
    description: 'Bet amount in USD (minimum $1)',
    example: 10,
    minimum: 1,
    type: 'number',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @Min(1, { message: 'Minimum bet amount is $1' })
  amountUsd: number;

  @ApiProperty({
    description: 'Optional idempotency key to prevent duplicate bets',
    example: 'user123-round456-1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
