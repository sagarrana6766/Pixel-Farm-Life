import React, { useState } from 'react';
import { InventoryItem, FurnitureDef } from '../types/game';
import { CROPS, FISH_SPECIES, FURNITURE_CATALOG } from '../game/gameData';
import { lofiAudio } from '../audio/lofiAudio';
import { Package, Store, Coins, Sparkles, Check, ArrowRight, X } from 'lucide-react';

interface BackpackModalProps {
  inventory: InventoryItem[];
  cozyCoins: number;
  energy: number;
  maxEnergy: number;
  activeQuickSlot: number;
  onSelectQuickItem: (item: InventoryItem, slotIdx: number) => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateCoins: (newCoins: number) => void;
  onUpdateEnergy: (newEnergy: number) => void;
  onClose: () => void;
}

export const BackpackModal: React.FC<BackpackModalProps> = ({
  inventory,
  cozyCoins,
  energy,
  maxEnergy,
  activeQuickSlot,
  onSelectQuickItem,
  onUpdateInventory,
  onUpdateCoins,
  onUpdateEnergy,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'backpack' | 'shop'>('backpack');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(inventory[0]?.id || null);

  const selectedItem = inventory.find(i => i.id === selectedItemId);

  // Shop seed packets
  const seedProducts = Object.values(CROPS).map(crop => ({
    id: crop.seedId,
    name: `${crop.name} Seeds`,
    price: crop.id === 'strawberry' ? 15 : crop.id === 'corn' ? 20 : crop.id === 'pumpkin' ? 35 : crop.id === 'blueberry' ? 25 : 40,
    cropId: crop.id,
    icon: crop.id === 'strawberry' ? '🍓' : crop.id === 'corn' ? '🌽' : crop.id === 'pumpkin' ? '🎃' : crop.id === 'blueberry' ? '🫐' : '✨',
    desc: `Plant in tilled soil plots. Harvests into ${crop.name}.`,
  }));

  const handleSellItem = (item: InventoryItem) => {
    let sellVal = item.sellPrice || 10;
    if (item.category === 'crop') sellVal = 25;
    if (item.category === 'fish') {
      const spec = FISH_SPECIES.find(f => item.id.includes(f.id));
      sellVal = spec?.sellPrice || 35;
    }

    const updated = inventory.map(i => {
      if (i.id === item.id) {
        return { ...i, count: i.count - 1 };
      }
      return i;
    }).filter(i => i.count > 0);

    onUpdateInventory(updated);
    onUpdateCoins(cozyCoins + sellVal);
    lofiAudio.playHarvest();
  };

  const handleBuySeed = (seed: typeof seedProducts[0]) => {
    if (cozyCoins < seed.price) return;

    onUpdateCoins(cozyCoins - seed.price);
    lofiAudio.playPlant();

    const existing = inventory.find(i => i.id === seed.id);
    if (existing) {
      onUpdateInventory(
        inventory.map(i => i.id === seed.id ? { ...i, count: i.count + 1 } : i)
      );
    } else {
      onUpdateInventory([
        ...inventory,
        {
          id: seed.id,
          name: seed.name,
          category: 'seed',
          cropId: seed.cropId,
          count: 1,
          icon: seed.icon,
          description: seed.desc,
          buyPrice: seed.price,
        }
      ]);
    }
  };

  const handleBuyFurniture = (furn: FurnitureDef) => {
    if (cozyCoins < furn.price) return;

    onUpdateCoins(cozyCoins - furn.price);
    lofiAudio.playPlaceDecor();

    const furnItemId = `furn_${furn.type}`;
    const existing = inventory.find(i => i.id === furnItemId);
    if (existing) {
      onUpdateInventory(
        inventory.map(i => i.id === furnItemId ? { ...i, count: i.count + 1 } : i)
      );
    } else {
      onUpdateInventory([
        ...inventory,
        {
          id: furnItemId,
          name: furn.name,
          category: 'furniture',
          furnitureType: furn.type,
          count: 1,
          icon: furn.category === 'bed' ? '🛏️' : furn.category === 'hearth' ? '🔥' : furn.category === 'plant' ? '🪴' : '🪑',
          description: furn.description,
          buyPrice: furn.price,
        }
      ]);
    }
  };

  const handleEatProduce = (item: InventoryItem) => {
    if (item.category !== 'crop' && !item.id.includes('berry')) return;
    const energyGain = 25;
    onUpdateEnergy(Math.min(maxEnergy, energy + energyGain));

    const updated = inventory.map(i => {
      if (i.id === item.id) return { ...i, count: i.count - 1 };
      return i;
    }).filter(i => i.count > 0);

    onUpdateInventory(updated);
    lofiAudio.playCatchSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#fffbeb] border-4 border-[#78350f] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-[#451a03]">
        {/* Header */}
        <div className="bg-[#78350f] text-[#fef08a] px-6 py-3 flex items-center justify-between border-b-4 border-[#451a03]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setActiveTab('backpack'); lofiAudio.playFootstep(); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'backpack' ? 'bg-[#92400e] text-white shadow-inner' : 'text-amber-200 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              Backpack Basket
            </button>
            <button
              onClick={() => { setActiveTab('shop'); lofiAudio.playFootstep(); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'shop' ? 'bg-[#92400e] text-white shadow-inner' : 'text-amber-200 hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" />
              Valley Farm Stall
            </button>
          </div>

          {/* Currency Display */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#451a03] text-amber-300 px-3 py-1 rounded-full border border-amber-500 font-mono font-bold text-sm tabular-nums">
              <Coins className="w-4 h-4 text-amber-400" />
              {cozyCoins} Coins
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-[#92400e] hover:bg-[#b45309] text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'backpack' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Item Slots */}
              <div className="md:col-span-7">
                <span className="text-xs font-bold text-[#78350f] font-mono uppercase tracking-wider block mb-2">
                  Inventory Items ({inventory.reduce((a, b) => a + b.count, 0)} total)
                </span>
                <div className="grid grid-cols-4 gap-2.5">
                  {inventory.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        lofiAudio.playFootstep();
                      }}
                      className={`relative aspect-square flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedItemId === item.id
                          ? 'bg-amber-100 border-[#78350f] scale-102 ring-2 ring-amber-400 shadow-md'
                          : 'bg-white border-[#fed7aa] hover:border-amber-400'
                      }`}
                    >
                      <span className="text-2xl drop-shadow-sm">{item.icon}</span>
                      <span className="text-[10px] font-mono font-bold text-[#78350f] truncate w-full text-center mt-1">
                        {item.name}
                      </span>
                      {item.count > 1 && (
                        <span className="absolute bottom-1 right-1.5 text-[10px] font-mono font-extrabold bg-[#78350f] text-amber-100 px-1 rounded-sm tabular-nums">
                          x{item.count}
                        </span>
                      )}
                    </button>
                  ))}
                  {/* Empty slots for aesthetics */}
                  {Array.from({ length: Math.max(0, 16 - inventory.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square rounded-xl border-2 border-dashed border-[#fed7aa]/70 bg-amber-50/50 flex items-center justify-center"
                    >
                      <span className="text-stone-300 text-xs">·</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Item Detail Card */}
              <div className="md:col-span-5 bg-[#fef3c7] p-4 rounded-xl border-2 border-[#b45309] flex flex-col justify-between">
                {selectedItem ? (
                  <>
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#78350f] flex items-center justify-center text-3xl shadow-xs">
                          {selectedItem.icon}
                        </div>
                        <div>
                          <h4 className="font-mono font-bold text-sm text-[#78350f]">
                            {selectedItem.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-[#92400e] bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 font-mono">
                            {selectedItem.category}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-700 bg-white/80 p-3 rounded-lg border border-amber-200 mb-4 leading-relaxed">
                        {selectedItem.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#fed7aa]">
                      {/* Equip to Quickbar button */}
                      <button
                        onClick={() => {
                          onSelectQuickItem(selectedItem, activeQuickSlot);
                          lofiAudio.playFootstep();
                        }}
                        className="w-full py-2 bg-[#78350f] hover:bg-[#92400e] text-amber-100 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Equip to Active Slot ({activeQuickSlot + 1})
                      </button>

                      {/* Eat / Consume option if produce */}
                      {selectedItem.category === 'crop' && (
                        <button
                          onClick={() => handleEatProduce(selectedItem)}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Snack on Fresh Produce (+25 Energy)
                        </button>
                      )}

                      {/* Sell for Coins */}
                      {(selectedItem.category === 'crop' || selectedItem.category === 'fish') && (
                        <button
                          onClick={() => handleSellItem(selectedItem)}
                          className="w-full py-2 bg-[#f59e0b] hover:bg-[#d97706] text-amber-950 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Sell to Shipping Bin (+Coins)
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-mono text-stone-500">
                    Select an item to view options
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Shop Tab */
            <div className="space-y-6">
              {/* Seeds Section */}
              <div>
                <h4 className="font-mono font-bold text-sm text-[#78350f] mb-3 flex items-center gap-2">
                  <span>🌱</span> Fresh Seasonal Seeds & Plants
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {seedProducts.map(seed => (
                    <div
                      key={seed.id}
                      className="bg-white p-3 rounded-xl border-2 border-[#fed7aa] flex items-center justify-between shadow-xs hover:border-amber-400 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{seed.icon}</span>
                        <div>
                          <div className="font-mono font-bold text-xs text-[#78350f]">{seed.name}</div>
                          <div className="text-[10px] text-amber-800 font-mono font-bold">{seed.price} Cozy Coins</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBuySeed(seed)}
                        disabled={cozyCoins < seed.price}
                        className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                          cozyCoins >= seed.price
                            ? 'bg-[#15803d] hover:bg-[#16a34a] text-white shadow-xs'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        Buy
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cottage Decor Catalog */}
              <div>
                <h4 className="font-mono font-bold text-sm text-[#78350f] mb-3 flex items-center gap-2">
                  <span>🏡</span> Cottage Decor & Furnishings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FURNITURE_CATALOG.map(furn => (
                    <div
                      key={furn.type}
                      className="bg-white p-3 rounded-xl border-2 border-[#fed7aa] flex items-center justify-between shadow-xs hover:border-amber-400 transition-colors"
                    >
                      <div>
                        <div className="font-mono font-bold text-xs text-[#78350f]">{furn.name}</div>
                        <div className="text-[10px] text-stone-500 line-clamp-1">{furn.description}</div>
                        <div className="text-[10px] text-amber-800 font-mono font-bold mt-0.5">{furn.price} Coins</div>
                      </div>
                      <button
                        onClick={() => handleBuyFurniture(furn)}
                        disabled={cozyCoins < furn.price}
                        className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer shrink-0 ml-2 ${
                          cozyCoins >= furn.price
                            ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        Order
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
