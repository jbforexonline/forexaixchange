import { IsEnum, IsNumber, IsString, IsOptional, Min } from 'class-validator';
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
}