import { IsEnum, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BetMarket } from '@prisma/client';

export class PlaceBetDto {
  @ApiProperty({ enum: BetMarket })
  @IsEnum(BetMarket)
  market: BetMarket;

  @ApiProperty()
  @IsString()
  selection: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  amountUsd: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}