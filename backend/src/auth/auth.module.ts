import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../database/prisma.service';
import { OtpService } from './services/otp.service';

@Module({
  imports: [
    PassportModule,
  JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => {
      const secret = configService.get<string>('JWT_SECRET', 'your-secret-key');
      const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '24h');
      
      return {
        secret,
        signOptions: { 
          expiresIn: expiresIn as any
        },
      };
    },
    inject: [ConfigService],
  }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService, OtpService],
  exports: [AuthService],
})
export class AuthModule {}
