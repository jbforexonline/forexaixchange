/**
 * WebSocket Client for Real-time Updates
 * Uses Socket.IO for real-time connection to backend
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export type WebSocketEvent = 
  | 'roundSettled'
  | 'betPlaced'
  | 'totalsUpdated'
  | 'walletUpdated'
  | 'roundOpened'
  | 'roundStateChanged'
  | 'heartbeat'
  | 'connected'
  | 'disconnected'
  | 'error'
  // v3.0: Multi-duration market instance events
  | 'marketInstanceSettled'
  | 'marketInstanceFrozen'
  | 'masterClockTick'
  | 'aggregatedStatsUpdated';

export type WebSocketEventHandler = (data: any) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<WebSocketEvent, Set<WebSocketEventHandler>> = new Map();
  private isConnecting = false;

  constructor() {
    // Initialize listener maps
    const events: WebSocketEvent[] = [
      'roundSettled',
      'betPlaced',
      'totalsUpdated',
      'walletUpdated',
      'roundOpened',
      'roundStateChanged',
      'heartbeat',
      'connected',
      'disconnected',
      'error',
      // v3.0: Multi-duration market instance events
      'marketInstanceSettled',
      'marketInstanceFrozen',
      'masterClockTick',
      'aggregatedStatsUpdated',
    ];
    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Connect to Socket.IO server
   */
  connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    // Don't try to connect if we're in a server environment
    if (typeof window === 'undefined') {
      return;
    }

    this.isConnecting = true;
    const token = localStorage.getItem('token');
    
    try {
      // Create Socket.IO connection with auth token
      this.socket = io(SOCKET_URL, {
        auth: {
          token: token || undefined,
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 3000,
      });

      // Connection successful
      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('✅ Socket.IO connected');
        
        // Join user-specific room for private events (wallet updates, etc.)
        const userStr = localStorage.getItem('user');
        if (userStr && this.socket) {
          try {
            const user = JSON.parse(userStr);
            if (user?.id) {
              this.socket.emit('joinRoom', `user:${user.id}`);
              console.log(`📡 Joined room: user:${user.id}`);
            }
          } catch (e) {
            console.error('Failed to parse user for room join:', e);
          }
        }
        
        this.emit('connected', {});
      });

      // Listen for all custom events
      this.socket.on('roundSettled', (data) => this.emit('roundSettled', data));
      this.socket.on('betPlaced', (data) => this.emit('betPlaced', data));
      this.socket.on('totalsUpdated', (data) => this.emit('totalsUpdated', data));
      this.socket.on('walletUpdated', (data) => this.emit('walletUpdated', data));
      this.socket.on('roundStateChanged', (data) => this.emit('roundStateChanged', data));
      this.socket.on('heartbeat', (data) => this.emit('heartbeat', data));
      
      // v3.0: Multi-duration market instance events
      this.socket.on('marketInstanceSettled', (data) => this.emit('marketInstanceSettled', data));
      this.socket.on('marketInstanceFrozen', (data) => this.emit('marketInstanceFrozen', data));
      this.socket.on('masterClockTick', (data) => this.emit('masterClockTick', data));
      this.socket.on('aggregatedStatsUpdated', (data) => this.emit('aggregatedStatsUpdated', data));

      // Error handling
      this.socket.on('connect_error', (error) => {
        this.isConnecting = false;
        console.error('Socket.IO connection error:', error.message);
        this.emit('error', { error });
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;
        console.log('Socket.IO disconnected:', reason);
        this.emit('disconnected', { reason });
      });

    } catch (error) {
      this.isConnecting = false;
      console.error('Socket.IO setup error:', error);
      this.emit('error', { error });
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to a Socket.IO event
   */
  on(event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.add(handler);
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Unsubscribe from a Socket.IO event
   */
  off(event: WebSocketEvent, handler: WebSocketEventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: WebSocketEvent, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in Socket.IO handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection state
   */
  getState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    if (!this.socket) return 'CLOSED';
    if (this.isConnecting) return 'CONNECTING';
    return this.socket.connected ? 'OPEN' : 'CLOSED';
  }

  /**
   * Send message to server (if needed)
   */
  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

/**
 * Get WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

/**
 * Initialize WebSocket connection
 */
export function initWebSocket(): WebSocketClient {
  const client = getWebSocketClient();
  if (client.getState() === 'CLOSED') {
    client.connect();
  }
  return client;
}

/**
 * Cleanup WebSocket connection
 */
export function cleanupWebSocket(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}

