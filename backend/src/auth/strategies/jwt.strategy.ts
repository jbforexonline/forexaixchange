import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Custom extractor that handles both "Bearer <token>" and just "<token>"
        (request) => {
          let token = null;
          if (request && request.headers.authorization) {
            const authHeader = request.headers.authorization;
            // Check if it starts with "Bearer "
            if (authHeader.startsWith('Bearer ')) {
              token = authHeader.substring(7);
            } else {
              // If no "Bearer " prefix, treat the whole string as the token
              token = authHeader;
            }
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return { userId: user.id, role: user.role };
  }
}



