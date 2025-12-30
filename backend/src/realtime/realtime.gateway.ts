import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor() {
    // Simple heartbeat as a connectivity check
    setInterval(() => this.server.emit('heartbeat', { ts: Date.now() }), 1000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Handle client joining a room (e.g., user:${userId} for private events)
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    // Validate room name to prevent abuse
    if (room && typeof room === 'string' && room.startsWith('user:')) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
      return { success: true, room };
    }
    return { success: false, error: 'Invalid room name' };
  }

  /**
   * Join user to their personal room for wallet updates
   */
  joinUserRoom(client: Socket, userId: string) {
    client.join(`user:${userId}`);
    this.logger.log(`User ${userId} joined their room`);
  }
}
