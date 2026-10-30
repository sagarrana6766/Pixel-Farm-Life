import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  action?: string;
  emote?: string;
  skin: any;
  currentRoom: string; // 'farm' or 'house'
  heldItem?: string;
}

interface WorldState {
  tiles: Record<string, {
    tilled?: boolean;
    watered?: boolean;
    crop?: {
      id: string;
      plantedAt: number;
      stage: number;
      maxStage: number;
    };
    furniture?: {
      id: string;
      type: string;
      x: number;
      y: number;
      rotation: number;
    };
  }>;
  houseFurniture: Record<string, {
    id: string;
    type: string;
    x: number;
    y: number;
    rotation: number;
  }>;
}

const rooms: Record<string, {
  players: Map<string, { ws: WebSocket; state: PlayerState }>;
  world: WorldState;
}> = {};

function getOrCreateRoom(roomId: string) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      players: new Map(),
      world: {
        tiles: {},
        houseFurniture: {
          'furn-bed-1': { id: 'furn-bed-1', type: 'bed_quilt', x: 2, y: 2, rotation: 0 },
          'furn-table-1': { id: 'furn-table-1', type: 'tea_table', x: 5, y: 4, rotation: 0 },
          'furn-hearth-1': { id: 'furn-hearth-1', type: 'fireplace', x: 8, y: 1, rotation: 0 },
          'furn-rug-1': { id: 'furn-rug-1', type: 'bear_rug', x: 5, y: 5, rotation: 0 },
          'furn-plant-1': { id: 'furn-plant-1', type: 'potted_monstera', x: 1, y: 6, rotation: 0 },
          'furn-gramophone-1': { id: 'furn-gramophone-1', type: 'record_player', x: 8, y: 6, rotation: 0 },
        }
      }
    };
  }
  return rooms[roomId];
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  // Room status API for quick LAN room discovery
  app.get('/api/rooms', (req, res) => {
    const list = Object.keys(rooms).map(id => ({
      id,
      playerCount: rooms[id].players.size,
    }));
    res.json(list);
  });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId = 'whispering-valley';
    let playerId = 'player_' + Math.random().toString(36).substring(2, 9);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        const room = getOrCreateRoom(currentRoomId);

        switch (data.type) {
          case 'join': {
            if (data.roomId) {
              // Leave previous if changed
              if (currentRoomId !== data.roomId && rooms[currentRoomId]) {
                rooms[currentRoomId].players.delete(playerId);
                broadcastToRoom(currentRoomId, {
                  type: 'player:left',
                  id: playerId,
                }, ws);
              }
              currentRoomId = data.roomId;
            }
            playerId = data.id || playerId;
            const newRoom = getOrCreateRoom(currentRoomId);
            const playerState: PlayerState = {
              id: playerId,
              name: data.name || 'Cozy Farmer',
              x: data.x ?? 16,
              y: data.y ?? 18,
              direction: data.direction || 'down',
              isMoving: false,
              skin: data.skin,
              currentRoom: data.currentRoom || 'farm',
              heldItem: data.heldItem,
            };
            newRoom.players.set(playerId, { ws, state: playerState });

            // Send initial world & players list to newcomer
            const currentPlayers = Array.from(newRoom.players.values()).map(p => p.state);
            ws.send(JSON.stringify({
              type: 'init',
              id: playerId,
              roomId: currentRoomId,
              players: currentPlayers,
              world: newRoom.world,
            }));

            // Notify others
            broadcastToRoom(currentRoomId, {
              type: 'player:joined',
              player: playerState,
            }, ws);
            break;
          }

          case 'move': {
            const playerEntry = room.players.get(playerId);
            if (playerEntry) {
              playerEntry.state.x = data.x;
              playerEntry.state.y = data.y;
              playerEntry.state.direction = data.direction;
              playerEntry.state.isMoving = data.isMoving;
              playerEntry.state.currentRoom = data.currentRoom || playerEntry.state.currentRoom;
              playerEntry.state.heldItem = data.heldItem;

              broadcastToRoom(currentRoomId, {
                type: 'player:moved',
                id: playerId,
                x: data.x,
                y: data.y,
                direction: data.direction,
                isMoving: data.isMoving,
                currentRoom: playerEntry.state.currentRoom,
                heldItem: data.heldItem,
              }, ws);
            }
            break;
          }

          case 'action': {
            broadcastToRoom(currentRoomId, {
              type: 'player:action',
              id: playerId,
              action: data.action,
              target: data.target,
            }, ws);
            break;
          }

          case 'emote': {
            broadcastToRoom(currentRoomId, {
              type: 'player:emote',
              id: playerId,
              emote: data.emote,
            });
            break;
          }

          case 'chat': {
            broadcastToRoom(currentRoomId, {
              type: 'chat:message',
              id: playerId,
              name: data.name || 'Friend',
              text: data.text,
              timestamp: Date.now(),
            });
            break;
          }

          case 'skin:update': {
            const playerEntry = room.players.get(playerId);
            if (playerEntry) {
              playerEntry.state.skin = data.skin;
              playerEntry.state.name = data.name || playerEntry.state.name;
              broadcastToRoom(currentRoomId, {
                type: 'player:skin_updated',
                id: playerId,
                skin: data.skin,
                name: playerEntry.state.name,
              }, ws);
            }
            break;
          }

          case 'world:tile_update': {
            // e.g. till, water, plant, harvest
            const { key, tileData } = data;
            if (key) {
              if (tileData === null) {
                delete room.world.tiles[key];
              } else {
                room.world.tiles[key] = {
                  ...room.world.tiles[key],
                  ...tileData,
                };
              }
              broadcastToRoom(currentRoomId, {
                type: 'world:tile_updated',
                key,
                tileData: room.world.tiles[key] || null,
              });
            }
            break;
          }

          case 'world:house_furniture_update': {
            const { furnId, furnData } = data;
            if (furnId) {
              if (furnData === null) {
                delete room.world.houseFurniture[furnId];
              } else {
                room.world.houseFurniture[furnId] = furnData;
              }
              broadcastToRoom(currentRoomId, {
                type: 'world:house_furniture_updated',
                furnId,
                furnData,
              });
            }
            break;
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      if (rooms[currentRoomId]) {
        rooms[currentRoomId].players.delete(playerId);
        broadcastToRoom(currentRoomId, {
          type: 'player:left',
          id: playerId,
        });
      }
    });
  });

  function broadcastToRoom(roomId: string, messageObj: any, excludeWs?: WebSocket) {
    const room = rooms[roomId];
    if (!room) return;
    const msg = JSON.stringify(messageObj);
    room.players.forEach(({ ws }) => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌲 Whispering Pines server active on port ${PORT}`);
  });
}

startServer();
