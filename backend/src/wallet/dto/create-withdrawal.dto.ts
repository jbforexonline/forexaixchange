import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'Withdrawal amount (positive number)',
    example: 50,
    type: 'number',
  })
  @IsNumber({}, { message: 'amount must be a valid number' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    example: 'MoMo',
  })
  @IsString()
  method: string;

  @ApiProperty({
    description: 'Transaction reference',
    example: 'TXN123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
