import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './services/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
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

      // Validate password strength
      this.validatePasswordStrength(password);

      // Hash password before storing
      const hashedPassword = await this.hashPassword(password);

      // Create user with wallet
      const user = await this.prisma.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          username,
          firstName,
          lastName,
          referredBy: validReferredBy,
          provider: 'local',
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

    // Find user by email or phone
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
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive || user.isBanned) {
      throw new UnauthorizedException('Account is inactive or banned');
    }

    // Check if user has a password (OAuth users don't have passwords)
    if (!user.password) {
      throw new UnauthorizedException('This account uses social login. Please use Google to sign in.');
    }

    // Validate password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    if (!hashedPassword) {
      return false;
    }
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validate password strength
   * Requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    // Find user by email - MUST match their account email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (!user.isActive || user.isBanned) {
      throw new BadRequestException('Account is inactive or banned');
    }

    // Allow all users (including Google OAuth users) to set/reset password
    // Send OTP to user's registered email
    const otpSent = await this.otpService.sendOtp(email);
    
    if (!otpSent) {
      throw new BadRequestException('Failed to send OTP. Please try again later.');
    }

    return {
      message: 'OTP sent successfully to your email',
      email: email,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (!user.isActive || user.isBanned) {
      throw new BadRequestException('Account is inactive or banned');
    }

    // Allow all users (including Google OAuth users) to set/reset password
    // Verify OTP
    const isOtpValid = this.otpService.verifyOtp(email, otp);
    
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new one.');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Hash and update password
    // Keep the original provider (google or local) - users can use either login method
    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        // Don't change provider - allow users to use both Google and email/password login
      },
    });

    return {
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  /**
   * Handle Google OAuth authentication
   * Creates new user or logs in existing user
   */
  async handleGoogleAuth(googleUser: any) {
    const { googleId, email, firstName, lastName, photo } = googleUser;

    if (!email) {
      throw new BadRequestException('Google account email is required');
    }

    // Check if user exists with this Google ID
    let user = await this.prisma.user.findUnique({
      where: { googleId },
      include: { wallet: true },
    });

    if (user) {
      // User exists with Google ID - log them in
      if (!user.isActive || user.isBanned) {
        throw new UnauthorizedException('Account is inactive or banned');
      }

      const { password: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        token: this.generateToken(user.id, user.role),
      };
    }

    // Check if user exists with this email (might be local user)
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    if (existingUserByEmail) {
      // Email exists but with different provider
      if (existingUserByEmail.provider === 'local') {
        // Link Google account to existing local account
        user = await this.prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            googleId,
            provider: 'google', // Switch to Google provider
            // Optionally keep password for local login fallback
          },
          include: { wallet: true },
        });
      } else {
        // Already a Google user but different googleId (shouldn't happen)
        throw new ConflictException('Account with this email already exists');
      }
    } else {
      // Create new user with Google OAuth
      // Generate username from email if not provided
      const baseUsername = email.split('@')[0];
      let username = baseUsername;
      let usernameExists = await this.prisma.user.findUnique({
        where: { username },
      });

      // If username exists, append random suffix
      let counter = 1;
      while (usernameExists) {
        username = `${baseUsername}${counter}`;
        usernameExists = await this.prisma.user.findUnique({
          where: { username },
        });
        counter++;
      }

      user = await this.prisma.user.create({
        data: {
          email,
          googleId,
          provider: 'google',
          username,
          firstName,
          lastName,
          password: null, // No password for OAuth users
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
    }

    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token: this.generateToken(user.id, user.role),
    };
  }
}
