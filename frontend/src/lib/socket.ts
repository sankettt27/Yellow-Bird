/**
 * WebSocket manager for real-time GPS tracking.
 * Handles connections to FastAPI WebSocket endpoints.
 */

import { useAuthStore } from '@/stores/authStore';

/**
 * WebSocket URL resolution:
 * - In browser dev: uses Vite proxy (relative path through same host)
 * - In native APK: uses VITE_API_URL env var (set to your localtunnel/server URL)
 */
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://yellow-bird.onrender.com' : '');

const WS_BASE_URL = rawApiUrl
  ? rawApiUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/v1'
  : `${protocol}//${window.location.host}/api/v1`;

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentUrl = '';
  private isIntentionalDisconnect = false;

  private onMessageCallback: ((data: any) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  connectDriver(busId: string) {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Cannot connect WS: No auth token');
    this.connect(`${WS_BASE_URL}/tracking/ws/driver/${busId}?token=${token}`);
  }

  connectSubscriber(busId: string) {
    // Admin/parent subscribing to a bus (auth handled by session context/token if required, 
    // but the backend tracking endpoint for subscribers doesn't currently enforce it via query param)
    this.connect(`${WS_BASE_URL}/tracking/ws/track/${busId}`);
  }

  connectGlobalSubscriber() {
    this.connect(`${WS_BASE_URL}/tracking/ws/track_all`);
  }

  private connect(url: string) {
    if (this.socket) {
      this.disconnect();
    }
    
    this.currentUrl = url;
    this.isIntentionalDisconnect = false;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('✅ WebSocket Connected:', url);
      this.reconnectAttempts = 0;
      if (this.onConnectCallback) this.onConnectCallback();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessageCallback) this.onMessageCallback(data);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    this.socket.onclose = () => {
      console.log('🔴 WebSocket Disconnected');
      if (this.onDisconnectCallback) this.onDisconnectCallback();
      this.socket = null;
      
      if (!this.isIntentionalDisconnect) {
        this.attemptReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      // onerror is usually followed by onclose
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket max reconnect attempts reached.');
      return;
    }
    
    this.reconnectAttempts++;
    const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    console.log(`Reconnecting in ${timeout}ms (Attempt ${this.reconnectAttempts})...`);
    
    setTimeout(() => {
      if (!this.isIntentionalDisconnect && this.currentUrl) {
        this.connect(this.currentUrl);
      }
    }, timeout);
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('Cannot send message: WebSocket is not open.');
    }
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Event listeners
  onMessage(callback: (data: any) => void) {
    this.onMessageCallback = callback;
  }
  
  onConnect(callback: () => void) {
    this.onConnectCallback = callback;
  }
  
  onDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }
}

// Export a singleton instance
export const wsClient = new WebSocketManager();
