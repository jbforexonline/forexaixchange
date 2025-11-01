import { IsNumber, IsString, IsEnum, Min } from 'class-validator';
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
}
