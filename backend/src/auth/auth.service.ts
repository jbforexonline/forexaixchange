import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      console.log('🔍 Registration attempt:', { email: registerDto.email, username: registerDto.username });
      
      const { email, phone, password, username, firstName, lastName, referredBy } = registerDto;

      // Validate that either email or phone is provided
      if (!email && !phone) {
        throw new ConflictException('Either email or phone number is required');
      }

      console.log('✅ Validation passed - checking existing user...');

      // Check if user already exists
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
            { username },
          ],
        },
      });

      if (existingUser) {
        console.log('❌ User already exists:', existingUser.email || existingUser.phone);
        throw new ConflictException('User with this email, phone, or username already exists');
      }

      console.log('✅ No existing user found - creating user...');

      // Validate referral code if provided
      let validReferredBy = null;
      if (referredBy) {
        const referringUser = await this.prisma.user.findFirst({
          where: { affiliateCode: referredBy },
        });
        
        if (referringUser) {
          validReferredBy = referringUser.id;
          console.log('✅ Valid referral code found:', referringUser.username);
        } else {
          console.log('⚠️ Invalid referral code provided:', referredBy);
        }
      }

      // Create user with wallet (NO PASSWORD HASHING)
      const user = await this.prisma.user.create({
        data: {
          email,
          phone,
          password: password || 'nopass',
          username,
          firstName,
          lastName,
          referredBy: validReferredBy,
          wallet: {
            create: {
              available: 0,
              held: 0,
            },
          },
        },
        include: {
          wallet: true,
        },
      });

      console.log('✅ User created successfully:', user.id);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token: this.generateToken(user.id, user.role),
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, phone, password } = loginDto;

    // Validate that either email or phone is provided
    if (!email && !phone) {
      throw new UnauthorizedException('Either email or phone number is required');
    }

    // Find user by email or phone (NO PASSWORD VALIDATION)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive || user.isBanned) {
      throw new UnauthorizedException('Account is inactive or banned');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: this.generateToken(user.id, user.role),
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });

    if (!user || !user.isActive || user.isBanned) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  generateToken(userId: string, role: string) {
    return this.jwtService.sign({
      sub: userId,
      role,
    });
  }

  async hashPassword(password: string): Promise<string> {
    return password; // NO HASHING
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return password === hashedPassword; // DIRECT COMPARISON
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email, phone } = forgotPasswordDto;

    // Validate that either email or phone is provided
    if (!email && !phone) {
      throw new BadRequestException('Either email or phone number is required');
    }

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found with the provided email or phone number');
    }

    if (!user.isActive || user.isBanned) {
      throw new BadRequestException('Account is inactive or banned');
    }

    // NO OTP SENT - just return success message
    const identifier = email || phone!;
    const isEmail = !!email;

    return {
      message: `Password reset requested for ${isEmail ? 'email' : 'phone number'}`,
      identifier: isEmail ? email : phone?.replace(/(\d{3})(\d{3})(\d{4})/, '$1***$3'), // Mask phone number
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, phone, otp, newPassword } = resetPasswordDto;

    // Validate that either email or phone is provided
    if (!email && !phone) {
      throw new BadRequestException('Either email or phone number is required');
    }

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found with the provided email or phone number');
    }

    if (!user.isActive || user.isBanned) {
      throw new BadRequestException('Account is inactive or banned');
    }

    // NO OTP VERIFICATION - just update password directly
    // Update password (NO HASHING)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword },
    });

    return {
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
      },
    };
  }
}
