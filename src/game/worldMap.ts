export const TILE_SIZE = 32;
export const MAP_COLS = 32;
export const MAP_ROWS = 28;

export const HOUSE_COLS = 12;
export const HOUSE_ROWS = 10;

// Farm tile types
export enum TileType {
  GRASS = 0,
  PATH = 1,
  WATER = 2,
  WATER_DEEP = 3,
  TILLED = 4,
  WATERED = 5,
  WOOD_DECK = 6,
  STONE = 7,
  FENCE = 8,
  HOUSE_WALL = 9,
  HOUSE_DOOR = 10,
  TREE = 11,
  FLOWER = 12,
}

// Generate default farm layout
export function createDefaultFarmMap(): number[][] {
  const map: number[][] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      // Boundaries
      if (y === 0 || y === MAP_ROWS - 1 || x === 0 || x === MAP_COLS - 1) {
        row.push(TileType.TREE);
        continue;
      }

      // Pond / River area (East & Southeast)
      const distToPond = Math.hypot(x - 24, y - 18);
      if (distToPond < 4.8) {
        row.push(distToPond < 2.5 ? TileType.WATER_DEEP : TileType.WATER);
        continue;
      }
      // Fishing dock / wooden deck next to pond
      if (x >= 18 && x <= 20 && y >= 17 && y <= 19) {
        row.push(TileType.WOOD_DECK);
        continue;
      }

      // Cozy Cottage exterior (Top left / center: x 4..11, y 3..7)
      if (x >= 4 && x <= 10 && y >= 3 && y <= 6) {
        if (x === 7 && y === 6) {
          row.push(TileType.HOUSE_DOOR); // Entrance
        } else {
          row.push(TileType.HOUSE_WALL);
        }
        continue;
      }

      // Stone path from house door downwards
      if (x === 7 && y >= 7 && y <= 16) {
        row.push(TileType.PATH);
        continue;
      }
      // Stone path branch to the fishing dock
      if (y === 14 && x >= 7 && x <= 18) {
        row.push(TileType.PATH);
        continue;
      }

      // Pre-tilled starter garden plots (x 9..14, y 8..12)
      if (x >= 9 && x <= 14 && y >= 8 && y <= 12) {
        row.push(TileType.TILLED);
        continue;
      }

      // Decorative flower patches
      if ((x === 3 && y === 9) || (x === 12 && y === 15) || (x === 16 && y === 7) || (x === 22 && y === 10)) {
        row.push(TileType.FLOWER);
        continue;
      }

      // Orchard trees on upper right
      if ((x === 20 && y === 4) || (x === 25 && y === 5) || (x === 17 && y === 5)) {
        row.push(TileType.TREE);
        continue;
      }

      // Wooden fence surrounding garden
      if ((y === 7 && x >= 8 && x <= 15) || (y === 13 && x >= 8 && x <= 15) || (x === 15 && y >= 7 && y <= 13)) {
        if (!(x === 11 && y === 13)) { // open gate
          row.push(TileType.FENCE);
          continue;
        }
      }

      row.push(TileType.GRASS);
    }
    map.push(row);
  }
  return map;
}

// Default cottage interior map
export function createDefaultHouseMap(): number[][] {
  const map: number[][] = [];
  for (let y = 0; y < HOUSE_ROWS; y++) {
    const row: number[] = [];
    for (let x = 0; x < HOUSE_COLS; x++) {
      if (y === 0 || x === 0 || x === HOUSE_COLS - 1) {
        row.push(TileType.HOUSE_WALL);
      } else if (y === HOUSE_ROWS - 1) {
        if (x === Math.floor(HOUSE_COLS / 2)) {
          row.push(TileType.HOUSE_DOOR); // Exit back to farm
        } else {
          row.push(TileType.HOUSE_WALL);
        }
      } else {
        row.push(TileType.WOOD_DECK); // Warm wooden parquet floor
      }
    }
    map.push(row);
  }
  return map;
}

// Collision check
export function isTileSolid(
  tileType: number,
  isInHouse: boolean,
  hasFurniture: boolean = false
): boolean {
  if (hasFurniture) return true;
  if (tileType === TileType.WATER || tileType === TileType.WATER_DEEP) return true;
  if (tileType === TileType.HOUSE_WALL) return true;
  if (tileType === TileType.TREE) return true;
  if (tileType === TileType.FENCE) return true;
  return false;
}
