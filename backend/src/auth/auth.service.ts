import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './services/otp.service';
import { AffiliateTier } from '@prisma/client';
import { LegalService } from '../legal/legal.service';

export interface RegisterContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private legalService: LegalService,
  ) {}

  async register(registerDto: RegisterDto, ctx?: RegisterContext) {
    let user;
    try {
      console.log('🔍 Registration attempt:', { 
        email: registerDto.email, 
        username: registerDto.username,
        phone: registerDto.phone,
        referredBy: registerDto.referredBy 
      });

      if (registerDto.is18Plus !== true) {
        throw new BadRequestException('You must confirm you are 18 or older to register');
      }
      if (registerDto.acceptedTerms !== true) {
        throw new BadRequestException('You must accept the Terms & Conditions to register');
      }
      if (registerDto.acceptedPrivacy !== true) {
        throw new BadRequestException('You must accept the Privacy Policy to register');
      }
      
      let { email, phone, password, username, firstName, lastName, referredBy } = registerDto;

      // Validate that either email or phone is provided
      if (!email && !phone) {
        throw new BadRequestException('Either email or phone number is required');
      }

      // Format email if provided
      if (email) {
        email = email.toLowerCase().trim();
      }

      // Format phone number if provided
      if (phone) {
        phone = this.formatPhoneNumber(phone);
        console.log('📱 Formatted phone number:', phone);
      }

      console.log('✅ Validation passed - checking existing user...');

      // Check if user already exists - check each field separately
      const emailExists = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
      const phoneExists = phone ? await this.prisma.user.findUnique({ where: { phone } }) : null;
      const usernameExists = await this.prisma.user.findUnique({ where: { username } });

      if (emailExists) {
        console.log('❌ Email already exists:', email);
        throw new ConflictException('User with this email already exists');
      }

      if (phoneExists) {
        console.log('❌ Phone already exists:', phone);
        throw new ConflictException('User with this phone number already exists');
      }

      if (usernameExists) {
        console.log('❌ Username already exists:', username);
        throw new ConflictException('Username already taken');
      }

      console.log('✅ No existing user found - creating user...');

      // Validate referral code if provided
      let validReferredBy = null;
      let referringUserId = null;
      if (referredBy) {
        try {
          const referringUser = await this.prisma.user.findFirst({
            where: { affiliateCode: referredBy },
          });
          
          if (referringUser && referringUser.id) {
            // Make sure user isn't referring themselves
            if (email === referringUser.email || phone === referringUser.phone) {
              console.log('⚠️ User cannot refer themselves');
              validReferredBy = null;
            } else {
              validReferredBy = referringUser.id;
              referringUserId = referringUser.id;
              console.log('✅ Valid referral code found. Referrer:', referringUser.username);
            }
          } else {
            console.log('⚠️ Invalid referral code provided:', referredBy);
          }
        } catch (error) {
          console.error('❌ Error checking referral code:', error);
          // Continue without referral if check fails
        }
      }

      // Validate password strength
      this.validatePasswordStrength(password);

      // Hash password before storing
      const hashedPassword = await this.hashPassword(password);

      const activeTerms = await this.legalService.getActive('terms');
      const activePrivacy = await this.legalService.getActive('privacy');
      if (!activeTerms || !activePrivacy) {
        throw new BadRequestException(
          'Terms and Privacy Policy must be configured before registration. Please try again later.',
        );
      }

      // Generate unique affiliate code
      const affiliateCode = this.generateAffiliateCode();
      const ip = ctx?.ip ?? null;
      const userAgent = ctx?.userAgent ?? null;
      const now = new Date();

      const userData: any = {
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        username,
        firstName: firstName || '',
        lastName: lastName || '',
        affiliateCode,
        isAge18Confirmed: true,
        ageConfirmedAt: now,
        ageConfirmedIp: ip,
        ageConfirmedUserAgent: userAgent,
        wallet: {
          create: {
            available: 0,
            held: 0,
            totalDeposited: 0,
            totalLost: 0,
            totalWithdrawn: 0,
            totalWon: 0,
            demoAvailable: 10000,
            demoHeld: 0,
            demoTotalWon: 0,
            demoTotalLost: 0,
          },
        },
      };

      if (validReferredBy) {
        userData.referredBy = validReferredBy;
        console.log('✅ User will be linked to referrer:', validReferredBy);
      }

      console.log('📝 Creating user with data:', {
        email: userData.email,
        phone: userData.phone,
        username: userData.username,
        hasAffiliateCode: !!userData.affiliateCode,
        referredBy: userData.referredBy || 'None'
      });

      user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: userData,
          include: {
            wallet: true,
            referrer: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          },
        });
        await tx.userLegalAcceptance.createMany({
          data: [
            { userId: u.id, legalDocumentId: activeTerms.id, ipAddress: ip ?? undefined, userAgent: userAgent ?? undefined },
            { userId: u.id, legalDocumentId: activePrivacy.id, ipAddress: ip ?? undefined, userAgent: userAgent ?? undefined },
          ],
        });
        return u;
      });

      console.log('✅ User created successfully:', user.id);
      console.log('🎉 Registration complete for:', user.username);

      // Create affiliate earning record if referredBy is valid
      // Note: We don't create a separate Referral model, we use the referredBy field and AffiliateEarning
      if (validReferredBy && referringUserId) {
        try {
          await this.createAffiliateEarningRecord(user.id, referringUserId);
        } catch (referralError) {
          console.error('⚠️ Failed to create affiliate earning record, but user was created:', referralError.message);
          // Don't fail registration if affiliate earning record creation fails
        }
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token: this.generateToken(user.id, user.role),
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Re-throw known exceptions
      if (error instanceof ConflictException || 
          error instanceof BadRequestException || 
          error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Check for Prisma unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        throw new ConflictException(`User with this ${field} already exists`);
      }
      
      // Throw internal server error for unexpected issues
      throw new InternalServerErrorException('Registration failed. Please try again later.');
    }
  }

  async createAffiliateEarningRecord(referredUserId: string, referrerUserId: string) {
    try {
      console.log('📝 Creating affiliate earning record:', {
        referredUserId,
        referrerUserId
      });
      
      // Check if affiliate earning record already exists
      const existingEarning = await this.prisma.affiliateEarning.findFirst({
        where: { 
          userId: referrerUserId,
          referredUserId: referredUserId
        },
      });

      if (existingEarning) {
        console.log('⚠️ Affiliate earning record already exists:', existingEarning.id);
        return existingEarning;
      }

      // Create new affiliate earning record (initial 0 amount, will be updated when user deposits)
      const affiliateEarning = await this.prisma.affiliateEarning.create({
        data: {
          userId: referrerUserId,
          referredUserId: referredUserId,
          amount: 0,
          tier: AffiliateTier.TIER_1, // Default tier, will be updated based on deposit amount
          isPaid: false,
          date: new Date(),
        },
      });

      console.log('✅ Affiliate earning record created:', affiliateEarning.id);
      return affiliateEarning;
    } catch (error) {
      console.error('❌ Failed to create affiliate earning record:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
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

      // Format phone number if provided
      let formattedPhone = phone;
      if (phone) {
        formattedPhone = this.formatPhoneNumber(phone);
      }

      // Find user by email or phone
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email: email.toLowerCase().trim() }] : []),
            ...(formattedPhone ? [{ phone: formattedPhone }] : []),
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

  async getReferrerInfo(code: string) {
    try {
      if (!code) {
        throw new BadRequestException('Referral code is required');
      }
      
      const referrer = await this.prisma.user.findFirst({
        where: { affiliateCode: code },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });
      
      if (!referrer) {
        throw new NotFoundException('Referrer not found');
      }
      
      return referrer;
    } catch (error) {
      console.error('Error in getReferrerInfo:', error);
      throw error;
    }
  }

  generateToken(userId: string, role: string) {
    return this.jwtService.sign({
      sub: userId,
      role,
    });
  }

  private generateAffiliateCode(): string {
    // Your schema uses cuid() as default, but we can generate a readable one
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'REF';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private formatPhoneNumber(phone: string): string {
    if (!phone) return phone;
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0 (local format), convert to international (assuming Rwanda +250)
    if (cleaned.startsWith('0')) {
      cleaned = '250' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, add +250 (Rwanda)
    if (!cleaned.startsWith('250') && !cleaned.startsWith('+')) {
      cleaned = '250' + cleaned;
    }
    
    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
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

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (!user.isActive || user.isBanned) {
      throw new BadRequestException('Account is inactive or banned');
    }

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

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (!user.isActive || user.isBanned) {
      throw new BadRequestException('Account is inactive or banned');
    }

    const isOtpValid = this.otpService.verifyOtp(email, otp);
    
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new one.');
    }

    this.validatePasswordStrength(newPassword);

    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
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

      const affiliateCode = this.generateAffiliateCode();

      const user = await this.prisma.user.create({
        data: {
          email: demoEmail,
          username,
          firstName: 'Demo',
          lastName: 'User',
          password: null,
          affiliateCode,
          wallet: {
            create: {
              available: 10000,
              held: 0,
              totalDeposited: 0,
              totalLost: 0,
              totalWithdrawn: 0,
              totalWon: 0,
              demoAvailable: 10000,
              demoHeld: 0,
              demoTotalWon: 0,
              demoTotalLost: 0,
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

  async canReferUser(referrerId: string, referredEmail?: string, referredPhone?: string): Promise<boolean> {
    try {
      const referrer = await this.prisma.user.findUnique({
        where: { id: referrerId },
      });

      if (!referrer) {
        return false;
      }

      // Check if user is trying to refer themselves
      if (referredEmail && referredEmail === referrer.email) {
        return false;
      }

      if (referredPhone && referredPhone === referrer.phone) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking referral eligibility:', error);
      return false;
    }
  }

  // Method to process affiliate commission when referred user makes a deposit
  async processAffiliateCommission(referredUserId: string, depositAmount: number) {
    try {
      const referredUser = await this.prisma.user.findUnique({
        where: { id: referredUserId },
        include: {
          referrer: true,
        },
      });

      if (!referredUser || !referredUser.referredBy || !referredUser.referrer) {
        console.log(`No referrer found for user ${referredUserId}`);
        return null;
      }

      const referrer = referredUser.referrer;
      console.log(`Processing affiliate commission for ${referredUser.username} referred by ${referrer.username}, deposit: $${depositAmount}`);

      // Calculate commission based on tier
      const commissionRate = this.getCommissionRate(depositAmount);
      const commissionAmount = depositAmount * commissionRate;

      if (commissionAmount <= 0) {
        console.log(`No commission for deposit amount: $${depositAmount}`);
        return null;
      }

      // Determine tier
      const tier = this.getTierForAmount(depositAmount);

      // Check if affiliate earning record already exists
      const existingEarning = await this.prisma.affiliateEarning.findFirst({
        where: {
          userId: referrer.id,
          referredUserId: referredUserId,
        },
      });

      let affiliateEarning;
      
      if (existingEarning) {
        // Update existing record
        affiliateEarning = await this.prisma.affiliateEarning.update({
          where: { id: existingEarning.id },
          data: {
            amount: { increment: commissionAmount },
            tier: tier, // Update tier if needed
          },
        });
        console.log(`Updated existing commission: +$${commissionAmount.toFixed(2)}, total: $${affiliateEarning.amount}`);
      } else {
        // Create new record
        affiliateEarning = await this.prisma.affiliateEarning.create({
          data: {
            userId: referrer.id,
            referredUserId: referredUserId,
            amount: commissionAmount,
            tier: tier,
            isPaid: false,
            date: new Date(),
          },
        });
        console.log(`Created new commission: $${commissionAmount.toFixed(2)}`);
      }

      console.log(`Commission recorded at tier ${tier}: $${commissionAmount.toFixed(2)} (${commissionRate * 100}%)`);
      return affiliateEarning;
    } catch (error) {
      console.error('Error processing affiliate commission:', error);
      console.error('Error details:', error.message);
      return null;
    }
  }

  private getCommissionRate(depositAmount: number): number {
    if (depositAmount < 50) return 0;
    if (depositAmount < 100) return 0.01; // 1%
    if (depositAmount < 500) return 0.02; // 2%
    if (depositAmount < 2000) return 0.05; // 5%
    return 0.07; // 7%
  }

  private getTierForAmount(depositAmount: number): AffiliateTier {
    if (depositAmount < 50) return AffiliateTier.TIER_1;
    if (depositAmount < 100) return AffiliateTier.TIER_2;
    if (depositAmount < 500) return AffiliateTier.TIER_3;
    if (depositAmount < 2000) return AffiliateTier.TIER_4;
    return AffiliateTier.TIER_5;
  }

  // Get user's referral statistics
  async getUserReferralStats(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          referrals: {
            include: {
              wallet: true,
            },
          },
          affiliateEarnings: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const totalReferrals = user.referrals.length;
      const activeReferrals = user.referrals.filter(ref => (ref.wallet?.totalDeposited?.toNumber() || 0) > 0).length;

      // Calculate total earnings
      let totalEarnings = 0;
      let totalPaid = 0;
      let pendingPayout = 0;

      user.affiliateEarnings.forEach(earning => {
        const amount = earning.amount.toNumber();
        totalEarnings += amount;
        if (earning.isPaid) {
          totalPaid += amount;
        } else {
          pendingPayout += amount;
        }
      });

      return {
        totalReferrals,
        activeReferrals,
        totalEarnings,
        totalPaid,
        pendingPayout,
        referrals: user.referrals.map(ref => ({
          id: ref.id,
          username: ref.username,
          email: ref.email,
          firstName: ref.firstName,
          lastName: ref.lastName,
          createdAt: ref.createdAt,
          totalDeposited: ref.wallet?.totalDeposited?.toNumber() || 0,
          status: (ref.wallet?.totalDeposited?.toNumber() || 0) > 0 ? 'Active' : 'Inactive',
        })),
        earnings: user.affiliateEarnings.map(e => ({
          id: e.id,
          amount: e.amount.toNumber(),
          tier: e.tier,
          isPaid: e.isPaid,
          date: e.date,
          referredUserId: e.referredUserId,
        })),
      };
    } catch (error) {
      console.error('Error getting user referral stats:', error);
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        totalPaid: 0,
        pendingPayout: 0,
        referrals: [],
        earnings: [],
      };
    }
  }

  /**
   * Update user profile (username, firstName, lastName)
   */
  async updateProfile(userId: string, updateData: { username?: string; firstName?: string; lastName?: string }) {
    try {
      // Check if username is being changed and if it's already taken
      if (updateData.username) {
        const existingUser = await this.prisma.user.findUnique({
          where: { username: updateData.username }
        });
        
        if (existingUser && existingUser.id !== userId) {
          throw new ConflictException('Username already taken');
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          premium: true,
          verificationBadge: true,
          createdAt: true,
        }
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error updating profile:', error);
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      // Get user with password
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true, email: true, phone: true }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      return {
        message: 'Password changed successfully',
        identifier: user.email || user.phone
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error changing password:', error);
      throw new InternalServerErrorException('Failed to change password');
    }
  }
}