import { Direction, FishDef, FurnitureInstance, InventoryItem, RemotePlayer, SkinConfig, TimeState, WorldTile } from '../types/game';
import { CROPS, INITIAL_INVENTORY, PRESET_SKINS } from './gameData';
import { lofiAudio } from '../audio/lofiAudio';
import { multiplayer } from './multiplayerClient';
import { WorldRenderer } from './worldRenderer';
import { 
  createDefaultFarmMap, createDefaultHouseMap, 
  HOUSE_COLS, HOUSE_ROWS, isTileSolid, MAP_COLS, MAP_ROWS, TILE_SIZE, TileType 
} from './worldMap';

export interface GameEngineCallbacks {
  onTimeUpdate: (time: TimeState) => void;
  onEnergyUpdate: (energy: number) => void;
  onCoinsUpdate: (coins: number) => void;
  onInventoryUpdate: (items: InventoryItem[]) => void;
  onStartFishingMiniGame: () => void;
  onPromptHouseEnter: (isInHouse: boolean) => void;
  onNotification: (text: string) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;
  private worldRenderer: WorldRenderer;

  // Maps
  public farmMap: number[][] = createDefaultFarmMap();
  public houseMap: number[][] = createDefaultHouseMap();
  public worldTiles: Record<string, WorldTile> = {};
  public houseFurniture: Record<string, FurnitureInstance> = {};

  // Player State
  public playerX = 16 * TILE_SIZE;
  public playerY = 16 * TILE_SIZE;
  public playerDirection: Direction = 'down';
  public isMoving = false;
  public walkFrame = 0;
  private walkStepTimer = 0;
  public currentRoom: 'farm' | 'house' = 'farm';
  public actionProgress = 0;
  public currentAction?: string;
  public activeEmote?: { icon: string; expiresAt: number };

  // Character Skin & Inventory
  public skin: SkinConfig = PRESET_SKINS.gardener;
  public inventory: InventoryItem[] = [...INITIAL_INVENTORY];
  public quickSlots: (InventoryItem | null)[] = [
    INITIAL_INVENTORY[0], // hoe
    INITIAL_INVENTORY[1], // water
    INITIAL_INVENTORY[2], // rod
    INITIAL_INVENTORY[3], // scythe
    INITIAL_INVENTORY[4], // strawberry seeds
    INITIAL_INVENTORY[8], // record player
  ];
  public activeSlotIdx = 0;
  public energy = 100;
  public maxEnergy = 100;
  public cozyCoins = 150;

  // Decorating
  public isDecorating = false;
  public decorRotation = 0;

  // Time & Day
  public timeState: TimeState = {
    day: 1,
    hour: 6,
    minute: 0,
    season: 'Spring',
    isNight: false,
  };
  private timeTickAccumulator = 0;

  // Remote Players
  public remotePlayers: Map<string, RemotePlayer> = new Map();

  // Fishing state
  public isFishing = false;
  public fishingTimer = 0;
  public bobberPos = { x: 0, y: 0 };
  public hasBite = false;

  // 2D Pixel Camera Zoom (Classic 2D retro scale)
  public zoom = 2.4;

  // Virtual Mobile Input
  public virtualInput = { dx: 0, dy: 0 };

