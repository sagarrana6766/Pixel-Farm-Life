import { Direction, FurnitureInstance, RemotePlayer, SkinConfig, TimeState, WorldTile } from '../types/game';
import { CROPS, FURNITURE_CATALOG } from './gameData';
import { PixelCharacterRenderer } from './pixelRenderer';
import { HOUSE_COLS, HOUSE_ROWS, MAP_COLS, MAP_ROWS, TILE_SIZE, TileType } from './worldMap';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type: 'leaf' | 'firefly' | 'smoke' | 'sparkle' | 'steam' | 'ripple';
}

export interface FishShadow {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  size: number;
  angle: number;
}

export class WorldRenderer {
  private particles: Particle[] = [];
  private fishShadows: FishShadow[] = [];

  constructor() {
    this.initAmbientParticles();
    this.initFishShadows();
  }

  private initAmbientParticles() {
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * (MAP_COLS * TILE_SIZE),
        y: Math.random() * (MAP_ROWS * TILE_SIZE),
        vx: 0.2 + Math.random() * 0.4,
        vy: 0.1 + Math.random() * 0.3,
        color: Math.random() > 0.5 ? '#fbcfe8' : '#fed7aa', // petals
        size: 2 + Math.random() * 2,
        alpha: 0.5 + Math.random() * 0.4,
        decay: 0.002,
        type: 'leaf',
      });
    }
  }

  private initFishShadows() {
    // 4 swimming fish shadows in the pond area (approx x: 22..26, y: 16..20)
    for (let i = 0; i < 4; i++) {
      this.fishShadows.push({
        x: (22 + Math.random() * 4) * TILE_SIZE,
        y: (16 + Math.random() * 4) * TILE_SIZE,
        targetX: (22 + Math.random() * 4) * TILE_SIZE,
        targetY: (16 + Math.random() * 4) * TILE_SIZE,
        speed: 0.4 + Math.random() * 0.3,
        size: 10 + Math.random() * 6,
        angle: 0,
      });
    }
  }

  public updateParticles(timeState: TimeState) {
    const maxX = MAP_COLS * TILE_SIZE;
    const maxY = MAP_ROWS * TILE_SIZE;

    // Add chimney smoke from house (chimney at tile x: 4.5, y: 2.2)
    if (Math.random() < 0.15) {
      this.particles.push({
        x: 4.8 * TILE_SIZE + (Math.random() * 6 - 3),
        y: 2.5 * TILE_SIZE,
        vx: 0.1 + (Math.random() * 0.2 - 0.1),
        vy: -0.4 - Math.random() * 0.3,
        color: '#e2e8f0',
        size: 4 + Math.random() * 3,
        alpha: 0.5,
        decay: 0.008,
        type: 'smoke',
      });
    }

    // Fireflies at night
    if (timeState.isNight && Math.random() < 0.2 && this.particles.filter(p => p.type === 'firefly').length < 25) {
      this.particles.push({
        x: Math.random() * maxX,
        y: Math.random() * maxY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: '#fef08a',
        size: 2,
        alpha: 0.8,
        decay: 0.003,
        type: 'firefly',
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.type === 'leaf') {
        p.vx = 0.3 + Math.sin(Date.now() * 0.002 + p.x) * 0.2;
        if (p.x > maxX || p.y > maxY || p.alpha <= 0) {
          p.x = Math.random() * maxX * 0.8;
          p.y = 0;
          p.alpha = 0.7;
        }
      } else if (p.type === 'firefly') {
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;
        p.vx = Math.max(-0.4, Math.min(0.4, p.vx));
        p.vy = Math.max(-0.4, Math.min(0.4, p.vy));
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      } else {
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    // Update fish shadows
    this.fishShadows.forEach(fish => {
      const dx = fish.targetX - fish.x;
      const dy = fish.targetY - fish.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 8) {
        // Pick new target within pond
        fish.targetX = (22.2 + Math.random() * 3.6) * TILE_SIZE;
        fish.targetY = (16.2 + Math.random() * 3.6) * TILE_SIZE;
      } else {
        fish.angle = Math.atan2(dy, dx);
        fish.x += Math.cos(fish.angle) * fish.speed;
        fish.y += Math.sin(fish.angle) * fish.speed;
      }
    });
  }

  public addBurstParticles(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        color,
        size: 3 + Math.random() * 2,
        alpha: 1.0,
        decay: 0.04 + Math.random() * 0.03,
        type: 'sparkle',
      });
    }
  }

  // Draw Farm World
  public renderFarm(
    ctx: CanvasRenderingContext2D,
    farmMap: number[][],
    worldTiles: Record<string, WorldTile>,
    furniture: Record<string, FurnitureInstance>,
    cameraX: number,
    cameraY: number,
    timeState: TimeState,
    gameTime: number,
    viewWidth: number = ctx.canvas.width,
    viewHeight: number = ctx.canvas.height
  ) {
    const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const endCol = Math.min(MAP_COLS - 1, Math.ceil((cameraX + viewWidth) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE));
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil((cameraY + viewHeight) / TILE_SIZE));

    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    // 1. Draw base terrain tiles
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tileType = farmMap[y]?.[x] ?? TileType.GRASS;
        const key = `${x},${y}`;
        const tileData = worldTiles[key];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        this.renderTile(ctx, tileType, tileData, px, py, gameTime, x, y);
      }
    }

    // 2. Swimming fish shadows in pond
    this.renderFishShadows(ctx);

    // 3. Crops on tilled plots
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const key = `${x},${y}`;
        const tileData = worldTiles[key];
        if (tileData && tileData.crop) {
          this.renderCrop(ctx, tileData.crop, x * TILE_SIZE, y * TILE_SIZE, gameTime);
        }
      }
    }

    // 4. Cottage House Structure (Exterior)
    this.renderCottageExterior(ctx, 4 * TILE_SIZE, 2.5 * TILE_SIZE, gameTime, timeState);

    // 5. Farm Outdoor Furniture
    Object.values(furniture).forEach(furn => {
      this.renderFurniturePiece(ctx, furn, gameTime);
    });

    // 6. Ambient drifting particles
    this.renderParticles(ctx);

    ctx.restore();

    // 7. Time of Day ambient tint overlay
    this.renderDayNightLighting(ctx, timeState, viewWidth, viewHeight);
  }

  // Draw Cottage Interior
  public renderHouse(
    ctx: CanvasRenderingContext2D,
    houseMap: number[][],
    furniture: Record<string, FurnitureInstance>,
    cameraX: number,
    cameraY: number,
    timeState: TimeState,
    gameTime: number,
    decoratingMode: boolean,
    cursorTile?: { x: number; y: number; valid: boolean },
    viewWidth: number = ctx.canvas.width,
    viewHeight: number = ctx.canvas.height
  ) {
    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    // House room background & walls
    for (let y = 0; y < HOUSE_ROWS; y++) {
      for (let x = 0; x < HOUSE_COLS; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const type = houseMap[y]?.[x];

        if (type === TileType.HOUSE_WALL) {
          // Cozy timber wallpaper
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          // Wallpaper decorative stripe
          ctx.fillStyle = '#b45309';
          ctx.fillRect(px, py + 12, TILE_SIZE, 2);
        } else if (type === TileType.HOUSE_DOOR) {
          // Warm doormat entrance
          ctx.fillStyle = '#b45309';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.fillStyle = '#78350f';
          ctx.font = '10px monospace';
          ctx.fillText('EXIT', px + 5, py + 20);
        } else {
          // Parquet wooden floorboards
          ctx.fillStyle = (x + y) % 2 === 0 ? '#d97706' : '#b45309';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Plank lines
          ctx.fillStyle = 'rgba(69, 26, 3, 0.2)';
          ctx.fillRect(px, py + 8, TILE_SIZE, 1);
          ctx.fillRect(px, py + 16, TILE_SIZE, 1);
          ctx.fillRect(px, py + 24, TILE_SIZE, 1);
        }
      }
    }

    // Window on back wall with time-of-day sky view
    this.renderCozyWindow(ctx, 4 * TILE_SIZE, 0, timeState);
    this.renderCozyWindow(ctx, 8 * TILE_SIZE, 0, timeState);

    // Render placed furniture
    Object.values(furniture).forEach(furn => {
      this.renderFurniturePiece(ctx, furn, gameTime);
    });

    // Decorating grid overlay
    if (decoratingMode && cursorTile) {
      ctx.strokeStyle = cursorTile.valid ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(cursorTile.x * TILE_SIZE, cursorTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = cursorTile.valid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(cursorTile.x * TILE_SIZE, cursorTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // Fireplace warm glow particles inside
    this.renderParticles(ctx);

    ctx.restore();

    // Warm indoor lighting
    ctx.save();
    ctx.fillStyle = 'rgba(254, 215, 170, 0.12)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  private renderTile(
    ctx: CanvasRenderingContext2D,
    type: TileType,
    tileData: WorldTile | undefined,
    px: number,
    py: number,
    gameTime: number,
    col: number,
    row: number
  ) {
    if (tileData && tileData.tilled) {
      // Tilled dirt or watered dirt
      if (tileData.watered) {
        ctx.fillStyle = '#451a03'; // dark wet soil
      } else {
        ctx.fillStyle = '#78350f'; // tilled brown soil
      }
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      // Furrows
      ctx.fillStyle = tileData.watered ? '#290e03' : '#572207';
      ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, 4);
      ctx.fillRect(px + 4, py + 14, TILE_SIZE - 8, 4);
      ctx.fillRect(px + 4, py + 24, TILE_SIZE - 8, 4);

      if (tileData.watered) {
        // Water glistening specks
        ctx.fillStyle = '#60a5fa';
        const sparkle = Math.sin(gameTime * 0.005 + col * 2 + row) > 0.6;
        if (sparkle) {
          ctx.fillRect(px + 8, py + 8, 2, 2);
          ctx.fillRect(px + 20, py + 18, 2, 2);
        }
      }
      return;
    }

    switch (type) {
      case TileType.GRASS: {
        // Lush grass with subtle pixel variation
        const isAlt = (col * 7 + row * 13) % 5 === 0;
        ctx.fillStyle = isAlt ? '#4ade80' : '#22c55e';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Grass blade tufts
        if ((col + row) % 3 === 0) {
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(px + 8, py + 14, 2, 4);
          ctx.fillRect(px + 10, py + 12, 2, 6);
        }
        break;
      }

      case TileType.PATH: {
        // Cobblestone path
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(px + 2, py + 2, 12, 12);
        ctx.fillRect(px + 16, py + 2, 14, 12);
        ctx.fillRect(px + 2, py + 16, 14, 14);
        ctx.fillRect(px + 18, py + 16, 12, 14);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(px + 3, py + 3, 3, 3);
        break;
      }

      case TileType.WATER:
      case TileType.WATER_DEEP: {
        // Sparkling water with animated gentle waves
        const isDeep = type === TileType.WATER_DEEP;
        ctx.fillStyle = isDeep ? '#0284c7' : '#38bdf8';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        const waveOffset = Math.sin(gameTime * 0.003 + col * 0.8 + row * 0.8) * 4;
        ctx.fillStyle = isDeep ? '#0369a1' : '#7dd3fc';
        ctx.fillRect(px + 4, py + 10 + waveOffset, 12, 2);
        ctx.fillRect(px + 16, py + 22 - waveOffset, 10, 2);

        // Floating water lily on select spots
        if ((col === 23 && row === 17) || (col === 25 && row === 19)) {
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(px + 14, py + 14, 7, 0, Math.PI * 1.8);
          ctx.fill();
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(px + 13, py + 12, 4, 4);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(px + 14, py + 13, 2, 2);
        }
        break;
      }

      case TileType.WOOD_DECK: {
        // Fishing dock planks
        ctx.fillStyle = '#d97706';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px, py + 6, TILE_SIZE, 1);
        ctx.fillRect(px, py + 14, TILE_SIZE, 1);
        ctx.fillRect(px, py + 22, TILE_SIZE, 1);
        ctx.fillRect(px, py + 30, TILE_SIZE, 1);
        // Nail studs
        ctx.fillStyle = '#451a03';
        ctx.fillRect(px + 3, py + 3, 2, 2);
        ctx.fillRect(px + TILE_SIZE - 5, py + 3, 2, 2);
        break;
      }

      case TileType.TREE: {
        // Pine/Fruit tree
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 12, py + 18, 8, 14);
        // Foliage
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(px + 16, py + 14, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(px + 14, py + 11, 10, 0, Math.PI * 2);
        ctx.fill();
        // Red apples on select trees
        if (col % 2 === 0) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px + 9, py + 10, 4, 4);
          ctx.fillRect(px + 18, py + 13, 4, 4);
        }
        break;
      }

      case TileType.FENCE: {
        // Grass beneath
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Wooden fence post & rail
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px + 12, py + 6, 8, 22);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(px, py + 10, TILE_SIZE, 4);
        ctx.fillRect(px, py + 20, TILE_SIZE, 4);
        break;
      }

      case TileType.FLOWER: {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Colorful blossoms
        const flowerCol = col % 2 === 0 ? '#f43f5e' : '#fbbf24';
        ctx.fillStyle = flowerCol;
        ctx.fillRect(px + 6, py + 8, 6, 6);
        ctx.fillRect(px + 18, py + 16, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 8, py + 10, 2, 2);
        ctx.fillRect(px + 20, py + 18, 2, 2);
        break;
      }

      default: {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private renderCrop(
    ctx: CanvasRenderingContext2D,
    cropState: NonNullable<WorldTile['crop']>,
    px: number,
    py: number,
    gameTime: number
  ) {
    const def = CROPS[cropState.id] || CROPS.strawberry;
    const stage = Math.min(def.stages, Math.max(1, cropState.stage));

    if (stage === 1) {
      // Tiny seedling sprout
      ctx.fillStyle = '#86efac';
      ctx.fillRect(px + 14, py + 16, 4, 8);
      ctx.fillRect(px + 11, py + 14, 4, 3);
      ctx.fillRect(px + 17, py + 14, 4, 3);
    } else if (stage === 2) {
      // Growing foliage
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(px + 13, py + 12, 6, 14);
      ctx.fillRect(px + 7, py + 14, 6, 5);
      ctx.fillRect(px + 19, py + 14, 6, 5);
    } else if (stage === 3) {
      // Budding flower stage
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(px + 10, py + 10, 12, 16);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(px + 13, py + 8, 6, 6);
    } else {
      // Fully ripe bountiful harvest!
      ctx.fillStyle = '#15803d';
      ctx.fillRect(px + 6, py + 8, 20, 18);

      // Large fruit
      ctx.fillStyle = def.fruitColor;
      ctx.beginPath();
      ctx.arc(px + 16, py + 16, 9, 0, Math.PI * 2);
      ctx.fill();

      // Fruit shine / seeds
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px + 13, py + 13, 2, 2);
      ctx.fillRect(px + 17, py + 17, 2, 2);

      // Harvest ready sparkle
      const bob = Math.sin(gameTime * 0.006) * 3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 15, py + 2 + bob, 3, 3);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('READY', px + 3, py + 2);
    }
  }

  private renderCottageExterior(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    gameTime: number,
    timeState: TimeState
  ) {
    const w = 7 * TILE_SIZE;
    const h = 4.5 * TILE_SIZE;

    // Stone foundation
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x, y + h - 16, w, 16);

    // Warm timber walls
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x, y + 40, w, h - 56);
    // Timber siding planks
    ctx.fillStyle = '#b45309';
    for (let p = y + 46; p < y + h - 16; p += 12) {
      ctx.fillRect(x, p, w, 2);
    }

    // Cozy pitched roof with shingles
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 42);
    ctx.lineTo(x + w / 2, y - 16);
    ctx.lineTo(x + w + 12, y + 42);
    ctx.closePath();
    ctx.fill();

    // Roof rim
    ctx.fillStyle = '#991b1b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 44);
    ctx.lineTo(x + w / 2, y - 18);
    ctx.lineTo(x + w + 16, y + 44);
    ctx.stroke();

    // Stone chimney on left
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 18, y - 24, 18, 38);
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + 16, y - 28, 22, 6);

    // Front door
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x + w / 2 - 16, y + h - 42, 32, 42);
    // Brass door handle
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x + w / 2 + 6, y + h - 22, 4, 4);

    // Welcome mat
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + w / 2 - 18, y + h - 4, 36, 6);

    // Windows with warm light inside
    const windowGlow = timeState.isNight ? '#fde047' : '#fef08a';
    // Left window
    ctx.fillStyle = windowGlow;
    ctx.fillRect(x + 24, y + 60, 24, 28);
    ctx.fillStyle = '#78350f'; // mullions
    ctx.fillRect(x + 35, y + 60, 2, 28);
    ctx.fillRect(x + 24, y + 73, 24, 2);
    // Flower box under window
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + 20, y + 88, 32, 6);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(x + 23, y + 84, 6, 6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x + 33, y + 84, 6, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 43, y + 84, 6, 6);

    // Right window
    ctx.fillStyle = windowGlow;
    ctx.fillRect(x + w - 48, y + 60, 24, 28);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + w - 37, y + 60, 2, 28);
    ctx.fillRect(x + w - 48, y + 73, 24, 2);
    // Flower box
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + w - 52, y + 88, 32, 6);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(x + w - 49, y + 84, 6, 6);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(x + w - 39, y + 84, 6, 6);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x + w - 29, y + 84, 6, 6);

    // Overhead sign
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x + w / 2 - 32, y + 36, 64, 16);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('COZY HOME', x + w / 2 - 25, y + 48);
  }

  private renderCozyWindow(ctx: CanvasRenderingContext2D, x: number, y: number, timeState: TimeState) {
    const skyCol = timeState.isNight ? '#0f172a' : '#38bdf8';
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 2, y + 2, 28, 28);
    ctx.fillStyle = skyCol;
    ctx.fillRect(x, y + 4, 24, 24);

    if (timeState.isNight) {
      // Crescent moon & stars
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x + 14, y + 8, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 10, 2, 2);
      ctx.fillRect(x + 18, y + 18, 2, 2);
    } else {
      // Golden sun
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(x + 12, y + 14, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Window frame
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + 11, y + 4, 2, 24);
    ctx.fillRect(x, y + 15, 24, 2);
  }

  private renderFurniturePiece(ctx: CanvasRenderingContext2D, furn: FurnitureInstance, gameTime: number) {
    const px = furn.x * TILE_SIZE;
    const py = furn.y * TILE_SIZE;

    switch (furn.type) {
      case 'bed_quilt': {
        // Quilt bed (2x2)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px, py, TILE_SIZE * 2, TILE_SIZE * 2);
        // Headboard
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px, py, TILE_SIZE * 2, 10);
        // Fluffy pillows
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 4, py + 12, 24, 14);
        ctx.fillRect(px + 34, py + 12, 24, 14);
        // Patchwork quilt
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(px + 4, py + 26, TILE_SIZE * 2 - 8, TILE_SIZE * 2 - 30);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(px + 6, py + 30, 22, 14);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(px + 32, py + 30, 24, 14);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(px + 6, py + 46, 22, 14);
        break;
      }

      case 'fireplace': {
        // Stone hearth fireplace (2x2)
        ctx.fillStyle = '#475569';
        ctx.fillRect(px, py, TILE_SIZE * 2, TILE_SIZE * 2);
        // Mantelpiece
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px - 4, py, TILE_SIZE * 2 + 8, 10);
        // Fire cavity
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + 10, py + 18, TILE_SIZE * 2 - 20, TILE_SIZE * 2 - 20);
        // Animated crackling flames
        const flameH = 12 + Math.sin(gameTime * 0.02) * 4;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(px + 14, py + 48 - flameH, 14, flameH);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px + 24, py + 50 - flameH * 0.9, 14, flameH * 0.9);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(px + 20, py + 52 - flameH * 0.6, 12, flameH * 0.6);
        break;
      }

      case 'tea_table': {
        // Rustic tea table (2x1)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 2, py + 8, TILE_SIZE * 2 - 4, 18);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 4, py + 6, TILE_SIZE * 2 - 8, 4);
        // Teapot & steam
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px + 14, py, 12, 10);
        ctx.fillStyle = '#ffffff'; // tea cup
        ctx.fillRect(px + 38, py + 2, 8, 8);
        break;
      }

      case 'bear_rug': {
        // Bear woven rug (2x2)
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(px + TILE_SIZE, py + TILE_SIZE, 26, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Bear ears
        ctx.fillRect(px + 12, py + 4, 10, 10);
        ctx.fillRect(px + 42, py + 4, 10, 10);
        // Snout
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE, py + TILE_SIZE - 4, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.fillRect(px + TILE_SIZE - 2, py + TILE_SIZE - 6, 4, 4);
        break;
      }

      case 'potted_monstera': {
        // Monstera in pot (1x1)
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(px + 8, py + 16, 16, 14);
        // Green leaves
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(px + 16, py + 10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(px + 12, py + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'record_player': {
        // Lo-Fi vinyl gramophone (1x1)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 4, py + 12, 24, 18);
        // Black spinning vinyl record
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 9, 0, Math.PI * 2);
        ctx.fill();
        // Vinyl center label
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 3, 0, Math.PI * 2);
        ctx.fill();
        // Brass horn
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px + 22, py + 6, 6, 0, Math.PI * 2);
        ctx.fill();
        // Floating musical note
        const noteBob = Math.sin(gameTime * 0.005) * 4;
        ctx.fillStyle = '#c084fc';
        ctx.font = '12px serif';
        ctx.fillText('♪', px + 18, py - 2 + noteBob);
        break;
      }

      case 'bookshelf': {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px, py, TILE_SIZE * 2, TILE_SIZE);
        // Colorful books
        const bookColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
        for (let b = 0; b < 10; b++) {
          ctx.fillStyle = bookColors[b % bookColors.length];
          ctx.fillRect(px + 4 + b * 6, py + 4, 4, 22);
        }
        break;
      }

      default: {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      }
    }
  }

  private renderFishShadows(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.fishShadows.forEach(fish => {
      ctx.save();
      ctx.translate(fish.x, fish.y);
      ctx.rotate(fish.angle);
      // Gentle dark silhouette swimming underwater
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.size, fish.size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail fin
      ctx.beginPath();
      ctx.moveTo(-fish.size, 0);
      ctx.lineTo(-fish.size - 6, -5);
      ctx.lineTo(-fish.size - 6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      if (p.type === 'leaf') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 1.5, p.size * 0.8, p.vx * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'firefly') {
        // Glowing halo
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      } else if (p.type === 'smoke') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    });
  }

  private renderDayNightLighting(
    ctx: CanvasRenderingContext2D,
    timeState: TimeState,
    viewWidth: number = ctx.canvas.width,
    viewHeight: number = ctx.canvas.height
  ) {
    const hour = timeState.hour + timeState.minute / 60;
    let color = 'rgba(0, 0, 0, 0)';

    if (hour >= 5 && hour < 7) {
      // Dawn / Sunrise: warm peachy rose
      const prog = (hour - 5) / 2;
      color = `rgba(251, 146, 60, ${0.25 - prog * 0.15})`;
    } else if (hour >= 7 && hour < 17) {
      // Daytime: bright and clear
      color = 'rgba(254, 240, 138, 0.04)';
    } else if (hour >= 17 && hour < 20) {
      // Golden Hour Sunset: glowing amber
      const prog = (hour - 17) / 3;
      color = `rgba(245, 158, 11, ${0.15 + prog * 0.25})`;
    } else {
      // Nighttime: cozy deep indigo/navy with moonlight
      color = 'rgba(15, 23, 42, 0.45)';
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.restore();
  }

  // Render a player (local or remote)
  public renderPlayer(
    ctx: CanvasRenderingContext2D,
    x: number, // world pixel x
    y: number, // world pixel y
    name: string,
    skin: SkinConfig,
    direction: Direction,
    isMoving: boolean,
    walkFrame: number,
    action?: string,
    actionProgress: number = 0,
    isLocal: boolean = false,
    emote?: { icon: string; expiresAt: number },
    heldItemIcon?: string
  ) {
    const frame = isMoving ? (walkFrame % 2 === 0 ? 1 : 2) : 0;
    const sprite = PixelCharacterRenderer.getCharacterCanvas(skin, direction, frame, action, actionProgress);

    // Draw sprite (32x32) centered at player feet
    ctx.drawImage(sprite, x - 16, y - 28);

    // Overhead Nametag
    ctx.save();
    ctx.font = 'bold 10px monospace';
    const tagText = isLocal ? `${name} (You)` : name;
    const metrics = ctx.measureText(tagText);
    const tagW = metrics.width + 12;
    const tagH = 14;
    const tagX = x - tagW / 2;
    const tagY = y - 38;

    // Nametag badge background
    ctx.fillStyle = isLocal ? 'rgba(30, 41, 59, 0.75)' : 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 4);
    ctx.fill();

    // Nametag text
    ctx.fillStyle = isLocal ? '#a7f3d0' : '#ffffff';
    ctx.fillText(tagText, tagX + 6, tagY + 11);

    // Held item icon next to nametag
    if (heldItemIcon) {
      ctx.font = '10px serif';
      ctx.fillText(heldItemIcon, tagX + tagW - 4, tagY + 11);
    }

    // Overhead Emote Bubble (if active)
    if (emote && emote.expiresAt > Date.now()) {
      const bubbleY = tagY - 22;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, bubbleY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pointer tail
      ctx.beginPath();
      ctx.moveTo(x - 3, bubbleY + 11);
      ctx.lineTo(x, bubbleY + 16);
      ctx.lineTo(x + 3, bubbleY + 11);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Emote icon
      ctx.font = '13px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emote.icon, x, bubbleY);
    }

    ctx.restore();
  }

  // Render Fishing Cast Line & Bobber
  public renderFishingBobber(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    bobberX: number,
    bobberY: number,
    hasBite: boolean,
    gameTime: number
  ) {
    ctx.save();

    // Thin curved fishing line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playerX, playerY - 16);
    // Quadratic curve sag
    const midX = (playerX + bobberX) / 2;
    const midY = (playerY + bobberY) / 2 - 14;
    ctx.quadraticCurveTo(midX, midY, bobberX, bobberY);
    ctx.stroke();

    // Water ripple ring around bobber
    const rippleRadius = 4 + (Math.sin(gameTime * 0.008) + 1) * 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(bobberX, bobberY, rippleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Red & white round bobber float
    const bobOffset = Math.sin(gameTime * 0.006) * 2;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bobberX - 3, bobberY - 4 + bobOffset, 6, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bobberX - 3, bobberY + bobOffset, 6, 4);

    // Bite "!" Alert with bounce
    if (hasBite) {
      const alertBob = Math.sin(gameTime * 0.02) * 3;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(bobberX, bobberY - 18 + alertBob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', bobberX, bobberY - 17 + alertBob);
    }

    ctx.restore();
  }

  // 2D Tactical Tile Action Cursor
  public renderTileCursor(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    actionHint?: string
  ) {
    const px = tileX * TILE_SIZE;
    const py = tileY * TILE_SIZE;
    const s = 5;

    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;

    // Corner brackets
    // Top-left
    ctx.beginPath();
    ctx.moveTo(px, py + s);
    ctx.lineTo(px, py);
    ctx.lineTo(px + s, py);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(px + TILE_SIZE - s, py);
    ctx.lineTo(px + TILE_SIZE, py);
    ctx.lineTo(px + TILE_SIZE, py + s);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(px, py + TILE_SIZE - s);
    ctx.lineTo(px, py + TILE_SIZE);
    ctx.lineTo(px + s, py + TILE_SIZE);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(px + TILE_SIZE - s, py + TILE_SIZE);
    ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
    ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE - s);
    ctx.stroke();

    // Subtle yellow tile highlight fill
    ctx.fillStyle = 'rgba(253, 224, 71, 0.12)';
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    if (actionHint) {
      ctx.font = 'bold 9px monospace';
      const tw = ctx.measureText(actionHint).width + 10;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(px + TILE_SIZE / 2 - tw / 2, py - 14, tw, 13, 3);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(actionHint, px + TILE_SIZE / 2, py - 4);
    }

    ctx.restore();
  }
}
