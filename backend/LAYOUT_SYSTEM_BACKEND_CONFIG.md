# Backend Configuration for Role-Based Layout System

This guide helps backend developers configure their API responses to work with the frontend role-based layout system.

## Required User Fields

Your login API must return these fields:

```typescript
interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;

    // ⭐ CRITICAL FIELDS for layout system
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
    premium: boolean;
    premiumSubscription?: {
      id: string;
      planId: string;
      status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
      startDate: string;
      endDate: string;
      plan?: {
        name: 'Basic' | 'Premium' | 'VIP';
        features: any;
      };
    };

    // Other fields
    isActive: boolean;
    isBanned: boolean;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
}
```

## Example Implementations

### NestJS Controller

```typescript
// backend/src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() credentials: { email: string; password: string }) {
    const user = await this.authService.validateUser(
      credentials.email,
      credentials.password,
    );

    const token = await this.authService.generateToken(user);

    // ⭐ Return role and subscription data
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role, // ← Must include
        premium: user.premium, // ← Must include
        premiumSubscription: user.premiumSubscription, // ← Must include
        isActive: user.isActive,
        isBanned: user.isBanned,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Post('register')
  async register(@Body() data: any) {
    const user = await this.authService.createUser(data);
    const token = await this.authService.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role, // Default to USER for new users
        premium: false,
        premiumSubscription: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Post('refresh')
  async refreshToken(@Body() body: { token: string }) {
    const user = await this.authService.verifyToken(body.token);
    const newToken = await this.authService.generateToken(user);

    return {
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        premium: user.premium,
        premiumSubscription: user.premiumSubscription,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}
```

### Service Implementation

```typescript
// backend/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        premiumSubscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    return user;
  }

  async createUser(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'USER', // Default role for new users
        premium: false,
      },
      include: {
        premiumSubscriptions: {
          include: { plan: true },
        },
      },
    });

    return user;
  }

  async generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
    });
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          premiumSubscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1,
          },
        },
      });

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
```

### Get Current User Endpoint

```typescript
// backend/src/users/users.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        premiumSubscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
        },
        wallet: true,
      },
    });

    // ⭐ Return consistent user structure
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      premium: user.premium,
      premiumSubscription: user.premiumSubscriptions[0] || null,
      isActive: user.isActive,
      isBanned: user.isBanned,
      isVerified: user.isVerified,
      wallet: user.wallet,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-role') // Admin only
  @UseGuards(new RoleGuard(['SUPER_ADMIN']))
  async updateUserRole(@Body() body: { userId: string; role: string }) {
    const user = await this.prisma.user.update({
      where: { id: body.userId },
      data: { role: body.role },
      include: {
        premiumSubscriptions: {
          include: { plan: true },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      premium: user.premium,
    };
  }
}
```

## Role Mapping

### SUPER_ADMIN

- Full system access
- Can manage admins
- Can access all features
- Database management
- System settings

### ADMIN

- User management
- Analytics access
- Affiliate management
- Transaction management
- Cannot change system settings

### MODERATOR

- Community management
- Report handling
- User support
- Limited analytics

### USER

- Standard user access
- Play spins
- Withdraw funds
- Affiliate program
- View own data only

## Premium Subscription Mapping

Map your subscription plans to frontend tiers:

```typescript
// Plan name -> Frontend tier mapping
const planTierMap = {
  'Basic Plan': 'BASIC',
  'Premium Plan': 'PREMIUM',
  'VIP Plan': 'VIP',
  Enterprise: 'VIP',
};

// Get subscription tier
function getSubscriptionTier(user: any): string {
  if (!user.premium) return 'FREE';

  const subscription = user.premiumSubscriptions?.[0];
  if (!subscription) return 'FREE';

  return planTierMap[subscription.plan.name] || 'BASIC';
}
```

## Database Queries Optimization

```typescript
// Efficient query with all needed data
async function getUserWithLayoutData(userId: string) {
  return this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      premium: true,
      isActive: true,
      isBanned: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      premiumSubscriptions: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          plan: {
            select: {
              id: true,
              name: true,
              features: true,
            },
          },
        },
        take: 1,
      },
    },
  });
}
```

## Testing

### Test Cases for Backend

```bash
# Test Super Admin login
POST /api/auth/login
{
  "email": "superadmin@test.com",
  "password": "password"
}
# Should return: role: "SUPER_ADMIN"

# Test Admin login
POST /api/auth/login
{
  "email": "admin@test.com",
  "password": "password"
}
# Should return: role: "ADMIN"

# Test Premium User login
POST /api/auth/login
{
  "email": "premium@test.com",
  "password": "password"
}
# Should return: premium: true, premiumSubscription: { ... }

# Test Free User login
POST /api/auth/login
{
  "email": "user@test.com",
  "password": "password"
}
# Should return: premium: false, premiumSubscription: null
```

## Common Issues

### Issue: Frontend shows wrong layout

**Cause**: Backend not returning `role` field
**Solution**: Ensure all auth endpoints return the `role` field

### Issue: Subscription tier not detected

**Cause**: `premiumSubscription` not populated
**Solution**: Include `premiumSubscriptions` relation in query with `status: ACTIVE`

### Issue: Premium features not locked

**Cause**: `premium` flag not matching subscription status
**Solution**: Keep `premium` flag in sync with active subscriptions

## Deployment Checklist

- [ ] All auth endpoints return `role` field
- [ ] All auth endpoints return `premium` field
- [ ] All auth endpoints include `premiumSubscription` with plan data
- [ ] User include queries are optimized (select only needed fields)
- [ ] Role migration exists (if adding roles to existing users)
- [ ] Subscription status is checked correctly
- [ ] JWT token includes role in payload
- [ ] Test with different user roles
- [ ] Test with premium and free users
- [ ] Test role update endpoints

---

**Version**: 1.0.0
**Last Updated**: December 3, 2025
