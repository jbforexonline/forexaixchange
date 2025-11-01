// =============================================================================
// CHAT CONTROLLER - Community Chatroom
// =============================================================================
// Path: backend/src/chat/chat.controller.ts
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import type { CreateMessageDto } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChatRoomType } from '@prisma/client';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to room' })
  async sendMessage(
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: any,
    @Request() req: any,
  ) {
    return this.chatService.sendMessage(
      user.id,
      dto,
      req.ip || req.headers['x-forwarded-for'],
    );
  }

  @Get(':roomType')
  @ApiOperation({ summary: 'Get recent messages for a room' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getMessages(@Param('roomType') roomType: ChatRoomType) {
    return this.chatService.getMessages(roomType);
  }

  @Delete('message/:messageId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a message (Admin only)' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    return this.chatService.deleteMessage(messageId, user.id, body.reason);
  }
}

