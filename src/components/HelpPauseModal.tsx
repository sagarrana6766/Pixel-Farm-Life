import React, { useState } from 'react';
import { lofiAudio } from '../audio/lofiAudio';
import { Volume2, VolumeX, Sparkles, BookOpen, Music, Home, X, Play, RotateCcw } from 'lucide-react';

interface HelpPauseModalProps {
  onResume: () => void;
  onQuitToTitle: () => void;
}

export const HelpPauseModal: React.FC<HelpPauseModalProps> = ({
  onResume,
  onQuitToTitle,
}) => {
  const [masterVol, setMasterVol] = useState(70);
  const [vinylVol, setVinylVol] = useState(20);
  const [rainVol, setRainVol] = useState(35);
  const [selectedTrack, setSelectedTrack] = useState(lofiAudio.getCurrentTrackIndex());

  const handleMasterVol = (v: number) => {
    setMasterVol(v);
    lofiAudio.setMasterVolume(v / 100);
  };

  const handleVinylVol = (v: number) => {
    setVinylVol(v);
    lofiAudio.setVinylVolume(v / 100);
  };

  const handleRainVol = (v: number) => {
    setRainVol(v);
    lofiAudio.setRainVolume(v / 100);
  };

  const handleTrackChange = (idx: number) => {
    lofiAudio.switchTrack(idx);
    setSelectedTrack(idx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#fffbeb] border-4 border-[#78350f] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-[#451a03]">
        {/* Header */}
        <div className="bg-[#78350f] text-[#fef08a] px-6 py-3 flex items-center justify-between border-b-4 border-[#451a03]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-300" />
            <h3 className="font-mono font-bold text-lg">Game Guide & Settings</h3>
          </div>
          <button
            onClick={onResume}
            className="p-1 rounded-lg bg-[#92400e] hover:bg-[#b45309] text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Lo-Fi Audio Mix Sliders */}
          <div className="bg-[#fef3c7] p-4 rounded-xl border-2 border-[#b45309]">
            <h4 className="font-mono font-bold text-xs uppercase text-[#78350f] mb-3 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-amber-700" />
              Lo-Fi Soundtrack & Atmosphere Mix
            </h4>

            {/* Track select */}
            <div className="mb-3">
              <label className="text-[11px] font-mono font-bold text-[#78350f] block mb-1">
                Current Lo-Fi Melodic Theme:
              </label>
              <select
                value={selectedTrack}
                onChange={e => handleTrackChange(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold bg-white border border-[#b45309] rounded-lg p-2 text-[#78350f] focus:outline-none"
              >
                {lofiAudio.tracks.map((t, idx) => (
                  <option key={t.id} value={idx}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] font-mono font-bold text-[#78350f]">
                  <span>Music Volume</span>
                  <span>{masterVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVol}
                  onChange={e => handleMasterVol(Number(e.target.value))}
                  className="w-full accent-amber-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono font-bold text-[#78350f]">
                  <span>Vinyl Crackle & Tape Texture</span>
                  <span>{vinylVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vinylVol}
                  onChange={e => handleVinylVol(Number(e.target.value))}
                  className="w-full accent-amber-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono font-bold text-[#78350f]">
                  <span>Rain & Nature Ambience</span>
                  <span>{rainVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rainVol}
                  onChange={e => handleRainVol(Number(e.target.value))}
                  className="w-full accent-amber-700"
                />
              </div>
            </div>
          </div>

          {/* Controls Reference */}
          <div>
            <h4 className="font-mono font-bold text-xs uppercase text-[#78350f] mb-2">
              Controls & Shortcuts
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">WASD / Arrow Keys:</span> Walk
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">Space / Click:</span> Action / Use Tool
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">1 - 6 Keys:</span> Quick Tool Selection
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">E Key:</span> Open Backpack & Shop
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">C Key:</span> Custom Skin Studio
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">D / R Keys:</span> Decorate & Rotate
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">Q Key:</span> Quick Emote Wheel
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa]">
                <span className="font-bold text-[#78350f]">T Key:</span> Open LAN Chat
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#fed7aa] col-span-2">
                <span className="font-bold text-[#78350f]">📱 Mobile Controls:</span> Touch virtual D-Pad (bottom-left) to walk; tap big Action circle (bottom-right) to till, water, fish & harvest!
              </div>
            </div>
          </div>

          {/* Life Sim Guide */}
          <div className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-[#fed7aa] space-y-1.5 leading-relaxed">
            <p><strong>🌾 Farming:</strong> Till dark soil with your Copper Hoe. Equip seed packets and sow them into tilled plots. Water them with your Sprinkle Can to watch them flourish!</p>
            <p><strong>🎣 Fishing:</strong> Stand along the riverbank or pond dock. Cast your rod with Space or tap Action. When you hear the chime and see the "!" alert, press Space/tap to hook the fish and reel it in!</p>
            <p><strong>🏡 Decorating:</strong> Walk inside the cottage through the front door. Press [D] to enter decorating mode and place cozy rugs, tea tables, fireplaces, and lo-fi gramophones!</p>
            <p><strong>👥 Multiplayer:</strong> Share the room link or Room code with friends on your LAN/network to explore each other's farms and decorate together.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#ffedd5] px-6 py-3 border-t-2 border-[#b45309] flex items-center justify-between">
          <button
            onClick={onQuitToTitle}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold text-rose-800 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Quit to Title Screen
          </button>
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#15803d] hover:bg-[#16a34a] text-white font-mono font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Farming
          </button>
        </div>
      </div>
    </div>
  );
};
