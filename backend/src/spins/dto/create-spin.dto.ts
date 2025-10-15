import { IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BetType, VolatilityType, ColorType } from '@prisma/client';

export class CreateSpinDto {
  @ApiProperty({
    description: 'Bet amount (positive number)',
    example: 10,
    type: 'number',
  })
  @IsNumber({}, { message: 'betAmount must be a valid number' })
  @Min(0.01, { message: 'betAmount must be greater than 0' })
  @Type(() => Number)
  betAmount: number;

  @ApiProperty({
    description: 'Bet type',
    enum: BetType,
    example: BetType.BUY,
  })
  @IsEnum(BetType)
  betType: BetType;

  @ApiProperty({
    description: 'Volatility type',
    enum: VolatilityType,
    required: false,
    example: VolatilityType.HIGH,
  })
  @IsOptional()
  @IsEnum(VolatilityType)
  volatility?: VolatilityType;

  @ApiProperty({
    description: 'Color type',
    enum: ColorType,
    required: false,
    example: ColorType.RED,
  })
  @IsOptional()
  @IsEnum(ColorType)
  color?: ColorType;
}
