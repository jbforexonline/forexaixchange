import { IsNumber, IsString, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FeePayer } from '@prisma/client';

export class CreateTransferDto {
  @ApiProperty({
    description: 'Recipient username, ID, or email (for contact purposes)',
    example: 'johndoe',
  })
  @IsString()
  recipient: string;

  @ApiProperty({
    description: 'Transfer amount (positive number)',
    example: 25,
    type: 'number',
  })
  @IsNumber({}, { message: 'amount must be a valid number' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Who pays the transfer fee',
    enum: FeePayer,
    example: FeePayer.SENDER,
  })
  @IsEnum(FeePayer)
  feePayer: FeePayer;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicate transfers',
    example: 'transfer-123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
