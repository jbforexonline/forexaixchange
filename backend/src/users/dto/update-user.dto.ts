import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, KycStatus } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  username?: string;

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
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'Is user active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Is user banned',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;

  @ApiProperty({
    description: 'Is user verified',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({
    description: 'Has verification badge',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  verificationBadge?: boolean;

  @ApiProperty({
    description: 'Is premium user',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  premium?: boolean;

  @ApiProperty({
    description: 'KYC status',
    enum: KycStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;
}
