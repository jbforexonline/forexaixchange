/**
 * WebSocket Client for Real-time Updates
 * Connects to the backend WebSocket gateway for live round/bet/wallet updates
 */

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 
  (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000')
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');

export type WebSocketEvent = 
  | 'roundSettled'
  | 'betPlaced'
  | 'totalsUpdated'
  | 'walletUpdated'
  | 'roundStateChanged'
  | 'connected'
  | 'disconnected'
  | 'error';

export type WebSocketEventHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<WebSocketEvent, Set<WebSocketEventHandler>> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;

  constructor() {
    // Initialize listener maps
    const events: WebSocketEvent[] = [
      'roundSettled',
      'betPlaced',
      'totalsUpdated',
      'walletUpdated',
      'roundStateChanged',
      'connected',
      'disconnected',
      'error',
    ];
    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    // Don't try to connect if we're in a server environment
    if (typeof window === 'undefined') {
      return;
    }

    this.isConnecting = true;
    const token = localStorage.getItem('token');
    
    // Check if WebSocket is supported
    if (typeof WebSocket === 'undefined') {
      this.isConnecting = false;
      return;
    }

    const url = token ? `${WS_URL}?token=${token}` : WS_URL;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected', {});
        // WebSocket connected successfully
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { event: eventType, ...payload } = data;
          
          if (eventType) {
            this.emit(eventType as WebSocketEvent, payload);
          }
        } catch (error) {
          // Silently handle parse errors
        }
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        // Suppress error logging - WebSocket may not be available
        // Only emit to listeners, don't spam console
        this.emit('error', { error });
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.emit('disconnected', {});
        
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.connect();
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      this.isConnecting = false;
      // Silently handle WebSocket creation errors
      this.emit('error', { error });
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to a WebSocket event
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
   * Unsubscribe from a WebSocket event
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
          console.error(`Error in WebSocket handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection state
   */
  getState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    if (!this.ws) return 'CLOSED';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      default:
        return 'CLOSED';
    }
  }

  /**
   * Send message to server (if needed)
   */
  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Silently ignore if WebSocket is not open
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

