import { Direction, SkinConfig } from '../types/game';

// Dynamic Pixel Art Character Renderer
// Renders 24x32 or 32x32 crisp pixel art sprites onto an Offscreen/Canvas
export class PixelCharacterRenderer {
  private static spriteCache = new Map<string, HTMLCanvasElement>();

  public static getCharacterCanvas(
    skin: SkinConfig,
    direction: Direction,
    frame: number, // 0: idle, 1: step 1, 2: step 2
    action?: string,
    actionProgress?: number
  ): HTMLCanvasElement {
    const cacheKey = JSON.stringify({
      skin,
      direction,
      frame,
      action: action || 'none',
      prog: Math.floor((actionProgress || 0) * 10),
    });

    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = false;

    this.drawCharacter(ctx, skin, direction, frame, action, actionProgress);
    
    // Simple LRU cache cap
    if (this.spriteCache.size > 250) {
      const firstKey = this.spriteCache.keys().next().value;
      if (firstKey) this.spriteCache.delete(firstKey);
    }
    this.spriteCache.set(cacheKey, canvas);

    return canvas;
  }

  private static drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale = 2) {
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }

  private static drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, scale = 2) {
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
  }

  private static shadeColor(color: string, percent: number): string {
    let num = parseInt(color.replace('#', ''), 16);
    if (isNaN(num)) return color;
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private static drawCharacter(
    ctx: CanvasRenderingContext2D,
    skin: SkinConfig,
    dir: Direction,
    frame: number,
    action?: string,
    actionProgress: number = 0
  ) {
    const s = 2; // pixel scale (16x16 grid mapped to 32x32 canvas)
    const bounce = (frame === 1 || frame === 2) ? -1 : 0;
    const legOffset = frame === 1 ? -1 : frame === 2 ? 1 : 0;

    const bodyTone = skin.bodyTone || '#fbd5be';
    const bodyShadow = this.shadeColor(bodyTone, -30);
    const hairCol = skin.hairColor || '#78350f';
    const hairShadow = this.shadeColor(hairCol, -35);
    const shirtCol = skin.shirtColor || '#0284c7';
    const shirtShadow = this.shadeColor(shirtCol, -30);
    const pantsCol = skin.pantsColor || '#0369a1';
    const bootsCol = skin.bootsColor || '#92400e';
    const eyeCol = skin.eyeColor || '#292524';

    // 1. Shadow underneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(8 * s, 15.5 * s, 4.5 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Legs / Boots
    const yFoot = 13 + bounce;
    if (dir === 'up' || dir === 'down') {
      // Left leg
      this.drawRect(ctx, 5, yFoot, 2, 2, pantsCol, s);
      this.drawRect(ctx, 5, yFoot + 1 + (dir === 'down' ? legOffset : -legOffset), 2, 1, bootsCol, s);
      // Right leg
      this.drawRect(ctx, 9, yFoot, 2, 2, pantsCol, s);
      this.drawRect(ctx, 9, yFoot + 1 + (dir === 'down' ? -legOffset : legOffset), 2, 1, bootsCol, s);
    } else {
      // Side view legs
      this.drawRect(ctx, 6, yFoot, 3, 2, pantsCol, s);
      this.drawRect(ctx, 6 + legOffset, yFoot + 1, 3, 1, bootsCol, s);
    }

    // 3. Torso / Shirt / Overalls
    const yTorso = 8 + bounce;
    if (dir === 'up') {
      this.drawRect(ctx, 5, yTorso, 6, 5, shirtCol, s);
      this.drawRect(ctx, 5, yTorso + 3, 6, 2, pantsCol, s);
    } else if (dir === 'down') {
      this.drawRect(ctx, 5, yTorso, 6, 5, shirtCol, s);
      if (skin.shirtStyle === 'overalls') {
        // Overall straps
        this.drawRect(ctx, 5, yTorso + 1, 2, 4, pantsCol, s);
        this.drawRect(ctx, 9, yTorso + 1, 2, 4, pantsCol, s);
        this.drawRect(ctx, 6, yTorso + 3, 4, 2, pantsCol, s);
        // brass buttons
        this.drawPixel(ctx, 5, yTorso + 2, '#fbbf24', s);
        this.drawPixel(ctx, 10, yTorso + 2, '#fbbf24', s);
      } else if (skin.shirtStyle === 'apron') {
        this.drawRect(ctx, 6, yTorso + 1, 4, 4, '#f8fafc', s);
      } else {
        // belt / waist
        this.drawRect(ctx, 5, yTorso + 4, 6, 1, shirtShadow, s);
      }
    } else {
      // Left / Right
      const flip = dir === 'left';
      const xBody = flip ? 6 : 5;
      this.drawRect(ctx, xBody, yTorso, 5, 5, shirtCol, s);
      this.drawRect(ctx, xBody, yTorso + 3, 5, 2, pantsCol, s);
    }

    // 4. Arms & Hands (with tool action swings)
    let swingAngle = 0;
    if (action && actionProgress > 0) {
      swingAngle = Math.sin(actionProgress * Math.PI) * 4;
    }

    const yArm = 8 + bounce;
    if (dir === 'down') {
      // Left arm
      this.drawRect(ctx, 3, yArm + 1, 2, 3, shirtCol, s);
      this.drawRect(ctx, 3, yArm + 4, 2, 1, bodyTone, s);
      // Right arm (action arm)
      const armShift = Math.floor(swingAngle);
      this.drawRect(ctx, 11, yArm + 1 + armShift, 2, 3, shirtCol, s);
      this.drawRect(ctx, 11, yArm + 4 + armShift, 2, 1, bodyTone, s);
    } else if (dir === 'up') {
      this.drawRect(ctx, 3, yArm + 1, 2, 3, shirtCol, s);
      this.drawRect(ctx, 11, yArm + 1, 2, 3, shirtCol, s);
    } else if (dir === 'right') {
      this.drawRect(ctx, 7, yArm + 1 + Math.floor(swingAngle), 3, 3, shirtCol, s);
      this.drawRect(ctx, 8 + Math.floor(swingAngle), yArm + 4, 2, 1, bodyTone, s);
    } else {
      // Left
      this.drawRect(ctx, 6, yArm + 1 + Math.floor(swingAngle), 3, 3, shirtCol, s);
      this.drawRect(ctx, 6 - Math.floor(swingAngle), yArm + 4, 2, 1, bodyTone, s);
    }

    // 5. Head
    const yHead = 2 + bounce;
    // Base head
    this.drawRect(ctx, 4, yHead, 8, 6, bodyTone, s);
    this.drawRect(ctx, 4, yHead + 5, 8, 1, bodyShadow, s);

    // 6. Face (eyes, blush, accessories)
    if (dir === 'down') {
      // Eyes
      this.drawPixel(ctx, 6, yHead + 3, eyeCol, s);
      this.drawPixel(ctx, 9, yHead + 3, eyeCol, s);
      // Eye glimmer
      this.drawPixel(ctx, 6, yHead + 2, '#ffffff', s);
      this.drawPixel(ctx, 9, yHead + 2, '#ffffff', s);

      // Blush
      if (skin.accessory === 'blush' || true) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.fillRect(5 * s, (yHead + 4) * s, 1.5 * s, 1 * s);
        ctx.fillRect(9.5 * s, (yHead + 4) * s, 1.5 * s, 1 * s);
      }

      // Glasses
      if (skin.accessory === 'glasses') {
        this.drawRect(ctx, 5, yHead + 2, 3, 2, '#0f172a', s);
        this.drawRect(ctx, 8, yHead + 2, 3, 2, '#0f172a', s);
        this.drawPixel(ctx, 7, yHead + 2, '#0f172a', s);
      }

      // Leaf in mouth
      if (skin.accessory === 'leaf_in_mouth') {
        this.drawPixel(ctx, 7, yHead + 5, '#22c55e', s);
        this.drawPixel(ctx, 8, yHead + 4, '#16a34a', s);
      }
    } else if (dir === 'left') {
      this.drawPixel(ctx, 5, yHead + 3, eyeCol, s);
      this.drawPixel(ctx, 5, yHead + 2, '#ffffff', s);
      if (skin.accessory === 'glasses') {
        this.drawRect(ctx, 4, yHead + 2, 3, 2, '#0f172a', s);
      }
    } else if (dir === 'right') {
      this.drawPixel(ctx, 10, yHead + 3, eyeCol, s);
      this.drawPixel(ctx, 10, yHead + 2, '#ffffff', s);
      if (skin.accessory === 'glasses') {
        this.drawRect(ctx, 9, yHead + 2, 3, 2, '#0f172a', s);
      }
    }

    // 7. Hair / Hats
    this.drawHairAndHats(ctx, skin, dir, yHead, s, hairCol, hairShadow);

    // 8. Custom Pixel Layer (if user hand-painted on their 12x12 matrix)
    if (skin.customMatrix && Array.isArray(skin.customMatrix)) {
      skin.customMatrix.forEach((row, ry) => {
        if (!Array.isArray(row)) return;
        row.forEach((color, rx) => {
          if (color && color !== 'transparent') {
            const px = 2 + rx;
            const py = 2 + ry + bounce;
            this.drawPixel(ctx, px, py, color, s);
          }
        });
      });
    }

    // 9. Held tool overlay in action
    if (action && actionProgress > 0) {
      this.drawHeldToolAction(ctx, dir, action, actionProgress, bounce, s);
    }
  }

  private static drawHairAndHats(
    ctx: CanvasRenderingContext2D,
    skin: SkinConfig,
    dir: Direction,
    yHead: number,
    s: number,
    hairCol: string,
    hairShadow: string
  ) {
    const style = skin.hairStyle || 'short';

    if (style === 'straw_hat') {
      // Wide brim straw hat
      this.drawRect(ctx, 2, yHead - 1, 12, 2, '#fde047', s);
      this.drawRect(ctx, 4, yHead - 3, 8, 2, '#eab308', s);
      // Red ribbon band
      this.drawRect(ctx, 4, yHead - 1, 8, 1, '#ef4444', s);
      // Peeking bangs
      if (dir === 'down') {
        this.drawRect(ctx, 5, yHead + 1, 6, 1, hairCol, s);
      }
      return;
    }

    if (style === 'beanie') {
      // Knitted beanie hat
      this.drawRect(ctx, 4, yHead - 2, 8, 3, '#0284c7', s);
      this.drawRect(ctx, 3, yHead + 1, 10, 1, '#0369a1', s);
      this.drawPixel(ctx, 7, yHead - 3, '#bae6fd', s); // pompom
      this.drawPixel(ctx, 8, yHead - 3, '#bae6fd', s);
      if (dir === 'down') {
        this.drawRect(ctx, 5, yHead + 2, 6, 1, hairCol, s);
      }
      return;
    }

    if (style === 'frog_hat') {
      // Cute frog hat
      this.drawRect(ctx, 3, yHead - 2, 10, 4, '#22c55e', s);
      // Big frog eyes on top
      this.drawRect(ctx, 3, yHead - 4, 3, 2, '#16a34a', s);
      this.drawPixel(ctx, 4, yHead - 3, '#000000', s);
      this.drawRect(ctx, 10, yHead - 4, 3, 2, '#16a34a', s);
      this.drawPixel(ctx, 11, yHead - 3, '#000000', s);
      // Rosy cheeks
      this.drawPixel(ctx, 4, yHead + 1, '#f472b6', s);
      this.drawPixel(ctx, 11, yHead + 1, '#f472b6', s);
      return;
    }

    if (style === 'flower_wreath') {
      // Hair with blossom crown
      this.drawRect(ctx, 4, yHead - 1, 8, 3, hairCol, s);
      // Flowers
      this.drawPixel(ctx, 4, yHead, '#f43f5e', s);
      this.drawPixel(ctx, 6, yHead - 1, '#fbbf24', s);
      this.drawPixel(ctx, 8, yHead - 1, '#c084fc', s);
      this.drawPixel(ctx, 10, yHead, '#38bdf8', s);
      if (dir === 'down') {
        this.drawRect(ctx, 3, yHead + 1, 2, 4, hairCol, s);
        this.drawRect(ctx, 11, yHead + 1, 2, 4, hairCol, s);
      }
      return;
    }

    // Default Hairstyles
    if (style === 'short') {
      this.drawRect(ctx, 4, yHead - 1, 8, 2, hairCol, s);
      this.drawRect(ctx, 3, yHead, 2, 2, hairShadow, s);
      this.drawRect(ctx, 11, yHead, 2, 2, hairShadow, s);
      if (dir === 'down') {
        this.drawRect(ctx, 5, yHead + 1, 6, 1, hairCol, s);
      }
    } else if (style === 'curly') {
      this.drawRect(ctx, 3, yHead - 2, 10, 3, hairCol, s);
      this.drawRect(ctx, 2, yHead + 1, 3, 3, hairShadow, s);
      this.drawRect(ctx, 11, yHead + 1, 3, 3, hairShadow, s);
      this.drawPixel(ctx, 5, yHead - 1, '#f59e0b', s);
      this.drawPixel(ctx, 9, yHead - 1, '#f59e0b', s);
    } else if (style === 'bob') {
      this.drawRect(ctx, 3, yHead - 1, 10, 3, hairCol, s);
      this.drawRect(ctx, 3, yHead + 2, 2, 4, hairShadow, s);
      this.drawRect(ctx, 11, yHead + 2, 2, 4, hairShadow, s);
    } else if (style === 'braids') {
      this.drawRect(ctx, 4, yHead - 1, 8, 2, hairCol, s);
      // Two hanging braids with cute bands
      this.drawRect(ctx, 3, yHead + 2, 2, 5, hairCol, s);
      this.drawRect(ctx, 11, yHead + 2, 2, 5, hairCol, s);
      this.drawPixel(ctx, 3, yHead + 6, '#f43f5e', s);
      this.drawPixel(ctx, 11, yHead + 6, '#f43f5e', s);
    }
  }

  private static drawHeldToolAction(
    ctx: CanvasRenderingContext2D,
    dir: Direction,
    action: string,
    prog: number,
    bounce: number,
    s: number
  ) {
    const angle = Math.sin(prog * Math.PI);
    const ox = dir === 'left' ? 2 : 12;
    const oy = 9 + bounce + Math.floor(angle * 3);

    if (action.includes('hoe')) {
      // Wood shaft
      this.drawRect(ctx, ox, oy, 1, 4, '#78350f', s);
      // Metal blade
      this.drawRect(ctx, ox - 1, oy - 1, 3, 1, '#94a3b8', s);
    } else if (action.includes('water')) {
      // Blue watering can
      this.drawRect(ctx, ox - 1, oy, 3, 3, '#0284c7', s);
      this.drawPixel(ctx, ox + 2, oy, '#38bdf8', s);
      // Droplets
      if (prog > 0.3 && prog < 0.8) {
        this.drawPixel(ctx, ox + 3, oy + 2, '#38bdf8', s);
        this.drawPixel(ctx, ox + 4, oy + 4, '#60a5fa', s);
      }
    } else if (action.includes('scythe')) {
      this.drawRect(ctx, ox, oy, 1, 4, '#78350f', s);
      this.drawRect(ctx, ox - 2, oy - 2, 4, 1, '#cbd5e1', s);
    } else if (action.includes('rod')) {
      // Fishing bamboo pole
      this.drawRect(ctx, ox, oy - 4, 1, 7, '#d97706', s);
      // Line
      this.drawPixel(ctx, ox + 1, oy - 4, '#ffffff', s);
      this.drawPixel(ctx, ox + 2, oy - 2, '#ffffff', s);
    }
  }
}
