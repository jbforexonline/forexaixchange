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

      const user = await this.prisma.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
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
    try {
      const { email, phone, password } = loginDto;

      console.log('🔍 Login attempt:', { email, phone: phone ? '***' : undefined });

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
        console.log('❌ User not found');
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive || user.isBanned) {
        console.log('❌ Account inactive or banned');
        throw new UnauthorizedException('Account is inactive or banned');
      }

      // Check if user has a password (OAuth users don't have passwords)
      if (!user.password) {
        console.log('❌ User has no password (OAuth account)');
        throw new UnauthorizedException('This account uses social login. Please use Google to sign in.');
      }

      // Validate password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Invalid password');
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('✅ Login successful for user:', user.id);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token: this.generateToken(user.id, user.role),
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
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
   * Create a demo account for testing purposes
   */
  async createDemoAccount() {
    try {
      console.log('🔍 Creating demo account...');

      const baseUsername = 'demo';
      let username = baseUsername;
      let usernameExists = await this.prisma.user.findUnique({
        where: { username },
      });

      let counter = 1;
      while (usernameExists) {
        username = `${baseUsername}${counter}`;
        usernameExists = await this.prisma.user.findUnique({
          where: { username },
        });
        counter++;
      }

      const demoEmail = `${username}@demo.forexai.local`;

      const user = await this.prisma.user.create({
        data: {
          email: demoEmail,
          username,
          firstName: 'Demo',
          lastName: 'User',
          password: null,
          wallet: {
            create: {
              available: 10000,
              held: 0,
            },
          },
        },
        include: {
          wallet: true,
        },
      });

      console.log('✅ Demo account created:', user.id);

      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token: this.generateToken(user.id, user.role),
        demoMessage: 'You are logged in as a demo user. This account will be deleted after your session.',
      };
    } catch (error) {
      console.error('❌ Demo account creation error:', error);
      throw new BadRequestException('Failed to create demo account. Please try again later.');
    }
  }

}
