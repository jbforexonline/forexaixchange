import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor() {
    // Simple heartbeat as a connectivity check
    setInterval(() => {
      if (this.server) {
        this.server.emit('heartbeat', { ts: Date.now() });
      }
    }, 1000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join user to their personal room for wallet updates
   */
  joinUserRoom(client: Socket, userId: string) {
    client.join(`user:${userId}`);
    this.logger.log(`User ${userId} joined their room`);
  }
}
