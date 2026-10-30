/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { multiplayer } from './game/multiplayerClient';
import { lofiAudio } from './audio/lofiAudio';
import { ChatMessage, FishDef, InventoryItem, SkinConfig, TimeState } from './types/game';
import { PRESET_SKINS } from './game/gameData';
import { TitleScreen } from './components/TitleScreen';
import { GameHud } from './components/GameHud';
import { BackpackModal } from './components/BackpackModal';
import { SkinStudioModal } from './components/SkinStudioModal';
import { FishingMiniGame } from './components/FishingMiniGame';
import { HelpPauseModal } from './components/HelpPauseModal';
import { ChatOverlay } from './components/ChatOverlay';
import { MobileControls } from './components/MobileControls';

export default function App() {
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused'>('title');
  const [roomId, setRoomId] = useState<string>('whispering-valley');
  const [onlineCount, setOnlineCount] = useState(1);

  // Modals
  const [showBackpack, setShowBackpack] = useState(false);
  const [showSkinStudio, setShowSkinStudio] = useState(false);
  const [showFishing, setShowFishing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Game UI State (synced from GameEngine)
  const [currentSkin, setCurrentSkin] = useState<SkinConfig>(PRESET_SKINS.gardener);
  const [cozyCoins, setCozyCoins] = useState(150);
  const [energy, setEnergy] = useState(100);
  const [maxEnergy] = useState(100);
  const [isInHouse, setIsInHouse] = useState(false);
  const [isDecorating, setIsDecorating] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [quickSlots, setQuickSlots] = useState<(InventoryItem | null)[]>([]);
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(2.4);
  const [showMobileControls, setShowMobileControls] = useState(() => {
    if (typeof window !== 'undefined') {
      return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth < 800;
    }
    return false;
  });
  const [notifications, setNotifications] = useState<{ id: string; text: string }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'c1', name: 'Valley Dispatch', text: 'Welcome to Whispering Pines! Press E for backpack, C for custom skin tailor.', timestamp: Date.now(), isSystem: true },
  ]);

  const [timeState, setTimeState] = useState<TimeState>({
    day: 1,
    hour: 6,
    minute: 0,
    season: 'Spring',
    isNight: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Toast notification
  const addNotification = useCallback((text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev.slice(-3), { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  // Initialize Canvas & Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const engine = new GameEngine(canvas, {
      onTimeUpdate: (t) => setTimeState(t),
      onEnergyUpdate: (e) => setEnergy(e),
      onCoinsUpdate: (c) => setCozyCoins(c),
      onInventoryUpdate: (items) => {
        setInventory(items);
        setQuickSlots([...engine.quickSlots]);
      },
      onStartFishingMiniGame: () => {
        setShowFishing(true);
      },
      onPromptHouseEnter: (inHouse) => {
        setIsInHouse(inHouse);
        if (!inHouse) setIsDecorating(false);
      },
      onNotification: (msg) => addNotification(msg),
    });

    engineRef.current = engine;
    setInventory(engine.inventory);
    setQuickSlots(engine.quickSlots);
    engine.start();

    // Check URL parameters for LAN room link
    const searchParams = new URLSearchParams(window.location.search);
    const roomParam = searchParams.get('room');
    if (roomParam) {
      setRoomId(roomParam);
    }

    // Multiplayer chat listener
    const unsubscribeChat = multiplayer.onMessage((data) => {
      if (data.type === 'chat:message') {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}_${Math.random()}`,
            name: data.name,
            text: data.text,
            timestamp: data.timestamp,
          }
        ]);
        lofiAudio.playFootstep();
      } else if (data.type === 'player:joined' || data.type === 'init') {
        const count = 1 + (engine.remotePlayers.size);
        setOnlineCount(count);
      } else if (data.type === 'player:left') {
        const count = 1 + (engine.remotePlayers.size);
        setOnlineCount(count);
      }
    });

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      unsubscribeChat();
      engine.cleanup();
    };
  }, [addNotification]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'KeyE') {
        setShowBackpack(prev => !prev);
        lofiAudio.playFootstep();
      } else if (e.code === 'KeyC') {
        setShowSkinStudio(prev => !prev);
        lofiAudio.playFootstep();
      } else if (e.code === 'KeyT') {
        setShowChat(prev => !prev);
      } else if (e.code === 'KeyD') {
        if (engineRef.current?.currentRoom === 'house') {
          setIsDecorating(d => {
            const next = !d;
            if (engineRef.current) engineRef.current.isDecorating = next;
            return next;
          });
          lofiAudio.playPlaceDecor();
        }
      } else if (e.code === 'Escape') {
        if (showBackpack || showSkinStudio || showFishing || showChat) {
          setShowBackpack(false);
          setShowSkinStudio(false);
          setShowFishing(false);
          setShowChat(false);
        } else if (gameState === 'playing') {
          setShowHelp(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showBackpack, showSkinStudio, showFishing, showChat, gameState]);

  // Handle Start from Title Screen
  const handleStartGame = (chosenRoom: string) => {
    setRoomId(chosenRoom);
    setGameState('playing');

    if (engineRef.current) {
      multiplayer.connect(chosenRoom, {
        name: currentSkin.name,
        x: engineRef.current.playerX,
        y: engineRef.current.playerY,
        direction: engineRef.current.playerDirection,
        skin: currentSkin,
        currentRoom: engineRef.current.currentRoom,
      });
    }

    addNotification(`Welcome to ${chosenRoom}! Explore, farm, fish & decorate. 🌾`);
  };

  const handleSaveSkin = (newSkin: SkinConfig) => {
    setCurrentSkin(newSkin);
    if (engineRef.current) {
      engineRef.current.updateSkin(newSkin);
    }
    addNotification(`Avatar updated: ${newSkin.name} looks wonderful! ✨`);
  };

  const handleFishingCatch = (fish: FishDef, size: number) => {
    setShowFishing(false);
    if (engineRef.current) {
      engineRef.current.completeFishingSuccess(fish, size);
    }
  };

  const handleSelectQuickSlot = (slotIdx: number) => {
    setActiveSlotIdx(slotIdx);
    if (engineRef.current) {
      engineRef.current.activeSlotIdx = slotIdx;
    }
  };

  const handleEquipItemToSlot = (item: InventoryItem, slotIdx: number) => {
    if (engineRef.current) {
      engineRef.current.quickSlots[slotIdx] = item;
      setQuickSlots([...engineRef.current.quickSlots]);
      addNotification(`Equipped ${item.name} to quickbar slot ${slotIdx + 1}`);
    }
  };

  const handleUpdateCoins = (newCoins: number) => {
    setCozyCoins(newCoins);
    if (engineRef.current) {
      engineRef.current.cozyCoins = newCoins;
    }
  };

  const handleUpdateEnergy = (newEnergy: number) => {
    setEnergy(newEnergy);
    if (engineRef.current) {
      engineRef.current.energy = newEnergy;
    }
  };

  const handleToggleMute = () => {
    const muted = lofiAudio.toggleMute();
    setIsMuted(muted);
  };

  const handleCycleZoom = () => {
    if (engineRef.current) {
      const nextZ = engineRef.current.cycleZoom();
      setZoom(nextZ);
      addNotification(`2D Pixel Scale: ${nextZ}x 🔍`);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#15803d] select-none font-sans">
      {/* 60fps Native Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full [image-rendering:pixelated] cursor-crosshair z-0"
      />

      {/* Floating Notification Toasts */}
      <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className="bg-[#78350f]/95 text-[#fef08a] px-4 py-2 rounded-2xl border-2 border-[#451a03] shadow-2xl font-mono text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200"
          >
            <span>✨</span>
            <span>{n.text}</span>
          </div>
        ))}
      </div>

      {/* Title Screen View */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenSkinStudio={() => setShowSkinStudio(true)}
          currentSkin={currentSkin}
        />
      )}

      {/* Active Game HUD (Low-occlusion UI keeping >85% playfield clear) */}
      {gameState === 'playing' && (
        <GameHud
          timeState={timeState}
          energy={energy}
          maxEnergy={maxEnergy}
          cozyCoins={cozyCoins}
          roomId={roomId}
          onlineCount={onlineCount}
          isMuted={isMuted}
          isInHouse={isInHouse}
          isDecorating={isDecorating}
          zoom={zoom}
          onCycleZoom={handleCycleZoom}
          showMobileControls={showMobileControls}
          onToggleMobileControls={() => setShowMobileControls(s => !s)}
          quickSlots={quickSlots}
          activeSlot={activeSlotIdx}
          onSelectSlot={handleSelectQuickSlot}
          onToggleMute={handleToggleMute}
          onOpenBackpack={() => setShowBackpack(true)}
          onOpenSkinStudio={() => setShowSkinStudio(true)}
          onToggleDecorating={() => {
            setIsDecorating(d => {
              const next = !d;
              if (engineRef.current) engineRef.current.isDecorating = next;
              return next;
            });
            lofiAudio.playPlaceDecor();
          }}
          onSendEmote={(em) => engineRef.current?.triggerEmote(em)}
          onToggleChat={() => setShowChat(c => !c)}
          onOpenHelp={() => setShowHelp(true)}
        />
      )}

      {/* Dedicated Mobile On-Screen Virtual Controls */}
      {gameState === 'playing' && showMobileControls && !showBackpack && !showSkinStudio && !showFishing && !showHelp && (
        <MobileControls
          onMovement={(dx, dy) => engineRef.current?.setVirtualMovement(dx, dy)}
          onAction={() => engineRef.current?.performAction()}
          onRotateDecor={() => engineRef.current?.rotateDecor()}
          isDecorating={isDecorating}
          isInHouse={isInHouse}
          activeItem={quickSlots[activeSlotIdx] || null}
        />
      )}

      {/* Multiplayer LAN Chat Overlay */}
      {gameState === 'playing' && (
        <ChatOverlay
          messages={chatMessages}
          isOpen={showChat}
          onSendMessage={(text) => engineRef.current?.sendChatMessage(text)}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Modals */}
      {showBackpack && (
        <BackpackModal
          inventory={inventory}
          cozyCoins={cozyCoins}
          energy={energy}
          maxEnergy={maxEnergy}
          activeQuickSlot={activeSlotIdx}
          onSelectQuickItem={handleEquipItemToSlot}
          onUpdateInventory={(items) => {
            setInventory(items);
            if (engineRef.current) engineRef.current.inventory = items;
          }}
          onUpdateCoins={handleUpdateCoins}
          onUpdateEnergy={handleUpdateEnergy}
          onClose={() => setShowBackpack(false)}
        />
      )}

      {showSkinStudio && (
        <SkinStudioModal
          currentSkin={currentSkin}
          onSave={handleSaveSkin}
          onClose={() => setShowSkinStudio(false)}
        />
      )}

      {showFishing && (
        <FishingMiniGame
          onSuccess={handleFishingCatch}
          onCancel={() => {
            setShowFishing(false);
            if (engineRef.current) engineRef.current.isFishing = false;
          }}
        />
      )}

      {showHelp && (
        <HelpPauseModal
          onResume={() => setShowHelp(false)}
          onQuitToTitle={() => {
            setShowHelp(false);
            setGameState('title');
          }}
        />
      )}
    </div>
  );
}
