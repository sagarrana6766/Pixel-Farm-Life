import React, { useState, useEffect, useRef } from 'react';
import { Direction, SkinConfig } from '../types/game';
import { PRESET_SKINS } from '../game/gameData';
import { PixelCharacterRenderer } from '../game/pixelRenderer';
import { lofiAudio } from '../audio/lofiAudio';
import { Sparkles, Palette, Eraser, Check, Undo, Share2, Copy, Download, RefreshCw, X } from 'lucide-react';

interface SkinStudioModalProps {
  currentSkin: SkinConfig;
  onSave: (newSkin: SkinConfig) => void;
  onClose: () => void;
}

const PALETTE_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15',
  '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8',
  '#c084fc', '#f472b6', '#fbd5be', '#92400e',
  '#ffffff', '#94a3b8', '#334155', '#0f172a',
];

const BODY_TONES = [
  '#ffe4e6', '#fbd5be', '#fed7aa', '#fcd34d',
  '#d97706', '#b45309', '#78350f', '#451a03',
];

const HAIR_STYLES = [
  { id: 'short', name: 'Short Cut' },
  { id: 'curly', name: 'Curly Waves' },
  { id: 'bob', name: 'Cozy Bob' },
  { id: 'braids', name: 'Twin Braids' },
  { id: 'straw_hat', name: 'Straw Farm Hat' },
  { id: 'beanie', name: 'Warm Beanie' },
  { id: 'flower_wreath', name: 'Flower Crown' },
  { id: 'frog_hat', name: 'Froggy Hat' },
];

const SHIRT_STYLES = [
  { id: 'overalls', name: 'Denim Overalls' },
  { id: 'flannel', name: 'Plaid Flannel' },
  { id: 'sweater', name: 'Wool Sweater' },
  { id: 'apron', name: 'Baker Apron' },
  { id: 'hoodie', name: 'Oversized Hoodie' },
  { id: 'tshirt', name: 'Basic Tee' },
];

const ACCESSORIES = [
  { id: 'none', name: 'None' },
  { id: 'blush', name: 'Rosy Blush' },
  { id: 'glasses', name: 'Wire Glasses' },
  { id: 'bandana', name: 'Neckerchief' },
  { id: 'leaf_in_mouth', name: 'Lucky Leaf' },
];

