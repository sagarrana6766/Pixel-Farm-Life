import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types/game';
import { RotateCw, Sparkles, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { lofiAudio } from '../audio/lofiAudio';

interface MobileControlsProps {
  onMovement: (dx: number, dy: number) => void;
  onAction: () => void;
  onRotateDecor: () => void;
  isDecorating: boolean;
  isInHouse: boolean;
  activeItem: InventoryItem | null;
  actionHint?: string;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMovement,
  onAction,
  onRotateDecor,
  isDecorating,
  isInHouse,
  activeItem,
  actionHint,
}) => {
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const dpadRef = useRef<HTMLDivElement | null>(null);

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch (e) {}
    }
  }, []);

  const handleDirectionPress = (dir: 'up' | 'down' | 'left' | 'right' | null) => {
    setActiveDir(dir);
    if (!dir) {
      onMovement(0, 0);
      return;
    }
    triggerHaptic();

    switch (dir) {
      case 'up':
        onMovement(0, -1);
        break;
      case 'down':
        onMovement(0, 1);
        break;
      case 'left':
        onMovement(-1, 0);
        break;
      case 'right':
        onMovement(1, 0);
        break;
    }
  };

  // Touch move calculation on D-Pad area for smooth sliding
  const handleDpadTouch = (e: React.TouchEvent) => {
    if (!dpadRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    if (Math.hypot(dx, dy) < 14) {
      handleDirectionPress(null);
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      handleDirectionPress(dx > 0 ? 'right' : 'left');
    } else {
      handleDirectionPress(dy > 0 ? 'down' : 'up');
    }
  };

  const handleTouchEnd = () => {
    handleDirectionPress(null);
  };

  // Determine label and icon for primary action button
  const getActionDisplay = () => {
    if (actionHint) {
      if (actionHint.includes('Harvest')) return { icon: '✨', label: 'HARVEST' };
      if (actionHint.includes('Enter')) return { icon: '🚪', label: 'ENTER' };
      if (actionHint.includes('Outside')) return { icon: '🚪', label: 'OUTSIDE' };
      if (actionHint.includes('Sleep')) return { icon: '💤', label: 'SLEEP' };
      if (actionHint.includes('Cast')) return { icon: '🎣', label: 'CAST' };
      if (actionHint.includes('Till')) return { icon: '⛏️', label: 'TILL' };
      if (actionHint.includes('Water')) return { icon: '💧', label: 'WATER' };
      if (actionHint.includes('Sow')) return { icon: '🌱', label: 'SOW' };
    }

    if (activeItem) {
      if (activeItem.id === 'tool_hoe') return { icon: '⛏️', label: 'TILL' };
      if (activeItem.id === 'tool_water') return { icon: '💧', label: 'WATER' };
      if (activeItem.id === 'tool_rod') return { icon: '🎣', label: 'FISH' };
      if (activeItem.id === 'tool_scythe') return { icon: '🌾', label: 'CLEAR' };
      if (activeItem.category === 'seed') return { icon: '🌱', label: 'SOW' };
      if (activeItem.category === 'furniture') return { icon: '🏡', label: 'PLACE' };
      return { icon: activeItem.icon, label: 'USE' };
    }

    return { icon: '✋', label: 'ACTION' };
  };

  const actionDisplay = getActionDisplay();

  return (
    <div className="absolute inset-0 pointer-events-none z-35 flex flex-col justify-end p-3 pb-5">
      <div className="flex items-end justify-between w-full max-w-4xl mx-auto">
        {/* Left: Virtual D-Pad */}
        <div
          ref={dpadRef}
          onTouchStart={handleDpadTouch}
          onTouchMove={handleDpadTouch}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative w-36 h-36 bg-[#451a03]/80 backdrop-blur-xs rounded-full border-3 border-[#fed7aa] p-2 shadow-2xl pointer-events-auto select-none touch-none"
        >
          {/* Up */}
          <button
            onPointerDown={() => handleDirectionPress('up')}
            onPointerUp={() => handleDirectionPress(null)}
            className={`absolute top-1 left-1/2 -translate-x-1/2 w-11 h-11 rounded-t-xl flex items-center justify-center border-2 border-[#78350f] transition-all cursor-pointer ${
              activeDir === 'up'
                ? 'bg-[#fde047] text-[#451a03] scale-95'
                : 'bg-[#92400e] text-amber-100'
            }`}
          >
            <ChevronUp className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Down */}
          <button
            onPointerDown={() => handleDirectionPress('down')}
            onPointerUp={() => handleDirectionPress(null)}
            className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-11 h-11 rounded-b-xl flex items-center justify-center border-2 border-[#78350f] transition-all cursor-pointer ${
              activeDir === 'down'
                ? 'bg-[#fde047] text-[#451a03] scale-95'
                : 'bg-[#92400e] text-amber-100'
            }`}
          >
            <ChevronDown className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Left */}
          <button
            onPointerDown={() => handleDirectionPress('left')}
            onPointerUp={() => handleDirectionPress(null)}
            className={`absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-l-xl flex items-center justify-center border-2 border-[#78350f] transition-all cursor-pointer ${
              activeDir === 'left'
                ? 'bg-[#fde047] text-[#451a03] scale-95'
                : 'bg-[#92400e] text-amber-100'
            }`}
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Right */}
          <button
            onPointerDown={() => handleDirectionPress('right')}
            onPointerUp={() => handleDirectionPress(null)}
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-r-xl flex items-center justify-center border-2 border-[#78350f] transition-all cursor-pointer ${
              activeDir === 'right'
                ? 'bg-[#fde047] text-[#451a03] scale-95'
                : 'bg-[#92400e] text-amber-100'
            }`}
          >
            <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#78350f] border-2 border-[#fed7aa] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
          </div>
        </div>

        {/* Right: Big Action Buttons */}
        <div className="flex flex-col items-center gap-3 pointer-events-auto select-none">
          {/* Rotate Furniture Button (Inside cottage when decorating) */}
          {isInHouse && isDecorating && (
            <button
              onClick={() => {
                triggerHaptic();
                onRotateDecor();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#d97706] hover:bg-[#b45309] active:scale-95 text-white font-mono font-bold text-xs rounded-2xl border-3 border-[#78350f] shadow-xl transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>ROTATE [R]</span>
            </button>
          )}

          {/* Primary Action Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic();
              onAction();
            }}
            onClick={() => {
              triggerHaptic();
              onAction();
            }}
            className="w-20 h-20 rounded-full bg-gradient-to-b from-[#22c55e] to-[#15803d] active:from-[#16a34a] active:to-[#14532d] active:scale-92 border-4 border-[#fed7aa] shadow-2xl flex flex-col items-center justify-center text-white transition-transform cursor-pointer"
          >
            <span className="text-2xl drop-shadow-sm">{actionDisplay.icon}</span>
            <span className="text-[10px] font-mono font-black tracking-wider uppercase drop-shadow-xs mt-0.5">
              {actionDisplay.label}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
