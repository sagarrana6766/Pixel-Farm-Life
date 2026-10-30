import React, { useState } from 'react';
import { InventoryItem, TimeState } from '../types/game';
import { lofiAudio } from '../audio/lofiAudio';
import { 
  Volume2, VolumeX, Sparkles, Package, Palette, 
  Home, MessageCircle, Smile, HelpCircle, Users, Copy, Check, ZoomIn, Gamepad2
} from 'lucide-react';

interface GameHudProps {
  timeState: TimeState;
  energy: number;
  maxEnergy: number;
  cozyCoins: number;
  roomId: string;
  onlineCount: number;
  isMuted: boolean;
  isInHouse: boolean;
  isDecorating: boolean;
  zoom: number;
  onCycleZoom: () => void;
  showMobileControls: boolean;
  onToggleMobileControls: () => void;
  quickSlots: (InventoryItem | null)[];
  activeSlot: number;
  onSelectSlot: (idx: number) => void;
  onToggleMute: () => void;
  onOpenBackpack: () => void;
  onOpenSkinStudio: () => void;
  onToggleDecorating: () => void;
  onSendEmote: (emote: string) => void;
  onToggleChat: () => void;
  onOpenHelp: () => void;
}

const EMOTE_LIST = [
  { icon: '👋', label: 'Wave' },
  { icon: '❤️', label: 'Heart' },
  { icon: '🌸', label: 'Blossom' },
  { icon: '🎣', label: 'Fish' },
  { icon: '💤', label: 'Sleep' },
  { icon: '✨', label: 'Sparkle' },
];