export const SkinStudioModal: React.FC<SkinStudioModalProps> = ({
  currentSkin,
  onSave,
  onClose,
}) => {
  const [skin, setSkin] = useState<SkinConfig>(() => ({
    ...currentSkin,
    customMatrix: currentSkin.customMatrix || Array(12).fill(null).map(() => Array(12).fill('transparent')),
  }));

  const [activeTab, setActiveTab] = useState<'wardrobe' | 'pixel_painter'>('wardrobe');
  const [previewDir, setPreviewDir] = useState<Direction>('down');
  const [previewFrame, setPreviewFrame] = useState(0);
  const [selectedColor, setSelectedColor] = useState(PALETTE_COLORS[0]);
  const [paintTool, setPaintTool] = useState<'draw' | 'erase'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animate walk preview
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewFrame(f => (f + 1) % 4);
    }, 280);
    return () => clearInterval(timer);
  }, []);

  // Update canvas preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Zoomed 4x preview
    const sprite = PixelCharacterRenderer.getCharacterCanvas(
      skin,
      previewDir,
      previewFrame === 1 ? 1 : previewFrame === 3 ? 2 : 0
    );

    ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  }, [skin, previewDir, previewFrame]);

  const handlePixelClick = (x: number, y: number) => {
    const newMatrix = (skin.customMatrix || Array(12).fill(null).map(() => Array(12).fill('transparent')))
      .map(row => [...row]);
    
    newMatrix[y][x] = paintTool === 'draw' ? selectedColor : 'transparent';
    setSkin(prev => ({ ...prev, customMatrix: newMatrix }));
    lofiAudio.playFootstep();
  };

  const handleClearMatrix = () => {
    setSkin(prev => ({
      ...prev,
      customMatrix: Array(12).fill(null).map(() => Array(12).fill('transparent')),
    }));
    lofiAudio.playTill();
  };

  const handleExportSkin = () => {
    const jsonStr = btoa(JSON.stringify(skin));
    navigator.clipboard.writeText(jsonStr);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleImportSkin = () => {
    const code = prompt('Paste your exported skin code here:');
    if (code) {
      try {
        const parsed = JSON.parse(atob(code.trim()));
        if (parsed.name && parsed.bodyTone) {
          setSkin(parsed);
          lofiAudio.playHarvest();
        }
      } catch (e) {
        alert('Invalid skin code format.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#fffbeb] border-4 border-[#78350f] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[#451a03]">
        {/* Header */}
        <div className="bg-[#78350f] text-[#fef08a] px-6 py-3 flex items-center justify-between border-b-4 border-[#451a03]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <h2 className="text-xl font-bold tracking-wide font-mono">Tailor & Pixel Skin Studio</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#92400e] hover:bg-[#b45309] text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Preview Column */}
          <div className="md:col-span-5 flex flex-col items-center bg-[#fef3c7] p-4 rounded-xl border-2 border-[#b45309]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#92400e] mb-2 font-mono">
              Live Preview
            </span>

            {/* Character Viewport */}
            <div className="relative w-36 h-36 bg-[#fed7aa] border-4 border-[#78350f] rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                width={128}
                height={128}
                className="w-full h-full [image-rendering:pixelated]"
              />
            </div>

            {/* Direction Selector */}
            <div className="flex items-center gap-2 mt-4">
              {(['down', 'left', 'up', 'right'] as Direction[]).map(dir => (
                <button
                  key={dir}
                  onClick={() => {
                    setPreviewDir(dir);
                    lofiAudio.playFootstep();
                  }}
                  className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded-lg border-2 transition-all cursor-pointer ${
                    previewDir === dir
                      ? 'bg-[#78350f] text-amber-100 border-[#451a03]'
                      : 'bg-[#ffedd5] text-[#78350f] border-[#b45309] hover:bg-[#fed7aa]'
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>

            {/* Avatar Name input */}
            <div className="w-full mt-4">
              <label className="block text-xs font-bold text-[#78350f] font-mono mb-1">
                Avatar Name:
              </label>
              <input
                type="text"
                maxLength={14}
                value={skin.name}
                onChange={e => setSkin({ ...skin, name: e.target.value })}
                className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-white border-2 border-[#78350f] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Preset Outfits */}
            <div className="w-full mt-4">
              <span className="block text-xs font-bold text-[#78350f] font-mono mb-2">
                Quick Preset Outfits:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PRESET_SKINS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSkin(prev => ({
                        ...preset,
                        name: prev.name || preset.name,
                        customMatrix: prev.customMatrix,
                      }));
                      lofiAudio.playEmote();
                    }}
                    className="text-xs text-left px-2 py-1.5 rounded-lg bg-[#fffbeb] hover:bg-[#ffedd5] border border-[#b45309] font-medium truncate transition-colors cursor-pointer"
                  >
                    ✨ {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Import / Export */}
            <div className="flex gap-2 w-full mt-4 pt-3 border-t border-[#b45309]">
              <button
                onClick={handleExportSkin}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-[#fde047] hover:bg-[#facc15] font-bold rounded-lg border border-[#78350f] transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copySuccess ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={handleImportSkin}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-[#e2e8f0] hover:bg-[#cbd5e1] font-bold rounded-lg border border-[#64748b] transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Import
              </button>
            </div>
          </div>

          {/* Right Editor Column */}
          <div className="md:col-span-7 flex flex-col">
            {/* Tab switch */}
            <div className="flex gap-2 border-b-2 border-[#b45309] pb-2 mb-4">
              <button
                onClick={() => {
                  setActiveTab('wardrobe');
                  lofiAudio.playFootstep();
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold font-mono rounded-lg transition-all cursor-pointer ${
                  activeTab === 'wardrobe'
                    ? 'bg-[#78350f] text-amber-100 shadow-md'
                    : 'bg-[#ffedd5] text-[#78350f] hover:bg-[#fed7aa]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Wardrobe & Style
              </button>
              <button
                onClick={() => {
                  setActiveTab('pixel_painter');
                  lofiAudio.playFootstep();
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold font-mono rounded-lg transition-all cursor-pointer ${
                  activeTab === 'pixel_painter'
                    ? 'bg-[#78350f] text-amber-100 shadow-md'
                    : 'bg-[#ffedd5] text-[#78350f] hover:bg-[#fed7aa]'
                }`}
              >
                <Palette className="w-4 h-4" />
                12x12 Pixel Painter
              </button>
            </div>

            {/* Tab 1: Wardrobe Options */}
            {activeTab === 'wardrobe' && (
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Skin Tone */}
                <div>
                  <label className="text-xs font-bold text-[#78350f] uppercase tracking-wide font-mono block mb-1">
                    Skin Complexion
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BODY_TONES.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setSkin({ ...skin, bodyTone: color });
                          lofiAudio.playFootstep();
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                          skin.bodyTone === color ? 'border-[#451a03] scale-115 ring-2 ring-amber-500' : 'border-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Hairstyle / Hats */}
                <div>
                  <label className="text-xs font-bold text-[#78350f] uppercase tracking-wide font-mono block mb-1">
                    Hair Style & Hats
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {HAIR_STYLES.map(h => (
                      <button
                        key={h.id}
                        onClick={() => {
                          setSkin({ ...skin, hairStyle: h.id as any });
                          lofiAudio.playFootstep();
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border-2 text-left font-medium transition-all cursor-pointer ${
                          skin.hairStyle === h.id
                            ? 'bg-[#78350f] text-amber-100 border-[#451a03] font-bold'
                            : 'bg-white border-[#fed7aa] text-[#451a03] hover:bg-[#fef3c7]'
                        }`}
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color */}
                <div>
                  <label className="text-xs font-bold text-[#78350f] uppercase tracking-wide font-mono block mb-1">
                    Hair Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['#78350f', '#b45309', '#eab308', '#ec4899', '#3b82f6', '#22c55e', '#64748b', '#0f172a'].map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setSkin({ ...skin, hairColor: color });
                          lofiAudio.playFootstep();
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer ${
                          skin.hairColor === color ? 'border-[#451a03] scale-115 ring-2 ring-amber-500' : 'border-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Eye Color */}
                <div>
                  <label className="text-xs font-bold text-[#78350f] uppercase tracking-wide font-mono block mb-1">
                    Eye Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['#292524', '#0284c7', '#15803d', '#7c3aed', '#b45309', '#db2777'].map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setSkin({ ...skin, eyeColor: color });
                          lofiAudio.playFootstep();
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          skin.eyeColor === color ? 'border-[#451a03] scale-115 ring-2 ring-amber-500' : 'border-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Outfit Style */}
                <div>
                  <label className="text-xs font-bold text-[#78350f] uppercase tracking-wide font-mono block mb-1">
                    Outfit Silhouette
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SHIRT_STYLES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSkin({ ...skin, shirtStyle: s.id as any });
                          lofiAudio.playFootstep();
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border-2 text-left font-medium transition-all cursor-pointer ${
                          skin.shirtStyle === s.id
                            ? 'bg-[#78350f] text-amber-100 border-[#451a03] font-bold'
                            : 'bg-white border-[#fed7aa] text-[#451a03] hover:bg-[#fef3c7]'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shirt Color */}
                <div>
                  <label className="text-xs font-bold text-[#78350f] uppercase tracking-wide font-mono block mb-1">
                    Shirt Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['#0284c7', '#15803d', '#ef4444', '#f59e0b', '#9333ea', '#f472b6', '#475569', '#f8fafc'].map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setSkin({ ...skin, shirtColor: color });
                          lofiAudio.playFootstep();
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer ${
                          skin.shirtColor === color ? 'border-[#451a03] scale-115 ring-2 ring-amber-500' : 'border-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Accessories */}
                <div>
                  <label className="text-xs font-bold text-[#78350f] uppercase tracking-wide font-mono block mb-1">
                    Accessories
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ACCESSORIES.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setSkin({ ...skin, accessory: acc.id as any });
                          lofiAudio.playFootstep();
                        }}
                        className={`text-xs px-2 py-1.5 rounded-lg border-2 text-center font-medium transition-all cursor-pointer ${
                          skin.accessory === acc.id
                            ? 'bg-[#78350f] text-amber-100 border-[#451a03] font-bold'
                            : 'bg-white border-[#fed7aa] text-[#451a03] hover:bg-[#fef3c7]'
                        }`}
                      >
                        {acc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: 12x12 Pixel Matrix Painter */}
            {activeTab === 'pixel_painter' && (
              <div className="space-y-4">
                <p className="text-xs text-[#78350f]">
                  Paint your own custom details, crests, patterns, or accessories right onto your character's pixel canvas!
                </p>

                {/* Tools & Palette */}
                <div className="flex items-center gap-3 bg-[#fef3c7] p-2.5 rounded-xl border border-[#b45309]">
                  <button
                    onClick={() => setPaintTool('draw')}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-bold rounded-lg border cursor-pointer ${
                      paintTool === 'draw' ? 'bg-[#78350f] text-white border-[#451a03]' : 'bg-white'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Pencil
                  </button>
                  <button
                    onClick={() => setPaintTool('erase')}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-bold rounded-lg border cursor-pointer ${
                      paintTool === 'erase' ? 'bg-[#78350f] text-white border-[#451a03]' : 'bg-white'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    Eraser
                  </button>
                  <button
                    onClick={handleClearMatrix}
                    className="ml-auto text-xs px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg border border-red-300 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Color swatches */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-[#fed7aa]">
                  {PALETTE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedColor(c);
                        setPaintTool('draw');
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
                        selectedColor === c && paintTool === 'draw' ? 'scale-120 ring-2 ring-amber-500 border-black' : 'border-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* 12x12 Grid */}
                <div
                  className="inline-block mx-auto bg-stone-100 border-2 border-[#78350f] p-1.5 rounded-lg select-none"
                  onMouseDown={() => setIsDrawing(true)}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                >
                  <div className="grid grid-cols-12 gap-0.5">
                    {(skin.customMatrix || Array(12).fill(null).map(() => Array(12).fill('transparent'))).map((row, y) =>
                      row.map((cellColor, x) => (
                        <div
                          key={`${x}-${y}`}
                          onMouseDown={() => handlePixelClick(x, y)}
                          onMouseEnter={() => {
                            if (isDrawing) handlePixelClick(x, y);
                          }}
                          style={{
                            backgroundColor: cellColor === 'transparent' ? '#f5f5f4' : cellColor,
                          }}
                          className="w-4 h-4 md:w-5 md:h-5 border border-stone-300 hover:border-amber-600 cursor-crosshair transition-colors"
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#ffedd5] px-6 py-3 border-t-2 border-[#b45309] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-mono font-bold text-[#78350f] hover:bg-[#fed7aa] rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(skin);
              lofiAudio.playCatchSuccess();
              onClose();
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#15803d] hover:bg-[#16a34a] text-white font-mono font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Apply & Save Skin
          </button>
        </div>
      </div>
    </div>
  );
};
