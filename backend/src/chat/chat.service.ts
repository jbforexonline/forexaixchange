// =============================================================================
// CHAT SERVICE - Community Chatroom (Premium/Verified Users)
// =============================================================================
// Path: backend/src/chat/chat.service.ts
// =============================================================================

import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ChatRoomType } from '@prisma/client';

export interface CreateMessageDto {
  content: string;
  roomType: ChatRoomType;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly MAX_MESSAGE_LENGTH = 500;
  private readonly RATE_LIMIT_SECONDS = 2; // Max 1 message per 2 seconds

  constructor(private prisma: PrismaService) {}

  /**
   * Send a chat message (Premium/Verified users for PREMIUM room)
   */
  async sendMessage(userId: string, dto: CreateMessageDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check room access
    if (dto.roomType === ChatRoomType.PREMIUM) {
      const isPremium =
        user.premium &&
        (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) >= new Date());
      const isVerified = user.verificationBadge || user.isVerified;

      if (!isPremium && !isVerified) {
        throw new ForbiddenException(
          'Premium chatroom is available to premium or verified users only',
        );
      }
    }

    if (dto.roomType === ChatRoomType.ADMIN) {
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Admin chatroom access denied');
      }
    }

    // Validate content
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }

    if (dto.content.length > this.MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Message too long. Maximum ${this.MAX_MESSAGE_LENGTH} characters`,
      );
    }

    // Rate limiting
    const recentMessage = await this.prisma.chatMessage.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - this.RATE_LIMIT_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentMessage) {
      throw new BadRequestException(
        `Rate limit: Please wait ${this.RATE_LIMIT_SECONDS} seconds between messages`,
      );
    }

    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        userId,
        content: dto.content.trim(),
        roomType: dto.roomType,
        ipAddress,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            premium: true,
            verificationBadge: true,
          },
        },
      },
    });

    this.logger.log(
      `💬 Chat message: ${user.username} in ${dto.roomType} room`,
    );

    return message;
  }

  /**
   * Get recent messages for a room
   */
  async getMessages(roomType: ChatRoomType, limit = 50) {
    return this.prisma.chatMessage.findMany({
      where: {
        roomType,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            premium: true,
            verificationBadge: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Delete a message (Admin/Moderator)
   */
  async deleteMessage(
    messageId: string,
    deleterId: string,
    reason?: string,
  ) {
    const deleter = await this.prisma.user.findUnique({
      where: { id: deleterId },
    });

    if (!deleter || (deleter.role !== 'ADMIN' && deleter.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only admins can delete messages');
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedBy: deleterId,
        deletedAt: new Date(),
        deleteReason: reason,
      },
    });
  }
}

