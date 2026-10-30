export type Direction = 'up' | 'down' | 'left' | 'right';

export interface SkinConfig {
  name: string;
  bodyTone: string;
  hairStyle: 'curly' | 'short' | 'bob' | 'braids' | 'beanie' | 'straw_hat' | 'flower_wreath' | 'frog_hat';
  hairColor: string;
  eyeColor: string;
  shirtStyle: 'overalls' | 'flannel' | 'sweater' | 'apron' | 'hoodie' | 'tshirt';
  shirtColor: string;
  pantsStyle: 'jeans' | 'shorts' | 'skirt' | 'cargo';
  pantsColor: string;
  bootsColor: string;
  accessory: 'none' | 'glasses' | 'blush' | 'bandana' | 'leaf_in_mouth';
  customMatrix?: string[][]; // 12x12 custom pixel art layer
}

export type ToolType = 
  | 'hoe' 
  | 'watering_can' 
  | 'seeds_strawberry' 
  | 'seeds_corn' 
  | 'seeds_pumpkin' 
  | 'seeds_starflower'
  | 'seeds_blueberry'
  | 'fishing_rod' 
  | 'scythe' 
  | 'axe' 
  | 'furniture';

export interface InventoryItem {
  id: string;
  name: string;
  category: 'tool' | 'seed' | 'crop' | 'fish' | 'furniture' | 'material';
  count: number;
  icon: string;
  description: string;
  sellPrice?: number;
  buyPrice?: number;
  furnitureType?: string;
  cropId?: string;
}

export interface CropDef {
  id: string;
  name: string;
  seedId: string;
  growthTimeMs: number; // For demo/game feel, quick & satisfying (e.g. 20-40s)
  stages: number;
  harvestItemId: string;
  harvestMin: number;
  harvestMax: number;
  primaryColor: string;
  fruitColor: string;
}

export interface FishDef {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  difficulty: number; // 1 to 5
  speed: number;
  sellPrice: number;
  color: string;
  description: string;
  sizeMin: number;
  sizeMax: number;
}

export interface FurnitureDef {
  type: string;
  name: string;
  category: 'bed' | 'hearth' | 'table' | 'rug' | 'plant' | 'music' | 'light' | 'seat';
  width: number;
  height: number;
  price: number;
  description: string;
}

export interface WorldTile {
  tilled?: boolean;
  watered?: boolean;
  wateredAt?: number;
  crop?: {
    id: string;
    stage: number;
    plantedAt: number;
    lastWateredAt: number;
    wateredCount: number;
    ready: boolean;
  };
  decor?: string;
  blocked?: boolean;
}

export interface FurnitureInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
}

export interface RemotePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  skin: SkinConfig;
  currentRoom: 'farm' | 'house';
  heldItem?: string;
  emote?: {
    icon: string;
    expiresAt: number;
  };
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface TimeState {
  day: number;
  hour: number;
  minute: number;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  isNight: boolean;
}
