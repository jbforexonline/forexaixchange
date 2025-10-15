import { IsEmail, IsString, IsOptional, ValidateIf, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address (required if phone not provided)',
    example: 'user@example.com',
    required: false,
  })
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'Please provide a valid email address or phone number' })
  email?: string;

  @ApiProperty({
    description: 'User phone number (required if email not provided)',
    example: '+1234567890',
    required: false,
  })
  @ValidateIf((o) => !o.email)
  @IsPhoneNumber(undefined, { message: 'Please provide a valid phone number or email address' })
  phone?: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  @IsString()
  password: string;
}
