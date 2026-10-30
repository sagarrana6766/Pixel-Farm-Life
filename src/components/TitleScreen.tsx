import React, { useState, useEffect } from 'react';
import { lofiAudio } from '../audio/lofiAudio';
import { Volume2, VolumeX, Sparkles, Users, Palette, Play, Music, Compass } from 'lucide-react';
import { SkinConfig } from '../types/game';
import { PixelCharacterRenderer } from '../game/pixelRenderer';

interface TitleScreenProps {
  onStartGame: (roomId: string) => void;
  onOpenSkinStudio: () => void;
  currentSkin: SkinConfig;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenSkinStudio,
  currentSkin,
}) => {
  const [roomId, setRoomId] = useState('whispering-valley');
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!showRoomInput) {
          lofiAudio.startMusic();
          onStartGame(roomId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRoomInput, roomId, onStartGame]);

  const toggleSound = () => {
    lofiAudio.startMusic();
    const muted = lofiAudio.toggleMute();
    setIsMuted(muted);
  };

  const handleTrackChange = (idx: number) => {
    lofiAudio.startMusic();
    lofiAudio.switchTrack(idx);
    setSelectedTrack(idx);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-8 bg-gradient-to-b from-[#bbf7d0]/40 via-[#fef3c7]/60 to-[#fed7aa]/80 select-none overflow-hidden">
      {/* Top Bar with Audio & LAN Status */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2 bg-[#78350f]/90 text-amber-100 px-4 py-2 rounded-xl border-2 border-[#451a03] shadow-md">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            Whispering Pines Farm v1.0 · LAN Ready
          </span>
        </div>

        {/* Audio selector & Mute */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#fffbeb]/90 px-3 py-1.5 rounded-xl border-2 border-[#b45309] shadow-sm">
            <Music className="w-4 h-4 text-[#78350f]" />
            <select
              value={selectedTrack}
              onChange={e => handleTrackChange(Number(e.target.value))}
              className="text-xs font-mono font-bold bg-transparent text-[#78350f] focus:outline-none cursor-pointer"
            >
              {lofiAudio.tracks.map((t, idx) => (
                <option key={t.id} value={idx}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={toggleSound}
            className="p-2 bg-[#fffbeb]/90 hover:bg-[#fef3c7] text-[#78350f] rounded-xl border-2 border-[#b45309] shadow-sm transition-colors cursor-pointer"
            title="Toggle Lo-Fi Mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece & Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center max-w-2xl mx-auto">
        {/* Animated Avatar Centerpiece */}
        <div
          onClick={onOpenSkinStudio}
          className="group relative cursor-pointer mb-6 transition-transform hover:scale-105 active:scale-95"
          title="Click to Customize Character Skin"
        >
          <div className="w-24 h-24 rounded-2xl bg-[#fffbeb] border-4 border-[#78350f] shadow-xl flex items-center justify-center overflow-hidden">
            <img
              src={PixelCharacterRenderer.getCharacterCanvas(currentSkin, 'down', 0).toDataURL()}
              alt="Avatar Preview"
              className="w-16 h-16 [image-rendering:pixelated]"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#b45309] text-amber-100 p-1.5 rounded-full border-2 border-[#451a03] shadow-md group-hover:bg-[#d97706] transition-colors">
            <Palette className="w-3.5 h-3.5" />
          </div>
          <span className="inline-block mt-2 text-xs font-mono font-bold text-[#78350f] bg-[#fffbeb]/90 px-2 py-0.5 rounded-md border border-[#b45309]">
            {currentSkin.name} (Edit Skin)
          </span>
        </div>

        {/* Bespoke SVG Title Lockup */}
        <div className="mb-4 drop-shadow-md">
          <svg className="w-full max-w-lg h-24" viewBox="0 0 600 110">
            <defs>
              <linearGradient id="woodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="50%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              <filter id="pixelShadow">
                <feDropShadow dx="4" dy="4" stdDeviation="0" floodColor="#1e293b" />
              </filter>
            </defs>

            {/* Pine needles icon left & right */}
            <text x="35" y="65" fontSize="38" fill="#15803d">🌲</text>
            <text x="525" y="65" fontSize="38" fill="#15803d">🌲</text>

            {/* Main title text */}
            <text
              x="300"
              y="60"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="900"
              fontSize="44"
              letterSpacing="6"
              fill="url(#woodGradient)"
              stroke="#fed7aa"
              strokeWidth="4"
              filter="url(#pixelShadow)"
            >
              WHISPERING PINES
            </text>

            {/* Subtitle tag */}
            <text
              x="300"
              y="94"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
              fontSize="14"
              letterSpacing="4"
              fill="#b45309"
            >
              COZY PIXEL LIFE · FARM · FISH · DECORATE
            </text>
          </svg>
        </div>

        <p className="text-sm font-medium text-[#78350f] max-w-md mx-auto mb-8 bg-[#fffbeb]/80 backdrop-blur-xs px-4 py-2 rounded-xl border border-[#fed7aa] shadow-xs">
          Tend wholesome crops, cast fishing lines in serene ripples, decorate your cottage hearth, and invite friends over LAN.
        </p>

        {/* Primary Start CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => {
              lofiAudio.startMusic();
              onStartGame(roomId);
            }}
            className="flex items-center gap-3 px-8 py-4 bg-[#15803d] hover:bg-[#16a34a] text-white font-mono font-black text-lg rounded-2xl shadow-xl border-b-4 border-[#14532d] transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            ENTER THE FARM
          </button>

          <button
            onClick={onOpenSkinStudio}
            className="flex items-center gap-2 px-6 py-4 bg-[#fffbeb] hover:bg-[#fef3c7] text-[#78350f] font-mono font-bold text-sm rounded-2xl shadow-md border-2 border-[#78350f] transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Palette className="w-4 h-4 text-[#b45309]" />
            Tailor Skin
          </button>

          <button
            onClick={() => setShowRoomInput(!showRoomInput)}
            className="flex items-center gap-2 px-6 py-4 bg-[#fffbeb] hover:bg-[#fef3c7] text-[#78350f] font-mono font-bold text-sm rounded-2xl shadow-md border-2 border-[#78350f] transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Users className="w-4 h-4 text-sky-600" />
            LAN Room ({roomId})
          </button>
        </div>

        {/* LAN Room Configuration Dialog */}
        {showRoomInput && (
          <div className="mt-4 p-4 bg-[#fffbeb] border-2 border-[#78350f] rounded-2xl shadow-lg flex items-center gap-2 max-w-sm w-full animate-in fade-in duration-150">
            <input
              type="text"
              value={roomId}
              onChange={e => setRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="e.g. cozy-pines-1"
              className="flex-1 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-[#b45309] rounded-lg focus:outline-none"
            />
            <button
              onClick={() => {
                setShowRoomInput(false);
                lofiAudio.startMusic();
                onStartGame(roomId);
              }}
              className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-mono font-bold rounded-lg cursor-pointer"
            >
              Join Room
            </button>
          </div>
        )}
      </div>

      {/* Flat Control Hints Footer */}
      <div className="w-full max-w-3xl mx-auto text-center">
        <div className="inline-block bg-[#78350f]/90 text-amber-100 px-6 py-2 rounded-full border-2 border-[#451a03] shadow-md">
          <p className="text-xs font-mono font-bold tracking-wider">
            WASD / Arrows Move · Space / Click Action · E Backpack · C Custom Skin · Esc Pause
          </p>
        </div>
      </div>
    </div>
  );
};
