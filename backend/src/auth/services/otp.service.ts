import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  
  constructor(private configService: ConfigService) {}

  /**
   * Generate a random 6-digit OTP
   */
  generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Store OTP in memory (in production, use Redis)
   */
  private otpStorage = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

  /**
   * Store OTP with expiration (5 minutes)
   */
  storeOtp(identifier: string, otp: string): void {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    this.otpStorage.set(identifier, {
      otp,
      expiresAt,
      attempts: 0,
    });
    
    this.logger.log(`OTP stored for ${identifier}, expires at ${expiresAt.toISOString()}`);
  }

  /**
   * Verify OTP
   */
  verifyOtp(identifier: string, providedOtp: string): boolean {
    const stored = this.otpStorage.get(identifier);
    
    if (!stored) {
      this.logger.warn(`No OTP found for ${identifier}`);
      return false;
    }

    if (new Date() > stored.expiresAt) {
      this.logger.warn(`OTP expired for ${identifier}`);
      this.otpStorage.delete(identifier);
      return false;
    }

    if (stored.attempts >= 3) {
      this.logger.warn(`Too many attempts for ${identifier}`);
      this.otpStorage.delete(identifier);
      return false;
    }

    stored.attempts++;
    
    if (stored.otp === providedOtp) {
      this.otpStorage.delete(identifier);
      this.logger.log(`OTP verified successfully for ${identifier}`);
      return true;
    }

    this.logger.warn(`Invalid OTP attempt for ${identifier}, attempt ${stored.attempts}`);
    return false;
  }

  /**
   * Send OTP via email (mock implementation)
   */
  async sendOtpViaEmail(email: string, otp: string): Promise<boolean> {
    try {
      // In production, integrate with email service like SendGrid, AWS SES, etc.
      this.logger.log(`📧 Sending OTP to email: ${email}`);
      this.logger.log(`🔐 OTP Code: ${otp}`);
      
      // Mock email sending - in production, replace with actual email service
      console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                           ForexAI Exchange OTP                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Hello!                                                                      ║
║                                                                              ║
║  You requested a password reset for your ForexAI Exchange account.          ║
║                                                                              ║
║  Your OTP Code: ${otp}                                                      ║
║                                                                              ║
║  This code will expire in 5 minutes.                                        ║
║                                                                              ║
║  If you didn't request this reset, please ignore this email.                ║
║                                                                              ║
║  Best regards,                                                               ║
║  ForexAI Exchange Team                                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP to email ${email}:`, error);
      return false;
    }
  }

  /**
   * Send OTP via SMS (mock implementation)
   */
  async sendOtpViaSms(phone: string, otp: string): Promise<boolean> {
    try {
      // In production, integrate with SMS service like Twilio, AWS SNS, etc.
      this.logger.log(`📱 Sending OTP to phone: ${phone}`);
      this.logger.log(`🔐 OTP Code: ${otp}`);
      
      // Mock SMS sending - in production, replace with actual SMS service
      console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                              SMS OTP                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  To: ${phone}                                                               ║
║                                                                              ║
║  ForexAI Exchange: Your OTP code is ${otp}                                 ║
║                                                                              ║
║  This code expires in 5 minutes.                                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP to phone ${phone}:`, error);
      return false;
    }
  }

  /**
   * Send OTP to either email or phone
   */
  async sendOtp(identifier: string, isEmail: boolean): Promise<boolean> {
    const otp = this.generateOtp();
    
    // Store OTP
    this.storeOtp(identifier, otp);
    
    // Send OTP
    if (isEmail) {
      return await this.sendOtpViaEmail(identifier, otp);
    } else {
      return await this.sendOtpViaSms(identifier, otp);
    }
  }

  /**
   * Clean up expired OTPs
   */
  cleanupExpiredOtps(): void {
    const now = new Date();
    for (const [identifier, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt) {
        this.otpStorage.delete(identifier);
      }
    }
  }
}
