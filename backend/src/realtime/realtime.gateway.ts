import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway {
  @WebSocketServer() server: Server;

  constructor() {
    // Simple heartbeat as a connectivity check
    setInterval(() => this.server.emit('heartbeat', { ts: Date.now() }), 1000);
  }
}
