import { IsEmail, IsString, MinLength, IsOptional, ValidateIf, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address (optional if phone is provided)',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiProperty({
    description: 'User phone number (optional if email is provided)',
    example: '+250788781558',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (!value) return value;
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    return cleaned;
  })
  phone?: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, must contain uppercase, lowercase, and number)',
    example: 'Password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  })
  password: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'johndoe',
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must be at most 20 characters long' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
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

  @ApiPropertyOptional({
    description: 'Referral code from referring user',
    example: 'abc123def456',
    required: false,
  })
  @IsOptional()
  @IsString()
  referredBy?: string;
}