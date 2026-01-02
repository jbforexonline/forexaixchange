import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    configService: ConfigService,
    authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL', '/auth/google/callback');

    if (!clientID || !clientSecret) {
      // Provide dummy values to prevent initialization error
      // Strategy won't work but app won't crash
      super({
        clientID: 'dummy-client-id',
        clientSecret: 'dummy-client-secret',
        callbackURL: callbackURL,
        scope: ['email', 'profile'],
      });
      this.logger.warn('⚠️ Google OAuth credentials not configured. "Continue with Google" will not work.');
    } else {
      super({
        clientID,
        clientSecret,
        callbackURL,
        scope: ['email', 'profile'],
      });
      this.logger.log('✅ Google OAuth strategy initialized successfully');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      this.logger.log('Google OAuth validate called');
      this.logger.debug('Profile data:', JSON.stringify(profile, null, 2));
      
      const { id, name, emails, photos } = profile;
      
      if (!id) {
        this.logger.error('Google profile missing id');
        return done(new Error('Google profile missing id'), null);
      }
      
      if (!emails || !emails[0] || !emails[0].value) {
        this.logger.error('Google profile missing email');
        return done(new Error('Google profile missing email'), null);
      }
      
      const user = {
        googleId: id,
        email: emails[0].value,
        firstName: name?.givenName || null,
        lastName: name?.familyName || null,
        photo: photos?.[0]?.value || null,
        accessToken,
      };

      this.logger.log(`Google OAuth validated user: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error('Error in Google OAuth validate:', error);
      done(error, null);
    }
  }
}

