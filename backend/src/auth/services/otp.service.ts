import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OtpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OtpService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;
  private emailTransporter: nodemailer.Transporter | null = null;
  
  // OTP expiration time in milliseconds (5 minutes)
  private readonly OTP_EXPIRATION_MS = 5 * 60 * 1000;
  
  // Maximum verification attempts
  private readonly MAX_ATTEMPTS = 3;
  
  constructor(private configService: ConfigService) {
    this.initializeGmailService();
  }

  /**
   * Initialize Gmail service for sending OTP emails
   */
  private initializeGmailService() {
    try {
      const emailUser = this.configService.get<string>('EMAIL_USER');
      const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

      if (emailUser && emailPassword) {
        this.emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPassword,
          },
        });
        this.logger.log('✅ Gmail service initialized successfully');
      } else {
        this.logger.warn('⚠️ Gmail credentials not configured. OTP will be logged to console (development mode)');
      }
    } catch (error) {
      this.logger.warn('❌ Gmail service initialization failed:', error.message);
    }
  }

  /**
   * Generate a cryptographically secure random 6-digit OTP
   */
  generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Store OTP in memory
   * 
   * NOTE: For production, consider using Redis for distributed systems:
   * - Better scalability across multiple server instances
   * - Automatic expiration with TTL
   * - Better performance for high-traffic applications
   * 
   * Example Redis implementation:
   * await redis.setex(`otp:${identifier}`, 300, JSON.stringify({ otp, attempts: 0 }));
   */
  private otpStorage = new Map<string, { otp: string; expiresAt: Date; attempts: number; createdAt: Date }>();

  /**
   * Store OTP with expiration
   * Prevents duplicate OTP requests within 1 minute (rate limiting)
   */
  storeOtp(identifier: string, otp: string): void {
    // Check if there's an existing OTP that hasn't expired (rate limiting)
    const existing = this.otpStorage.get(identifier);
    if (existing && new Date() < existing.expiresAt) {
      const timeRemaining = Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000);
      this.logger.warn(`OTP already exists for ${identifier}. Please wait ${timeRemaining} seconds before requesting a new one.`);
      throw new BadRequestException(`Please wait ${timeRemaining} seconds before requesting a new OTP.`);
    }

    const expiresAt = new Date(Date.now() + this.OTP_EXPIRATION_MS);
    this.otpStorage.set(identifier, {
      otp,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });
    
    this.logger.log(`OTP stored for ${identifier}, expires at ${expiresAt.toISOString()}`);
  }

  /**
   * Verify OTP with rate limiting and security checks
   */
  verifyOtp(identifier: string, providedOtp: string): boolean {
    const stored = this.otpStorage.get(identifier);
    
    if (!stored) {
      this.logger.warn(`No OTP found for ${identifier}`);
      return false;
    }

    // Check expiration
    if (new Date() > stored.expiresAt) {
      this.logger.warn(`OTP expired for ${identifier}`);
      this.otpStorage.delete(identifier);
      return false;
    }

    // Check maximum attempts
    if (stored.attempts >= this.MAX_ATTEMPTS) {
      this.logger.warn(`Too many verification attempts for ${identifier}. OTP invalidated.`);
      this.otpStorage.delete(identifier);
      return false;
    }

    // Increment attempts before verification
    stored.attempts++;
    
    // Constant-time comparison to prevent timing attacks
    const isValid = this.constantTimeCompare(stored.otp, providedOtp);
    
    if (isValid) {
      this.otpStorage.delete(identifier);
      this.logger.log(`OTP verified successfully for ${identifier} after ${stored.attempts} attempt(s)`);
      return true;
    }

    const remainingAttempts = this.MAX_ATTEMPTS - stored.attempts;
    this.logger.warn(`Invalid OTP attempt for ${identifier}, ${remainingAttempts} attempt(s) remaining`);
    
    // Delete after max attempts reached
    if (stored.attempts >= this.MAX_ATTEMPTS) {
      this.otpStorage.delete(identifier);
    }
    
    return false;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Send OTP via Gmail
   */
  async sendOtpViaEmail(email: string, otp: string): Promise<boolean> {
    try {
      if (!this.emailTransporter) {
        // Development mode - log to console
        this.logger.log(`📧 OTP for ${email}: ${otp}`);
        console.log(`
╔═══════════════════════════════════════╗
║     ForexAI Exchange - OTP Code     ║
╠═══════════════════════════════════════╣
║  Email: ${email.padEnd(26)}║
║  OTP: ${otp}                      ║
║  Expires: 5 minutes                 ║
╚═══════════════════════════════════════╝
        `);
        return true;
      }

      const fromEmail = this.configService.get<string>('EMAIL_USER');
      const appName = 'ForexAI Exchange';

      const mailOptions = {
        from: `"${appName}" <${fromEmail}>`,
        to: email,
        subject: 'Password Reset OTP - ForexAI Exchange',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2400ff 0%, #6c5ce7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #2400ff; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #2400ff; letter-spacing: 8px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${appName}</h1>
                <p>Password Reset Request</p>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You requested a password reset for your ${appName} account.</p>
                <div class="otp-box">
                  <p style="margin: 0 0 10px 0; color: #666;">Your OTP Code:</p>
                  <div class="otp-code">${otp}</div>
                </div>
                <p>This code will expire in <strong>5 minutes</strong>.</p>
                <p style="color: #d32f2f;"><strong>⚠️ Security Notice:</strong> If you didn't request this reset, please ignore this email and consider securing your account.</p>
                <p>Best regards,<br>${appName} Team</p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `${appName} - Password Reset OTP\n\nYour OTP Code: ${otp}\n\nThis code expires in 5 minutes.\n\nBest regards,\n${appName} Team`,
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      this.logger.log(`✅ OTP sent to ${email} - Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send OTP to ${email}:`, error.message);
      this.logger.warn(`Development OTP for ${email}: ${otp}`);
      return false;
    }
  }

  /**
   * Send OTP via email
   * Throws BadRequestException if OTP already exists (rate limiting)
   */
  async sendOtp(email: string): Promise<boolean> {
    try {
      const otp = this.generateOtp();
      
      // Store OTP (may throw BadRequestException if OTP already exists)
      this.storeOtp(email, otp);
      
      // Send OTP via email
      return await this.sendOtpViaEmail(email, otp);
    } catch (error) {
      // Re-throw BadRequestException (rate limiting)
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Log and return false for other errors
      this.logger.error(`Failed to send OTP to ${email}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired OTPs
   * Removes expired entries to prevent memory leaks
   */
  cleanupExpiredOtps(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [identifier, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt) {
        this.otpStorage.delete(identifier);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired OTP(s)`);
    }
  }

  /**
   * Get OTP statistics (for monitoring/debugging)
   */
  getOtpStats(): { total: number; expired: number; active: number } {
    const now = new Date();
    let expired = 0;
    let active = 0;
    
    for (const [, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }
    
    return {
      total: this.otpStorage.size,
      expired,
      active,
    };
  }

  /**
   * Initialize periodic cleanup on module init
   * Runs cleanup every 5 minutes
   */
  onModuleInit() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredOtps();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    this.logger.log('OTP service initialized with automatic cleanup');
  }

  /**
   * Clean up interval on module destroy
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Final cleanup
    this.otpStorage.clear();
    this.logger.log('OTP service cleaned up');
  }
}
