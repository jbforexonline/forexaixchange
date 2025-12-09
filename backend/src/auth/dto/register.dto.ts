import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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
    description: 'User password (minimum 8 characters, must contain uppercase, lowercase, and number)',
    example: 'Password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'johndoe',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'Referral code from referring user',
    example: 'abc123def456',
    required: false,
  })
  @IsOptional()
  @IsString()
  referredBy?: string;
}