  public setVirtualMovement(dx: number, dy: number) {
    this.virtualInput.dx = dx;
    this.virtualInput.dy = dy;
    if (dx !== 0 || dy !== 0) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.playerDirection = dx > 0 ? 'right' : 'left';
      } else {
        this.playerDirection = dy > 0 ? 'down' : 'up';
      }
    }
  }

  public rotateDecor() {
    if (this.isDecorating) {
      this.decorRotation = (this.decorRotation + 90) % 360;
      lofiAudio.playFootstep(true);
    }
  }

  // Controls & Game Loop
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private isRunning = false;
  private lastTime = 0;
  private animFrameId: number | null = null;
  private netSendTimer = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No 2d canvas context');
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;

    this.callbacks = callbacks;
    this.worldRenderer = new WorldRenderer();

    this.initDefaultWorld();
    this.setupInputs();
    this.setupMultiplayerListeners();
  }

  private initDefaultWorld() {
    // Initial planted strawberries and corn in pre-tilled starter garden
    const now = Date.now();
    this.worldTiles['10,9'] = {
      tilled: true,
      watered: true,
      wateredAt: now,
      crop: {
        id: 'strawberry',
        stage: 2,
        plantedAt: now - 8000,
        lastWateredAt: now,
        wateredCount: 1,
        ready: false,
      }
    };
    this.worldTiles['11,9'] = {
      tilled: true,
      watered: true,
      wateredAt: now,
      crop: {
        id: 'corn',
        stage: 1,
        plantedAt: now - 3000,
        lastWateredAt: now,
        wateredCount: 1,
        ready: false,
      }
    };

    // Default cottage furniture
    this.houseFurniture['furn-bed-1'] = { id: 'furn-bed-1', type: 'bed_quilt', x: 2, y: 2, rotation: 0 };
    this.houseFurniture['furn-hearth-1'] = { id: 'furn-hearth-1', type: 'fireplace', x: 8, y: 1, rotation: 0 };
    this.houseFurniture['furn-table-1'] = { id: 'furn-table-1', type: 'tea_table', x: 5, y: 4, rotation: 0 };
    this.houseFurniture['furn-rug-1'] = { id: 'furn-rug-1', type: 'bear_rug', x: 5, y: 5, rotation: 0 };
    this.houseFurniture['furn-plant-1'] = { id: 'furn-plant-1', type: 'potted_monstera', x: 1, y: 6, rotation: 0 };
    this.houseFurniture['furn-gramophone-1'] = { id: 'furn-gramophone-1', type: 'record_player', x: 8, y: 6, rotation: 0 };
  }

  private setupInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  public cleanup() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoom = Math.min(3.8, Math.round((this.zoom + 0.25) * 100) / 100);
    } else {
      this.zoom = Math.max(1.8, Math.round((this.zoom - 0.25) * 100) / 100);
    }
  };

  public cycleZoom(): number {
    const options = [1.8, 2.4, 3.0, 3.6];
    const currentIdx = options.findIndex(z => Math.abs(z - this.zoom) < 0.25);
    const nextIdx = (currentIdx + 1) % options.length;
    this.zoom = options[nextIdx];
    return this.zoom;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Avoid interfering with inputs/textareas
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (!this.heldKeys.has(e.code)) {
      this.justPressedKeys.add(e.code);
    }
    this.heldKeys.add(e.code);

    // Number keys 1-6 for quick slots
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
      const idx = parseInt(e.code.replace('Digit', '')) - 1;
      if (idx >= 0 && idx < 6) {
        this.activeSlotIdx = idx;
        lofiAudio.playFootstep();
      }
    }

    // Space action
    if (e.code === 'Space') {
      e.preventDefault();
      this.performAction();
    }

    // Decorate rotate
    if (e.code === 'KeyR' && this.isDecorating) {
      this.decorRotation = (this.decorRotation + 90) % 360;
      lofiAudio.playFootstep(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = () => {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
  };

  private handleCanvasClick = (e: MouseEvent) => {
    this.performAction();
  };

  private setupMultiplayerListeners() {
    multiplayer.onMessage((data) => {
      switch (data.type) {
        case 'init': {
          if (Array.isArray(data.players)) {
            data.players.forEach((p: RemotePlayer) => {
              if (p.id !== multiplayer.getPlayerId()) {
                this.remotePlayers.set(p.id, p);
              }
            });
          }
          if (data.world?.tiles) {
            this.worldTiles = { ...this.worldTiles, ...data.world.tiles };
          }
          if (data.world?.houseFurniture) {
            this.houseFurniture = { ...this.houseFurniture, ...data.world.houseFurniture };
          }
          break;
        }

        case 'player:joined': {
          if (data.player && data.player.id !== multiplayer.getPlayerId()) {
            this.remotePlayers.set(data.player.id, data.player);
            this.callbacks.onNotification(`${data.player.name} arrived at the farm! 🌸`);
            lofiAudio.playEmote();
          }
          break;
        }

        case 'player:moved': {
          const p = this.remotePlayers.get(data.id);
          if (p) {
            p.x = data.x;
            p.y = data.y;
            p.direction = data.direction;
            p.isMoving = data.isMoving;
            p.currentRoom = data.currentRoom;
            p.heldItem = data.heldItem;
          }
          break;
        }

        case 'player:action': {
          const p = this.remotePlayers.get(data.id);
          if (p && data.action) {
            if (data.action.includes('hoe')) lofiAudio.playTill();
            if (data.action.includes('water')) lofiAudio.playWater();
          }
          break;
        }

        case 'player:emote': {
          const p = this.remotePlayers.get(data.id);
          if (p) {
            p.emote = { icon: data.emote, expiresAt: Date.now() + 3000 };
            lofiAudio.playEmote();
          }
          break;
        }

        case 'player:left': {
          const p = this.remotePlayers.get(data.id);
          if (p) {
            this.callbacks.onNotification(`${p.name} waved goodbye.`);
            this.remotePlayers.delete(data.id);
          }
          break;
        }

        case 'player:skin_updated': {
          const p = this.remotePlayers.get(data.id);
          if (p) {
            p.skin = data.skin;
            p.name = data.name;
          }
          break;
        }

        case 'world:tile_updated': {
          if (data.tileData === null) {
            delete this.worldTiles[data.key];
          } else {
            this.worldTiles[data.key] = data.tileData;
          }
          break;
        }

        case 'world:house_furniture_updated': {
          if (data.furnData === null) {
            delete this.houseFurniture[data.furnId];
          } else {
            this.houseFurniture[data.furnId] = data.furnData;
          }
          break;
        }
      }
    });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // Clamp dt for 60fps simulation
    this.lastTime = currentTime;

    this.update(dt, currentTime);
    this.render(currentTime);

    this.justPressedKeys.clear();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, currentTime: number) {
    // 1. Time & Clock Simulation
    this.timeTickAccumulator += dt;
    if (this.timeTickAccumulator >= 1.5) { // every 1.5s = 10 game minutes
      this.timeTickAccumulator = 0;
      this.advanceGameTime(10);
    }

    // 2. Crop Growth Check
    this.updateCrops();

    // 3. Player Movement & Input
    this.updatePlayerMovement(dt);

    // 4. Action animation decay
    if (this.actionProgress > 0) {
      this.actionProgress -= dt * 3.5;
      if (this.actionProgress <= 0) {
        this.actionProgress = 0;
        this.currentAction = undefined;
      }
    }

    // 5. Fishing waiting loop
    if (this.isFishing) {
      this.fishingTimer += dt;
      if (this.fishingTimer >= 3.0 && !this.hasBite) {
        this.hasBite = true;
        lofiAudio.playBiteAlert();
      }
    }

    // 6. Network Position Broadcast Throttling (~20Hz)
    this.netSendTimer += dt;
    if (this.netSendTimer >= 0.05) {
      this.netSendTimer = 0;
      const activeItem = this.quickSlots[this.activeSlotIdx];
      multiplayer.sendMovement(
        this.playerX,
        this.playerY,
        this.playerDirection,
        this.isMoving,
        this.currentRoom,
        activeItem?.icon
      );
    }

    // 7. Ambient particles update
    this.worldRenderer.updateParticles(this.timeState);
  }

  private advanceGameTime(minutes: number) {
    let nextMinute = this.timeState.minute + minutes;
    let nextHour = this.timeState.hour;
    let nextDay = this.timeState.day;

    if (nextMinute >= 60) {
      nextHour += Math.floor(nextMinute / 60);
      nextMinute = nextMinute % 60;
    }

    if (nextHour >= 24) {
      nextHour = 0;
      nextDay += 1;
      this.onNewDay();
    }

    const isNight = nextHour < 6 || nextHour >= 19;
    this.timeState = {
      ...this.timeState,
      minute: nextMinute,
      hour: nextHour,
      day: nextDay,
      isNight,
    };
    this.callbacks.onTimeUpdate(this.timeState);
  }

  private onNewDay() {
    this.callbacks.onNotification('A new sunny morning begins over Whispering Pines! 🌅');
    // Refresh energy
    this.energy = this.maxEnergy;
    this.callbacks.onEnergyUpdate(this.energy);

    // Reset daily watering
    Object.keys(this.worldTiles).forEach(key => {
      const tile = this.worldTiles[key];
      if (tile && tile.watered) {
        tile.watered = false;
        tile.wateredAt = undefined;
      }
    });
  }

  public sleepUntilMorning() {
    lofiAudio.playDoor();
    this.timeState.hour = 6;
    this.timeState.minute = 0;
    this.timeState.day += 1;
    this.onNewDay();
    this.worldRenderer.addBurstParticles(this.playerX, this.playerY, '#fde047', 20);
  }

  private updateCrops() {
    const now = Date.now();
    Object.entries(this.worldTiles).forEach(([key, tile]) => {
      if (!tile || !tile.crop) return;
      const def = CROPS[tile.crop.id];
      if (!def) return;

      const elapsed = now - tile.crop.plantedAt;
      const stageDuration = def.growthTimeMs / def.stages;
      const calculatedStage = Math.min(def.stages, Math.floor(elapsed / stageDuration) + 1);

      if (calculatedStage !== tile.crop.stage) {
        tile.crop.stage = calculatedStage;
        if (calculatedStage >= def.stages) {
          tile.crop.ready = true;
        }
      }
    });
  }

  private updatePlayerMovement(dt: number) {
    if (this.isFishing || this.isDecorating) {
      this.isMoving = false;
      return;
    }

    let dx = this.virtualInput.dx;
    let dy = this.virtualInput.dy;

    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) {
      dy -= 1;
      this.playerDirection = 'up';
    }
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) {
      dy += 1;
      this.playerDirection = 'down';
    }
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) {
      dx -= 1;
      this.playerDirection = 'left';
    }
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) {
      dx += 1;
      this.playerDirection = 'right';
    }

    if (dx !== 0 && dy !== 0) {
      // Normalize diagonal
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.isMoving = dx !== 0 || dy !== 0;

    if (this.isMoving) {
      const speed = 135; // px/sec
      const nextX = this.playerX + dx * speed * dt;
      const nextY = this.playerY + dy * speed * dt;

      // Collision detection with map bounds & solid tiles
      if (this.canMoveTo(nextX, this.playerY)) {
        this.playerX = nextX;
      }
      if (this.canMoveTo(this.playerX, nextY)) {
        this.playerY = nextY;
      }

      // Step animation & footstep audio
      this.walkStepTimer += dt;
      if (this.walkStepTimer >= 0.22) {
        this.walkStepTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
        lofiAudio.playFootstep(this.currentRoom === 'house');
      }

      // Check door transitions
      this.checkDoorTransitions();
    } else {
      this.walkFrame = 0;
    }
  }

  private canMoveTo(px: number, py: number): boolean {
    const tileX = Math.floor(px / TILE_SIZE);
    const tileY = Math.floor(py / TILE_SIZE);

    if (this.currentRoom === 'farm') {
      if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) return false;
      const type = this.farmMap[tileY]?.[tileX];
      return !isTileSolid(type, false);
    } else {
      if (tileX < 0 || tileX >= HOUSE_COLS || tileY < 0 || tileY >= HOUSE_ROWS) return false;
      const type = this.houseMap[tileY]?.[tileX];
      // Check if blocked by placed furniture
      const isFurnSolid = Object.values(this.houseFurniture).some(f => {
        return Math.floor(f.x) === tileX && Math.floor(f.y) === tileY;
      });
      return !isTileSolid(type, true, isFurnSolid);
    }
  }

  private checkDoorTransitions() {
    const tileX = Math.floor(this.playerX / TILE_SIZE);
    const tileY = Math.floor(this.playerY / TILE_SIZE);

    if (this.currentRoom === 'farm') {
      // House door at x: 7, y: 6
      if (tileX === 7 && tileY === 6) {
        this.currentRoom = 'house';
        this.playerX = 6 * TILE_SIZE;
        this.playerY = 8 * TILE_SIZE; // inside door
        this.playerDirection = 'up';
        lofiAudio.playDoor();
        this.callbacks.onPromptHouseEnter(true);
        this.callbacks.onNotification('Stepped into your cozy cottage interior.');
      }
    } else {
      // Exit door at bottom center x: 6, y: 9
      if (tileX === 6 && tileY >= 9) {
        this.currentRoom = 'farm';
        this.playerX = 7 * TILE_SIZE;
        this.playerY = 7 * TILE_SIZE + 4; // outside door
        this.playerDirection = 'down';
        lofiAudio.playDoor();
        this.callbacks.onPromptHouseEnter(false);
        this.callbacks.onNotification('Stepped outside onto the sunny farm.');
      }
    }
  }

  public performAction() {
    // If currently fishing, reel in / hook
    if (this.isFishing) {
      if (this.hasBite) {
        this.isFishing = false;
        this.hasBite = false;
        this.callbacks.onStartFishingMiniGame();
      } else {
        // Cancel cast early
        this.isFishing = false;
        lofiAudio.playFootstep();
      }
      return;
    }

    const activeItem = this.quickSlots[this.activeSlotIdx];
    const targetTile = this.getTargetTileCoords();
    const tileKey = `${targetTile.x},${targetTile.y}`;

    this.actionProgress = 1.0;
    this.currentAction = activeItem?.id || 'interact';

    // Broadcast action to LAN peers
    multiplayer.sendAction(this.currentAction, targetTile);

    // 1. Check for ripe crop harvest first (regardless of equipped tool)
    const existingTile = this.worldTiles[tileKey];
    if (existingTile?.crop?.ready) {
      this.harvestCrop(tileKey, existingTile);
      return;
    }

    // 2. Check if interacting with House Bed to sleep
    if (this.currentRoom === 'house' && targetTile.x >= 2 && targetTile.x <= 3 && targetTile.y >= 2 && targetTile.y <= 3) {
      this.sleepUntilMorning();
      return;
    }

    // 3. Tool specific actions
    if (!activeItem) return;

    if (activeItem.id === 'tool_hoe') {
      this.useHoe(tileKey, targetTile);
    } else if (activeItem.id === 'tool_water') {
      this.useWaterCan(tileKey, targetTile);
    } else if (activeItem.id === 'tool_scythe') {
      this.useScythe(tileKey, targetTile);
    } else if (activeItem.id === 'tool_rod') {
      this.startFishing(targetTile);
    } else if (activeItem.category === 'seed') {
      this.plantSeed(activeItem, tileKey, targetTile);
    } else if (activeItem.category === 'furniture' && this.currentRoom === 'house') {
      this.placeFurniture(activeItem, targetTile);
    }
  }

  private getTargetTileCoords() {
    let tx = Math.floor(this.playerX / TILE_SIZE);
    let ty = Math.floor(this.playerY / TILE_SIZE);

    if (this.playerDirection === 'up') ty -= 1;
    if (this.playerDirection === 'down') ty += 1;
    if (this.playerDirection === 'left') tx -= 1;
    if (this.playerDirection === 'right') tx += 1;

    return { x: tx, y: ty };
  }

  private useHoe(key: string, target: { x: number; y: number }) {
    if (this.currentRoom !== 'farm') return;
    if (target.x <= 0 || target.x >= MAP_COLS - 1 || target.y <= 0 || target.y >= MAP_ROWS - 1) return;

    const tileType = this.farmMap[target.y]?.[target.x];
    if (tileType !== TileType.GRASS && tileType !== TileType.TILLED && tileType !== TileType.FLOWER) return;

    lofiAudio.playTill();
    this.energy = Math.max(0, this.energy - 2);
    this.callbacks.onEnergyUpdate(this.energy);

    this.worldTiles[key] = {
      ...this.worldTiles[key],
      tilled: true,
    };
    multiplayer.sendTileUpdate(key, this.worldTiles[key]);
    this.worldRenderer.addBurstParticles((target.x + 0.5) * TILE_SIZE, (target.y + 0.5) * TILE_SIZE, '#78350f', 6);
  }

  private useWaterCan(key: string, target: { x: number; y: number }) {
    if (this.currentRoom !== 'farm') return;
    const tile = this.worldTiles[key];
    if (!tile || !tile.tilled) return;

    lofiAudio.playWater();
    this.energy = Math.max(0, this.energy - 1);
    this.callbacks.onEnergyUpdate(this.energy);

    tile.watered = true;
    tile.wateredAt = Date.now();
    multiplayer.sendTileUpdate(key, tile);
    this.worldRenderer.addBurstParticles((target.x + 0.5) * TILE_SIZE, (target.y + 0.5) * TILE_SIZE, '#60a5fa', 8);
  }

  private useScythe(key: string, target: { x: number; y: number }) {
    if (this.currentRoom !== 'farm') return;
    lofiAudio.playFootstep();

    const tile = this.worldTiles[key];
    if (tile && !tile.crop) {
      delete this.worldTiles[key];
      multiplayer.sendTileUpdate(key, null);
    }
  }

  private plantSeed(item: InventoryItem, key: string, target: { x: number; y: number }) {
    if (this.currentRoom !== 'farm') return;
    const tile = this.worldTiles[key];
    if (!tile || !tile.tilled || tile.crop) return;

    lofiAudio.playPlant();
    const cropId = item.cropId || 'strawberry';
    const now = Date.now();

    tile.crop = {
      id: cropId,
      stage: 1,
      plantedAt: now,
      lastWateredAt: tile.watered ? now : 0,
      wateredCount: tile.watered ? 1 : 0,
      ready: false,
    };

    multiplayer.sendTileUpdate(key, tile);
    this.worldRenderer.addBurstParticles((target.x + 0.5) * TILE_SIZE, (target.y + 0.5) * TILE_SIZE, '#86efac', 7);

    // Consume 1 seed from inventory
    this.consumeQuickItem(item.id);
  }

  private harvestCrop(key: string, tile: WorldTile) {
    if (!tile.crop) return;
    const def = CROPS[tile.crop.id];
    if (!def) return;

    lofiAudio.playHarvest();
    const count = Math.floor(Math.random() * (def.harvestMax - def.harvestMin + 1)) + def.harvestMin;

    this.worldRenderer.addBurstParticles(this.playerX, this.playerY - 10, def.fruitColor, 15);
    this.callbacks.onNotification(`Harvested +${count} fresh ${def.name}! 🧺`);

    // Add harvest item to inventory
    this.addItemToInventory({
      id: def.harvestItemId,
      name: def.name,
      category: 'crop',
      count,
      icon: def.id === 'strawberry' ? '🍓' : def.id === 'corn' ? '🌽' : def.id === 'pumpkin' ? '🎃' : def.id === 'blueberry' ? '🫐' : '✨',
      description: `Bountiful fresh harvest of sweet ${def.name}. Can be eaten or sold for coins.`,
      sellPrice: 25,
    });

    // Reset crop plot (remains tilled)
    delete tile.crop;
    multiplayer.sendTileUpdate(key, tile);
  }

  private startFishing(target: { x: number; y: number }) {
    if (this.currentRoom !== 'farm') return;
    const tileType = this.farmMap[target.y]?.[target.x];

    // Must face water
    if (tileType !== TileType.WATER && tileType !== TileType.WATER_DEEP) {
      this.callbacks.onNotification('Stand near the pond or river dock to cast your fishing rod. 🌊');
      return;
    }

    lofiAudio.playCast();
    this.isFishing = true;
    this.fishingTimer = 0;
    this.hasBite = false;
    this.bobberPos = {
      x: (target.x + 0.5) * TILE_SIZE,
      y: (target.y + 0.5) * TILE_SIZE,
    };
    this.callbacks.onNotification('Line cast! Listen closely for the chime and "!" alert... 🎣');
  }

  public completeFishingSuccess(fish: FishDef, size: number) {
    this.addItemToInventory({
      id: `fish_${fish.id}`,
      name: `${fish.name} (${size}cm)`,
      category: 'fish',
      count: 1,
      icon: '🐟',
      description: fish.description,
      sellPrice: fish.sellPrice,
    });
    this.callbacks.onNotification(`Caught a ${fish.rarity} ${fish.name}! (${size}cm)`);
    multiplayer.sendChat(this.skin.name, `Just caught a ${fish.name} (${size}cm)! 🎣`);
  }

  private placeFurniture(item: InventoryItem, target: { x: number; y: number }) {
    const furnType = item.furnitureType || 'potted_monstera';
    const furnId = `furn_${Date.now()}`;

    this.houseFurniture[furnId] = {
      id: furnId,
      type: furnType,
      x: target.x,
      y: target.y,
      rotation: this.decorRotation,
    };

    lofiAudio.playPlaceDecor();
    multiplayer.sendFurnitureUpdate(furnId, this.houseFurniture[furnId]);
    this.consumeQuickItem(item.id);
  }

  public triggerEmote(icon: string) {
    this.activeEmote = { icon, expiresAt: Date.now() + 3000 };
    multiplayer.sendEmote(icon);
    lofiAudio.playEmote();
  }

  public sendChatMessage(text: string) {
    multiplayer.sendChat(this.skin.name, text);
  }

  public updateSkin(newSkin: SkinConfig) {
    this.skin = newSkin;
    multiplayer.sendSkinUpdate(newSkin.name, newSkin);
  }

  private consumeQuickItem(itemId: string) {
    const updated = this.inventory.map(i => {
      if (i.id === itemId) return { ...i, count: i.count - 1 };
      return i;
    }).filter(i => i.count > 0);

    this.inventory = updated;
    this.callbacks.onInventoryUpdate(updated);

    // Update quickslot
    this.quickSlots = this.quickSlots.map(slot => {
      if (slot && slot.id === itemId) {
        const found = updated.find(u => u.id === itemId);
        return found || null;
      }
      return slot;
    });
  }

  public addItemToInventory(item: InventoryItem) {
    const existing = this.inventory.find(i => i.id === item.id);
    let updated: InventoryItem[];

    if (existing) {
      updated = this.inventory.map(i => i.id === item.id ? { ...i, count: i.count + item.count } : i);
    } else {
      updated = [...this.inventory, item];
    }

    this.inventory = updated;
    this.callbacks.onInventoryUpdate(updated);

    // Place into quickslots if empty
    const emptyIdx = this.quickSlots.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      this.quickSlots[emptyIdx] = updated.find(i => i.id === item.id) || null;
    }
  }

  private render(gameTime: number) {
    const canvas = this.canvas;
    const ctx = this.ctx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Viewport dimensions in game pixels based on retro 2D zoom
    const viewW = canvas.width / this.zoom;
    const viewH = canvas.height / this.zoom;

    const isFarm = this.currentRoom === 'farm';
    const mapW = (isFarm ? MAP_COLS : HOUSE_COLS) * TILE_SIZE;
    const mapH = (isFarm ? MAP_ROWS : HOUSE_ROWS) * TILE_SIZE;

    // Camera follow with boundaries clamping
    let targetCamX = this.playerX - viewW / 2;
    let targetCamY = this.playerY - viewH / 2;

    if (viewW < mapW) {
      targetCamX = Math.max(0, Math.min(mapW - viewW, targetCamX));
    } else {
      targetCamX = (mapW - viewW) / 2;
    }

    if (viewH < mapH) {
      targetCamY = Math.max(0, Math.min(mapH - viewH, targetCamY));
    } else {
      targetCamY = (mapH - viewH) / 2;
    }

    const cameraX = Math.round(targetCamX);
    const cameraY = Math.round(targetCamY);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(this.zoom, this.zoom);

    // Target tile coordinate & action hint
    const targetTile = this.getTargetTileCoords();
    const targetKey = `${targetTile.x},${targetTile.y}`;
    const activeItem = this.quickSlots[this.activeSlotIdx];
    let actionHint: string | undefined;

    if (isFarm) {
      const tileType = this.farmMap[targetTile.y]?.[targetTile.x];
      const tileData = this.worldTiles[targetKey];

      if (tileData?.crop?.ready) {
        actionHint = '✨ Harvest (Space)';
      } else if (targetTile.x === 7 && targetTile.y === 6) {
        actionHint = '🚪 Enter Cottage (Space)';
      } else if (activeItem?.id === 'tool_hoe' && (tileType === TileType.GRASS || tileType === TileType.FLOWER || tileType === TileType.TILLED)) {
        actionHint = '⛏️ Till Soil (Space)';
      } else if (activeItem?.id === 'tool_water' && tileData?.tilled && !tileData.watered) {
        actionHint = '💧 Water (Space)';
      } else if (activeItem?.category === 'seed' && tileData?.tilled && !tileData.crop) {
        actionHint = `🌱 Sow Seeds (Space)`;
      } else if (activeItem?.id === 'tool_rod' && (tileType === TileType.WATER || tileType === TileType.WATER_DEEP)) {
        actionHint = '🎣 Cast Line (Space)';
      } else if (activeItem?.id === 'tool_scythe') {
        actionHint = '🌾 Clear (Space)';
      }

      // 1. Render Farm World
      this.worldRenderer.renderFarm(
        ctx,
        this.farmMap,
        this.worldTiles,
        this.houseFurniture,
        cameraX,
        cameraY,
        this.timeState,
        gameTime,
        viewW,
        viewH
      );

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      // 2. Render 2D Tile Cursor on targeted tile
      if (targetTile.x >= 0 && targetTile.x < MAP_COLS && targetTile.y >= 0 && targetTile.y < MAP_ROWS) {
        this.worldRenderer.renderTileCursor(ctx, targetTile.x, targetTile.y, actionHint);
      }

      // 3. Render Remote Players on farm
      this.remotePlayers.forEach(p => {
        if (p.currentRoom === 'farm') {
          this.worldRenderer.renderPlayer(
            ctx,
            p.x,
            p.y,
            p.name,
            p.skin,
            p.direction,
            p.isMoving,
            0,
            undefined,
            0,
            false,
            p.emote,
            p.heldItem
          );
        }
      });

      // 4. Render Local Player
      this.worldRenderer.renderPlayer(
        ctx,
        this.playerX,
        this.playerY,
        this.skin.name,
        this.skin,
        this.playerDirection,
        this.isMoving,
        this.walkFrame,
        this.currentAction,
        this.actionProgress,
        true,
        this.activeEmote,
        activeItem?.icon
      );

      // 5. Render Fishing Bobber if active
      if (this.isFishing) {
        this.worldRenderer.renderFishingBobber(
          ctx,
          this.playerX,
          this.playerY,
          this.bobberPos.x,
          this.bobberPos.y,
          this.hasBite,
          gameTime
        );
      }

      ctx.restore();
    } else {
      // In House Interior
      if (targetTile.x >= 2 && targetTile.x <= 3 && targetTile.y >= 2 && targetTile.y <= 3) {
        actionHint = '💤 Sleep until Dawn (Space)';
      } else if (targetTile.x === 6 && targetTile.y >= 9) {
        actionHint = '🚪 Step Outside (Space)';
      } else if (this.isDecorating && activeItem?.category === 'furniture') {
        actionHint = `🏡 Place ${activeItem.name} (Space)`;
      }

      // 1. Render Cottage Interior
      this.worldRenderer.renderHouse(
        ctx,
        this.houseMap,
        this.houseFurniture,
        cameraX,
        cameraY,
        this.timeState,
        gameTime,
        this.isDecorating,
        this.isDecorating ? { x: targetTile.x, y: targetTile.y, valid: true } : undefined,
        viewW,
        viewH
      );

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      // 2. Render 2D Tile Cursor inside house
      if (targetTile.x >= 0 && targetTile.x < HOUSE_COLS && targetTile.y >= 0 && targetTile.y < HOUSE_ROWS) {
        this.worldRenderer.renderTileCursor(ctx, targetTile.x, targetTile.y, actionHint);
      }

      // 3. Remote Players inside house
      this.remotePlayers.forEach(p => {
        if (p.currentRoom === 'house') {
          this.worldRenderer.renderPlayer(
            ctx,
            p.x,
            p.y,
            p.name,
            p.skin,
            p.direction,
            p.isMoving,
            0,
            undefined,
            0,
            false,
            p.emote,
            p.heldItem
          );
        }
      });

      // 4. Local Player inside house
      this.worldRenderer.renderPlayer(
        ctx,
        this.playerX,
        this.playerY,
        this.skin.name,
        this.skin,
        this.playerDirection,
        this.isMoving,
        this.walkFrame,
        this.currentAction,
        this.actionProgress,
        true,
        this.activeEmote,
        activeItem?.icon
      );

      ctx.restore();
    }

    ctx.restore();
  }
}
