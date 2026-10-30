import { Direction, FurnitureInstance, RemotePlayer, SkinConfig, WorldTile } from '../types/game';

type MessageHandler = (data: any) => void;

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private messageHandlers: Set<MessageHandler> = new Set();
  private localBroadcast: BroadcastChannel | null = null;
  private reconnectTimer: number | null = null;
  private pendingRoomId: string = 'whispering-valley';
  private localPlayerId: string = 'p_' + Math.random().toString(36).substring(2, 8);

  constructor() {
    try {
      this.localBroadcast = new BroadcastChannel('whispering_pines_lan');
      this.localBroadcast.onmessage = (event) => {
        this.emitToHandlers(event.data);
      };
    } catch (e) {
      // BroadcastChannel not available in some older contexts
    }
  }

  public connect(roomId: string, localState: {
    name: string;
    x: number;
    y: number;
    direction: Direction;
    skin: SkinConfig;
    currentRoom: 'farm' | 'house';
  }) {
    this.pendingRoomId = roomId;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.send({
          type: 'join',
          id: this.localPlayerId,
          roomId: this.pendingRoomId,
          name: localState.name,
          x: localState.x,
          y: localState.y,
          direction: localState.direction,
          skin: localState.skin,
          currentRoom: localState.currentRoom,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emitToHandlers(data);
        } catch (err) {
          console.error('Failed to parse WS msg:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // Schedule reconnect
        if (!this.reconnectTimer) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect(this.pendingRoomId, localState);
          }, 3500);
        }
      };

      this.ws.onerror = (err) => {
        // Fallback to local broadcast channel
        this.isConnected = false;
      };
    } catch (err) {
      this.isConnected = false;
    }
  }

  public onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private emitToHandlers(data: any) {
    this.messageHandlers.forEach(h => h(data));
  }

  public send(payload: any) {
    // Send over WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
    // Also broadcast to other tabs on LAN / machine
    if (this.localBroadcast) {
      try {
        this.localBroadcast.postMessage(payload);
      } catch (e) {}
    }
  }

  public sendMovement(x: number, y: number, direction: Direction, isMoving: boolean, currentRoom: 'farm' | 'house', heldItem?: string) {
    this.send({
      type: 'move',
      id: this.localPlayerId,
      x: Math.round(x),
      y: Math.round(y),
      direction,
      isMoving,
      currentRoom,
      heldItem,
    });
  }

  public sendAction(action: string, target?: { x: number; y: number }) {
    this.send({
      type: 'action',
      id: this.localPlayerId,
      action,
      target,
    });
  }

  public sendEmote(emote: string) {
    this.send({
      type: 'emote',
      id: this.localPlayerId,
      emote,
    });
  }

  public sendChat(name: string, text: string) {
    this.send({
      type: 'chat',
      id: this.localPlayerId,
      name,
      text,
    });
  }

  public sendSkinUpdate(name: string, skin: SkinConfig) {
    this.send({
      type: 'skin:update',
      id: this.localPlayerId,
      name,
      skin,
    });
  }

  public sendTileUpdate(key: string, tileData: any) {
    this.send({
      type: 'world:tile_update',
      key,
      tileData,
    });
  }

  public sendFurnitureUpdate(furnId: string, furnData: any) {
    this.send({
      type: 'world:house_furniture_update',
      furnId,
      furnData,
    });
  }

  public getPlayerId() {
    return this.localPlayerId;
  }

  public getIsConnected() {
    return this.isConnected;
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

export const multiplayer = new MultiplayerClient();
