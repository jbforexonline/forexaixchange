// =============================================================================
// USER PREFERENCES SERVICE - Flexible Spin Timing & Preferences
// =============================================================================
// Path: backend/src/preferences/preferences.service.ts
// Premium feature: 5/10/20 min cycles
// =============================================================================

import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface UpdatePreferencesDto {
  preferredRoundDuration?: number; // 300 (5min), 600 (10min), 1200 (20min)
  autoSpinEnabled?: boolean;
  maxAutoSpinOrders?: number;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);
  private readonly ALLOWED_DURATIONS = [300, 600, 1200]; // 5min, 10min, 20min

  constructor(private prisma: PrismaService) {}

  /**
   * Get user preferences (create default if not exists)
   */
  async getUserPreferences(userId: string) {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.userPreferences.create({
        data: {
          userId,
        },
      });
    }

    return preferences;
  }

  /**
   * Update user preferences (Premium only for round duration)
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check premium status for round duration changes
    if (dto.preferredRoundDuration !== undefined) {
      const isPremium =
        user.premium &&
        (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) >= new Date());

      if (!isPremium) {
        throw new ForbiddenException(
          'Flexible spin timing is available to premium users only',
        );
      }

      // Validate duration
      if (!this.ALLOWED_DURATIONS.includes(dto.preferredRoundDuration)) {
        throw new BadRequestException(
          `Invalid duration. Allowed: ${this.ALLOWED_DURATIONS.join(', ')} seconds (5, 10, or 20 minutes)`,
        );
      }
    }

    // Validate maxAutoSpinOrders
    if (dto.maxAutoSpinOrders !== undefined) {
      if (dto.maxAutoSpinOrders < 1 || dto.maxAutoSpinOrders > 50) {
        throw new BadRequestException(
          'Max auto-spin orders must be between 1 and 50',
        );
      }
    }

    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        preferredRoundDuration: dto.preferredRoundDuration,
        autoSpinEnabled: dto.autoSpinEnabled,
        maxAutoSpinOrders: dto.maxAutoSpinOrders,
        emailNotifications: dto.emailNotifications,
        pushNotifications: dto.pushNotifications,
      },
      create: {
        userId,
        preferredRoundDuration: dto.preferredRoundDuration,
        autoSpinEnabled: dto.autoSpinEnabled,
        maxAutoSpinOrders: dto.maxAutoSpinOrders ?? 50,
        emailNotifications: dto.emailNotifications ?? true,
        pushNotifications: dto.pushNotifications ?? true,
      },
    });
  }

  /**
   * Get preferred round duration for user (Premium feature)
   */
  async getPreferredRoundDuration(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return 1200; // Default 20 minutes
    }

    const isPremium =
      user.premium &&
      (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) >= new Date());

    if (!isPremium) {
      return 1200; // Regular users: 20 minutes
    }

    // Get preferences separately
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Premium users can have custom duration
    return preferences?.preferredRoundDuration ?? 1200;
  }
}

