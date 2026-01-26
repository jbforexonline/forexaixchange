import { IsEnum, IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BetMarket } from '@prisma/client';

export class PlaceBetDto {
  @ApiProperty({ enum: BetMarket, description: 'Market type: OUTER, MIDDLE, INNER, or GLOBAL' })
  @Transform(({ value }) => value?.toUpperCase?.() || value)
  @IsEnum(BetMarket, { message: 'market must be one of: OUTER, MIDDLE, INNER, GLOBAL' })
  market: BetMarket;

  @ApiProperty({ description: 'Selection within the market (e.g., BUY, SELL, BLUE, RED, HIGH_VOL, LOW_VOL, INDECISION)' })
  @Transform(({ value }) => value?.toUpperCase?.() || value)
  @IsString()
  selection: string;

  @ApiProperty({ minimum: 1, description: 'Bet amount in USD' })
  @IsNumber()
  @Min(1, { message: 'Minimum bet amount is $1' })
  amountUsd: number;

  @ApiProperty({ required: false, description: 'Unique key to prevent duplicate bets' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty({ required: false, description: 'Whether this is a demo bet', default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @ApiProperty({ 
    required: false, 
    description: 'User\'s chosen round duration in minutes (5, 10, or 20)', 
    default: 20,
    enum: [5, 10, 20]
  })
  @IsOptional()
  @IsNumber()
  @Min(5, { message: 'Round duration must be 5, 10, or 20 minutes' })
  userRoundDuration?: number;
}