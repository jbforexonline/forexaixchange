import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DurationMinutes } from '@prisma/client';

// Client-side duration preference tracking
interface ClientDurationPreference {
  userId?: string;
  durationMinutes: DurationMinutes;
  subscribedAt: Date;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  
  // Track client duration preferences for targeted broadcasts
  private clientDurations: Map<string, ClientDurationPreference> = new Map();

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
    // Default to 20-minute duration
    this.clientDurations.set(client.id, {
      durationMinutes: DurationMinutes.TWENTY,
      subscribedAt: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientDurations.delete(client.id);
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

  // =============================================================================
  // v3.0: MULTI-DURATION SUPPORT
  // =============================================================================

  /**
   * v3.0: Handle client selecting their preferred duration
   * Client joins a duration-specific room for targeted updates
   */
  @SubscribeMessage('selectDuration')
  handleSelectDuration(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { durationMinutes: number; userId?: string },
  ) {
    // Validate duration (only 5, 10, 20 allowed - no 15)
    const validDurations = [5, 10, 20];
    if (!validDurations.includes(data.durationMinutes)) {
      return { success: false, error: 'Invalid duration. Only 5, 10, or 20 minutes supported.' };
    }

    // Map to enum
    let durationEnum: DurationMinutes;
    switch (data.durationMinutes) {
      case 5: durationEnum = DurationMinutes.FIVE; break;
      case 10: durationEnum = DurationMinutes.TEN; break;
      default: durationEnum = DurationMinutes.TWENTY;
    }

    // Leave previous duration room and join new one
    const previous = this.clientDurations.get(client.id);
    if (previous) {
      client.leave(`duration:${previous.durationMinutes}`);
    }
    
    client.join(`duration:${durationEnum}`);
    
    // Update tracking
    this.clientDurations.set(client.id, {
      userId: data.userId,
      durationMinutes: durationEnum,
      subscribedAt: new Date(),
    });

    this.logger.debug(`Client ${client.id} selected ${data.durationMinutes}-minute duration`);
    
    return { 
      success: true, 
      durationMinutes: data.durationMinutes,
      durationEnum,
    };
  }

  /**
   * v3.0: Subscribe to market instance updates for a specific instance
   */
  @SubscribeMessage('subscribeInstance')
  handleSubscribeInstance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { instanceId: string },
  ) {
    if (!data.instanceId) {
      return { success: false, error: 'Instance ID required' };
    }

    client.join(`instance:${data.instanceId}`);
    this.logger.debug(`Client ${client.id} subscribed to instance ${data.instanceId}`);
    
    return { success: true, instanceId: data.instanceId };
  }

  /**
   * v3.0: Unsubscribe from market instance updates
   */
  @SubscribeMessage('unsubscribeInstance')
  handleUnsubscribeInstance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { instanceId: string },
  ) {
    if (data.instanceId) {
      client.leave(`instance:${data.instanceId}`);
    }
    return { success: true };
  }

  /**
   * v3.0: Broadcast master clock tick to all clients
   * Includes timer for each duration
   */
  broadcastMasterClockTick(data: {
    masterRoundId: string;
    roundNumber: number;
    masterRemainingSeconds: number;
    durationTimers: {
      five: number;
      ten: number;
      twenty: number;
    };
    phase: string;
    serverTime: number;
  }) {
    this.server.emit('masterClockTick', data);
  }

  /**
   * v3.0: Broadcast aggregated market stats (for "one market feel")
   */
  broadcastAggregatedStats(masterRoundId: string, stats: {
    totalActivityAmount: number;
    liveBettorsCount: number;
    heatIndex: { outer: number; middle: number; inner: number; overall: number };
    pools: {
      outerBuy: number;
      outerSell: number;
      middleBlue: number;
      middleRed: number;
      innerHighVol: number;
      innerLowVol: number;
      globalIndecision: number;
    };
    byDuration: {
      five: { amount: number; bets: number; users: number };
      ten: { amount: number; bets: number; users: number };
      twenty: { amount: number; bets: number; users: number };
    };
  }) {
    this.server.emit('aggregatedStatsUpdated', {
      masterRoundId,
      ...stats,
      timestamp: Date.now(),
    });
  }

  /**
   * v3.0: Broadcast market instance state change
   */
  broadcastInstanceStateChange(data: {
    instanceId: string;
    masterRoundId: string;
    durationMinutes: string;
    windowStart: number;
    windowEnd: number;
    status: string;
    frozenAt?: Date;
    settledAt?: Date;
  }) {
    // Broadcast to all
    this.server.emit('marketInstanceStateChanged', data);
    
    // Also broadcast to specific duration room
    this.server.to(`duration:${data.durationMinutes}`).emit('myMarketStateChanged', data);
    
    // And to specific instance subscribers
    this.server.to(`instance:${data.instanceId}`).emit('instanceStateChanged', data);
  }

  /**
   * v3.0: Broadcast per-instance pool update (for instance-specific UI)
   */
  broadcastInstancePoolUpdate(instanceId: string, pools: {
    outerBuy: number;
    outerSell: number;
    middleBlue: number;
    middleRed: number;
    innerHighVol: number;
    innerLowVol: number;
    globalIndecision: number;
    totalVolume: number;
  }) {
    this.server.to(`instance:${instanceId}`).emit('instancePoolsUpdated', {
      instanceId,
      pools,
      timestamp: Date.now(),
    });
  }

  /**
   * v3.0: Get count of clients per duration (for analytics)
   */
  getDurationStats(): { five: number; ten: number; twenty: number; total: number } {
    const stats = { five: 0, ten: 0, twenty: 0, total: 0 };
    
    for (const pref of this.clientDurations.values()) {
      stats.total++;
      switch (pref.durationMinutes) {
        case DurationMinutes.FIVE: stats.five++; break;
        case DurationMinutes.TEN: stats.ten++; break;
        case DurationMinutes.TWENTY: stats.twenty++; break;
      }
    }
    
    return stats;
  }
}