export const GameHud: React.FC<GameHudProps> = ({
  timeState,
  energy,
  maxEnergy,
  cozyCoins,
  roomId,
  onlineCount,
  isMuted,
  isInHouse,
  isDecorating,
  zoom,
  onCycleZoom,
  showMobileControls,
  onToggleMobileControls,
  quickSlots,
  activeSlot,
  onSelectSlot,
  onToggleMute,
  onOpenBackpack,
  onOpenSkinStudio,
  onToggleDecorating,
  onSendEmote,
  onToggleChat,
  onOpenHelp,
}) => {
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);

  // Format time (6:00 AM -> 11:30 PM)
  const hourFormatted = timeState.hour % 12 === 0 ? 12 : timeState.hour % 12;
  const ampm = timeState.hour >= 12 ? 'PM' : 'AM';
  const minuteFormatted = timeState.minute.toString().padStart(2, '0');

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(window.location.origin + '?room=' + roomId);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-4">
      {/* Top Bar: Perimeter Status Clusters */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Time, Date & Weather Cluster */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#fffbeb]/95 border-3 border-[#78350f] rounded-2xl shadow-lg px-4 py-2 flex items-center gap-3 text-[#451a03]">
            <span className="text-xl">
              {timeState.isNight ? '🌙' : timeState.hour < 12 ? '🌅' : '☀️'}
            </span>
            <div>
              <div className="text-xs font-mono font-bold tracking-wide">
                Day {timeState.day} · <span className="text-amber-800">{timeState.season}</span>
              </div>
              <div className="text-sm font-mono font-black tabular-nums text-[#78350f]">
                {hourFormatted}:{minuteFormatted} {ampm}
              </div>
            </div>
          </div>

          {/* Energy Bar */}
          <div className="bg-[#fffbeb]/95 border-3 border-[#78350f] rounded-2xl shadow-lg px-3 py-2 flex flex-col justify-center min-w-[130px]">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#78350f] mb-1">
              <span>⚡ Energy</span>
              <span className="tabular-nums">{Math.round(energy)}/{maxEnergy}</span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 rounded-full border border-[#78350f] overflow-hidden">
              <div
                style={{ width: `${(energy / maxEnergy) * 100}%` }}
                className={`h-full transition-all duration-300 ${
                  energy > 40 ? 'bg-emerald-500' : energy > 15 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Top-Right: LAN Status, Coins & Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* LAN Room Info */}
          <button
            onClick={handleCopyRoom}
            title="Click to copy invite link for LAN friends"
            className="flex items-center gap-1.5 bg-[#fffbeb]/95 hover:bg-amber-100 border-3 border-[#78350f] rounded-2xl shadow-lg px-3 py-2 text-[#451a03] font-mono text-xs font-bold transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span className="text-[11px] truncate max-w-[120px]">{roomId}</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-300">
              {onlineCount} {onlineCount === 1 ? 'farmer' : 'farmers'}
            </span>
            {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3 h-3 text-stone-400" />}
          </button>

          {/* Cozy Coins */}
          <div className="flex items-center gap-1.5 bg-[#451a03] border-3 border-amber-600 text-amber-300 px-3.5 py-2 rounded-2xl shadow-lg font-mono font-bold text-xs tabular-nums">
            <span className="text-sm">🪙</span>
            <span>{cozyCoins}</span>
          </div>

          {/* 2D Pixel Zoom button */}
          <button
            onClick={onCycleZoom}
            className="flex items-center gap-1 px-3 py-2 bg-[#fffbeb]/95 hover:bg-[#fef3c7] text-[#78350f] rounded-2xl border-3 border-[#78350f] shadow-lg font-mono font-bold text-xs transition-colors cursor-pointer"
            title="Toggle 2D Pixel Scale Zoom: 1.8x / 2.4x / 3.0x / 3.6x (or scroll wheel)"
          >
            <ZoomIn className="w-3.5 h-3.5 text-amber-700" />
            <span className="tabular-nums">{zoom}x</span>
          </button>

          {/* Mobile On-Screen Controller Toggle */}
          <button
            onClick={onToggleMobileControls}
            className={`p-2 rounded-2xl border-3 shadow-lg transition-colors cursor-pointer ${
              showMobileControls
                ? 'bg-[#15803d] text-white border-[#14532d]'
                : 'bg-[#fffbeb]/95 hover:bg-[#fef3c7] text-[#78350f] border-[#78350f]'
            }`}
            title="Toggle On-Screen Virtual Controller for Mobile"
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          {/* Audio Mute button */}
          <button
            onClick={onToggleMute}
            className="p-2 bg-[#fffbeb]/95 hover:bg-[#fef3c7] text-[#78350f] rounded-2xl border-3 border-[#78350f] shadow-lg transition-colors cursor-pointer"
            title="Toggle Lo-Fi Music"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Help Controls */}
          <button
            onClick={onOpenHelp}
            className="p-2 bg-[#fffbeb]/95 hover:bg-[#fef3c7] text-[#78350f] rounded-2xl border-3 border-[#78350f] shadow-lg transition-colors cursor-pointer"
            title="Help & Controls"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Prompt / Decorating Alert (if inside cottage) */}
      {isInHouse && (
        <div className="self-center pointer-events-auto">
          <button
            onClick={onToggleDecorating}
            className={`flex items-center gap-2 px-5 py-2 rounded-2xl border-3 font-mono font-bold text-xs shadow-xl transition-all cursor-pointer ${
              isDecorating
                ? 'bg-[#15803d] text-white border-[#14532d] ring-2 ring-emerald-300'
                : 'bg-[#fffbeb] hover:bg-[#fed7aa] text-[#78350f] border-[#78350f]'
            }`}
          >
            <Home className="w-4 h-4 text-amber-700" />
            {isDecorating ? 'Decorating Active: Press R to Rotate, Click to Place' : 'Enter Cottage Decorating Mode [D]'}
          </button>
        </div>
      )}

      {/* Bottom Bar: Action buttons & Quick Tool Bar */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Emote Picker Popover */}
        {showEmotePicker && (
          <div className="flex items-center gap-2 bg-[#fffbeb] p-2 rounded-2xl border-3 border-[#78350f] shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-100">
            {EMOTE_LIST.map(em => (
              <button
                key={em.icon}
                onClick={() => {
                  onSendEmote(em.icon);
                  setShowEmotePicker(false);
                }}
                className="w-10 h-10 flex items-center justify-center text-xl hover:bg-amber-100 rounded-xl transition-transform hover:scale-120 cursor-pointer"
                title={em.label}
              >
                {em.icon}
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenBackpack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fffbeb]/95 hover:bg-[#fed7aa] text-[#78350f] rounded-xl border-2 border-[#78350f] shadow-md font-mono font-bold text-xs transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            Backpack [E]
          </button>

          <button
            onClick={onOpenSkinStudio}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fffbeb]/95 hover:bg-[#fed7aa] text-[#78350f] rounded-xl border-2 border-[#78350f] shadow-md font-mono font-bold text-xs transition-colors cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            Tailor Skin [C]
          </button>

          <button
            onClick={() => setShowEmotePicker(!showEmotePicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffbeb]/95 hover:bg-[#fed7aa] text-[#78350f] rounded-xl border-2 border-[#78350f] shadow-md font-mono font-bold text-xs transition-colors cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5" />
            Emote [Q]
          </button>

          <button
            onClick={onToggleChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffbeb]/95 hover:bg-[#fed7aa] text-[#78350f] rounded-xl border-2 border-[#78350f] shadow-md font-mono font-bold text-xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            LAN Chat [T]
          </button>
        </div>

        {/* Quick Toolbar (Slots 1-6) */}
        <div className="flex items-center gap-2 bg-[#fffbeb]/95 p-2 rounded-2xl border-3 border-[#78350f] shadow-2xl pointer-events-auto">
          {quickSlots.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectSlot(idx);
                lofiAudio.playFootstep();
              }}
              className={`relative w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeSlot === idx
                  ? 'bg-amber-100 border-[#78350f] scale-110 ring-2 ring-amber-500 shadow-lg -translate-y-1'
                  : 'bg-white border-[#fed7aa] hover:border-amber-400'
              }`}
            >
              {/* Slot Number key hint */}
              <span className="absolute top-0.5 left-1 text-[9px] font-mono font-bold text-stone-400">
                {idx + 1}
              </span>

              {item ? (
                <>
                  <span className="text-xl drop-shadow-xs">{item.icon}</span>
                  {item.count > 1 && (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-black bg-[#78350f] text-amber-100 px-1 rounded-xs tabular-nums">
                      {item.count}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-stone-300 text-xs">·</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
