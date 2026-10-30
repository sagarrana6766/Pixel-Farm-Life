import React, { useState, useEffect, useRef } from 'react';
import { FishDef } from '../types/game';
import { FISH_SPECIES } from '../game/gameData';
import { lofiAudio } from '../audio/lofiAudio';
import { Sparkles, Trophy, X } from 'lucide-react';

interface FishingMiniGameProps {
  onSuccess: (caughtFish: FishDef, sizeCm: number) => void;
  onCancel: () => void;
}

export const FishingMiniGame: React.FC<FishingMiniGameProps> = ({
  onSuccess,
  onCancel,
}) => {
  // Select random fish based on rarity weights
  const [targetFish] = useState<FishDef>(() => {
    const roll = Math.random();
    if (roll < 0.08) return FISH_SPECIES.find(f => f.rarity === 'Legendary') || FISH_SPECIES[4];
    if (roll < 0.25) return FISH_SPECIES.find(f => f.rarity === 'Rare') || FISH_SPECIES[2];
    if (roll < 0.55) return FISH_SPECIES.find(f => f.rarity === 'Uncommon') || FISH_SPECIES[1];
    return FISH_SPECIES[Math.floor(Math.random() * 2)];
  });

  const [fishY, setFishY] = useState(50); // 0 (top) to 100 (bottom)
  const [barY, setBarY] = useState(60);   // player's green capture bar
  const [barVelocity, setBarVelocity] = useState(0);
  const [progress, setProgress] = useState(35); // 0 to 100%
  const [isHoldingReel, setIsHoldingReel] = useState(false);
  const [caughtResult, setCaughtResult] = useState<{ fish: FishDef; size: number } | null>(null);

  const barHeight = 28; // height of green capture window %

  // Keyboard controls (Space or Up arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        setIsHoldingReel(true);
      } else if (e.code === 'Escape') {
        onCancel();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        setIsHoldingReel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onCancel]);

  // Physics simulation loop
  useEffect(() => {
    if (caughtResult) return;

    let targetFishY = 50;
    let fishTimer = 0;

    const interval = setInterval(() => {
      // 1. Move fish smoothly with wandering target
      fishTimer += 0.05;
      if (Math.random() < 0.04) {
        targetFishY = 15 + Math.random() * 70;
      }
      setFishY(curr => {
        const diff = targetFishY - curr;
        return curr + diff * (0.05 * targetFish.speed);
      });

      // 2. Player bar physics (gravity + upward thrust)
      setBarY(curr => {
        const gravity = 0.55;
        const thrust = isHoldingReel ? -1.1 : 0;
        const newVel = (barVelocity + gravity + thrust) * 0.92;
        setBarVelocity(newVel);
        const nextY = curr + newVel;
        return Math.max(0, Math.min(100 - barHeight, nextY));
      });

      // 3. Check if fish is inside green capture bar
      const isInside = fishY >= barY && fishY <= barY + barHeight;

      setProgress(prev => {
        const delta = isInside ? 0.8 : -0.55;
        const next = Math.max(0, Math.min(100, prev + delta));

        if (next >= 100 && !caughtResult) {
          // Success!
          lofiAudio.playCatchSuccess();
          const size = Math.round(
            (targetFish.sizeMin + Math.random() * (targetFish.sizeMax - targetFish.sizeMin)) * 10
          ) / 10;
          setCaughtResult({ fish: targetFish, size });
        } else if (next <= 0) {
          // Lost
          onCancel();
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isHoldingReel, barVelocity, fishY, barY, targetFish, caughtResult, onCancel]);

  if (caughtResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in zoom-in-95 duration-200">
        <div className="bg-[#fffbeb] border-4 border-[#78350f] rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center text-[#451a03]">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-md">
            🐟
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2 font-mono">
            {caughtResult.fish.rarity} Catch!
          </span>
          <h3 className="text-xl font-bold font-mono text-[#78350f] mb-1">
            {caughtResult.fish.name}
          </h3>
          <p className="text-sm font-semibold text-amber-800 mb-2">
            Size: <span className="font-mono text-base font-bold text-amber-950">{caughtResult.size} cm</span>
          </p>
          <p className="text-xs text-stone-600 italic bg-[#fef3c7] p-2.5 rounded-xl border border-[#fed7aa] mb-4">
            "{caughtResult.fish.description}"
          </p>

          <div className="flex items-center justify-between text-xs font-bold font-mono bg-white p-2 rounded-lg border border-amber-300 mb-4">
            <span>Market Value:</span>
            <span className="text-amber-700 font-bold">{caughtResult.fish.sellPrice} Cozy Coins</span>
          </div>

          <button
            onClick={() => onSuccess(caughtResult.fish, caughtResult.size)}
            className="w-full py-2.5 bg-[#15803d] hover:bg-[#16a34a] text-white font-mono font-bold rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            Add to Creel Basket 🎣
          </button>
        </div>
      </div>
    );
  }

  const isInside = fishY >= barY && fishY <= barY + barHeight;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-auto">
      <div className="bg-[#fffbeb] border-4 border-[#78350f] rounded-2xl shadow-2xl p-4 flex flex-col items-center w-72 text-[#451a03]">
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-mono font-bold text-[#78350f] flex items-center gap-1">
            🎣 Reeling In: <span className="text-amber-900">{targetFish.name}</span>
          </span>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fishing Reel Gauge Box */}
        <div className="flex items-center gap-4 my-2">
          {/* Vertical Track */}
          <div className="relative w-12 h-64 bg-[#0284c7] border-3 border-[#0369a1] rounded-xl overflow-hidden shadow-inner">
            {/* Water bubbles */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-400/30 to-blue-600/40 pointer-events-none" />

            {/* Green capture bar */}
            <div
              style={{
                top: `${barY}%`,
                height: `${barHeight}%`,
              }}
              className={`absolute left-1 right-1 rounded-md transition-all duration-75 border-2 shadow-sm ${
                isInside
                  ? 'bg-emerald-400/80 border-emerald-300 shadow-emerald-400/50'
                  : 'bg-emerald-500/50 border-emerald-400'
              }`}
            />

            {/* Swimming Fish Icon */}
            <div
              style={{ top: `${fishY}%` }}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg filter drop-shadow-md transition-all duration-75"
            >
              🐟
            </div>
          </div>

          {/* Catch Progress Bar */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold text-[#78350f] mb-1">
              {Math.round(progress)}%
            </span>
            <div className="relative w-4 h-64 bg-stone-200 border-2 border-[#78350f] rounded-full overflow-hidden">
              <div
                style={{ height: `${progress}%` }}
                className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${
                  progress > 60 ? 'bg-emerald-500' : progress > 30 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Reel Control Button for touch/mouse */}
        <button
          onMouseDown={() => setIsHoldingReel(true)}
          onMouseUp={() => setIsHoldingReel(false)}
          onTouchStart={() => setIsHoldingReel(true)}
          onTouchEnd={() => setIsHoldingReel(false)}
          className={`w-full py-3 mt-2 rounded-xl border-2 font-mono font-bold text-sm select-none transition-all cursor-pointer ${
            isHoldingReel
              ? 'bg-[#0284c7] text-white border-[#0369a1] scale-98 shadow-inner'
              : 'bg-[#38bdf8] hover:bg-[#0ea5e9] text-sky-950 border-[#0284c7] shadow-md'
          }`}
        >
          {isHoldingReel ? '🎣 Reeling...' : 'Hold SPACE or Click to Reel'}
        </button>

        <span className="text-[10px] font-mono text-[#92400e] mt-2">
          Keep the green bar aligned with the fish!
        </span>
      </div>
    </div>
  );
};
