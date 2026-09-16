import React, { useState, useEffect, useMemo } from 'react';
import {
  StudentWallet,
  StudentWalletService,
  SHOP_CATALOG,
  EquipmentDefinition,
  EquipmentSlot,
} from '../services/studentWalletService';
import {
  ShoppingBag,
  Sparkles,
  Shield,
  Zap,
  CheckCircle,
  X,
  ChevronRight,
  TrendingUp,
  Package,
} from 'lucide-react';

interface StudentShopModalProps {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onWalletUpdate?: (updatedWallet: StudentWallet) => void;
}

type ShopTab = 'SHOP' | 'UPGRADE' | 'INVENTORY';

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  HEAD: '🪖 Mũ / Tóc',
  BODY: '🥼 Trang Phục',
  WEAPON: '⚡ Vũ Khí',
  ACCESSORY: '💍 Phụ Kiện',
  PET: '🦉 Thú Cưng',
};

const RARITY_STYLES: Record<string, { badgeBg: string; border: string }> = {
  COMMON: { badgeBg: 'bg-slate-700 text-slate-200 border-slate-600', border: 'border-slate-700' },
  RARE: { badgeBg: 'bg-blue-600/30 text-blue-300 border-blue-500/50', border: 'border-blue-500/40' },
  EPIC: { badgeBg: 'bg-purple-600/30 text-purple-300 border-purple-500/50', border: 'border-purple-500/40' },
  LEGENDARY: { badgeBg: 'bg-amber-500/30 text-amber-300 border-amber-500/50', border: 'border-amber-400/60' },
};

export const StudentShopModal: React.FC<StudentShopModalProps> = ({
  isOpen,
  studentId,
  studentName,
  onClose,
  onWalletUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('SHOP');
  const [wallet, setWallet] = useState<StudentWallet>(() =>
    StudentWalletService.getWallet(studentId, studentName)
  );
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<EquipmentSlot | 'ALL'>('ALL');
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync wallet when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentWallet = StudentWalletService.getWallet(studentId, studentName);
      setWallet(currentWallet);
      setFeedbackNotice(null);
    }
  }, [isOpen, studentId, studentName]);

  const currentEquippedBonus = useMemo(() => {
    return StudentWalletService.getEquippedCoinBonusPercent(wallet);
  }, [wallet]);

  if (!isOpen) return null;

  const handleBuy = (equipmentId: string) => {
    setFeedbackNotice(null);
    const result = StudentWalletService.purchaseItem(studentId, equipmentId);
    setWallet(result.wallet);
    if (onWalletUpdate) onWalletUpdate(result.wallet);

    if (result.success) {
      setFeedbackNotice({ type: 'success', text: result.message });
    } else {
      setFeedbackNotice({ type: 'error', text: result.message });
    }
  };

  const handleUpgrade = (equipmentId: string) => {
    setFeedbackNotice(null);
    const result = StudentWalletService.upgradeItem(studentId, equipmentId);
    setWallet(result.wallet);
    if (onWalletUpdate) onWalletUpdate(result.wallet);

    if (result.success) {
      setFeedbackNotice({ type: 'success', text: result.message });
    } else {
      setFeedbackNotice({ type: 'error', text: result.message });
    }
  };

  const handleToggleEquip = (slot: EquipmentSlot, equipmentId: string) => {
    const isCurrentlyEquipped = wallet.equipped[slot] === equipmentId;
    const nextEquipId = isCurrentlyEquipped ? null : equipmentId;
    const updated = StudentWalletService.equipItem(studentId, slot, nextEquipId);
    setWallet(updated);
    if (onWalletUpdate) onWalletUpdate(updated);
  };

  const filteredCatalog = SHOP_CATALOG.filter((item) => {
    if (selectedSlotFilter === 'ALL') return true;
    return item.slot === selectedSlotFilter;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-modal-title"
        className="relative w-full max-w-4xl bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-left max-h-[92dvh] flex flex-col overflow-hidden"
      >
        {/* Header Close Button */}
        <button
          type="button"
          aria-label="Đóng cửa hàng"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer shrink-0 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Hệ Thống Cửa Hàng & Nâng Cấp Trang Bị</span>
            </div>
            <h2 id="shop-modal-title" className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Cửa Hàng Tri Thức
            </h2>
          </div>

          {/* Wallet Balance Badge */}
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-2xl border border-amber-500/40 shadow-inner shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">Ví Xu Hiện Có</span>
              <span className="text-xl font-black text-yellow-400 tracking-wide font-mono block mt-1">
                🪙 {wallet.coins.toLocaleString()} Xu
              </span>
            </div>
            {currentEquippedBonus > 0 && (
              <div className="pl-3 border-l border-slate-800 text-right">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block leading-none">Bonus Đang Đeo</span>
                <span className="text-xs font-black text-emerald-300 block mt-1">
                  +{currentEquippedBonus}% Xu
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-4 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('SHOP')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'SHOP'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> <span>1. Cửa Hàng (Shop)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('UPGRADE')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'UPGRADE'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> <span>2. Nâng Cấp (Lv 1➔5)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVENTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'INVENTORY'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Package className="w-4 h-4" /> <span>3. Tủ Đồ & Trang Bị ({wallet.inventory.length})</span>
          </button>
        </div>

        {/* Feedback Notice Toast */}
        {feedbackNotice && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs font-bold shrink-0 flex items-center justify-between ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500 text-rose-300'
            }`}
          >
            <span>{feedbackNotice.text}</span>
            <button onClick={() => setFeedbackNotice(null)} className="p-1 hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: SHOP CATALOG */}
        {activeTab === 'SHOP' && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Slot Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlotFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedSlotFilter === 'ALL'
                    ? 'bg-yellow-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                Tất cả
              </button>
              {(Object.keys(SLOT_LABELS) as EquipmentSlot[]).map((slotKey) => (
                <button
                  key={slotKey}
                  type="button"
                  onClick={() => setSelectedSlotFilter(slotKey)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedSlotFilter === slotKey
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {SLOT_LABELS[slotKey]}
                </button>
              ))}
            </div>

            {/* Catalog Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredCatalog.map((item) => {
                const isOwned = wallet.inventory.some((inv) => inv.equipmentId === item.id);
                const rStyle = RARITY_STYLES[item.rarity] || RARITY_STYLES.COMMON;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-950/80 rounded-2xl border ${rStyle.border} p-4 flex flex-col justify-between space-y-3 relative group hover:border-amber-400/80 transition-all`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                          {item.icon}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${rStyle.badgeBg}`}>
                          {item.rarity}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-white text-sm">{item.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.description}</p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-900">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Hiệu ứng:</span>
                        <span className="font-black text-emerald-400">
                          +{item.coinBonusPercentPerLevel}% Xu / level
                        </span>
                      </div>

                      {isOwned ? (
                        <div className="w-full py-2 bg-slate-800 text-slate-400 rounded-xl font-bold text-center text-xs flex items-center justify-center gap-1 border border-slate-700">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Đã sở hữu
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={wallet.coins < item.basePrice}
                          onClick={() => handleBuy(item.id)}
                          className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span>MUA BẰNG 🪙 {item.basePrice.toLocaleString()} XU</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: UPGRADE ITEM */}
        {activeTab === 'UPGRADE' && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
            {wallet.inventory.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <Package className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-extrabold text-white text-base">Chưa Có Trang Bị Nào</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hãy ghé qua tab <strong>1. Cửa Hàng (Shop)</strong> để mua trang bị đầu tiên bằng số Xu bạn kiếm được từ Quiz nhé!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {wallet.inventory.map((invItem) => {
                  const def = SHOP_CATALOG.find((d) => d.id === invItem.equipmentId);
                  if (!def) return null;

                  const isMaxLevel = invItem.level >= def.maxLevel;
                  const upgradeCost = Math.round(def.basePrice * 0.6 * invItem.level);
                  const currentBonus = def.coinBonusPercentPerLevel * invItem.level;
                  const nextBonus = def.coinBonusPercentPerLevel * (invItem.level + 1);

                  return (
                    <div
                      key={invItem.instanceId}
                      className="bg-slate-950/90 rounded-2xl border border-purple-500/40 p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                            {def.icon}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-600/30 text-purple-300 border border-purple-500/50">
                            Cấp {invItem.level} / {def.maxLevel}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-white text-base">{def.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{def.description}</p>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-slate-900">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-semibold">Bonus hiện tại:</span>
                          <span className="font-black text-emerald-400">+{currentBonus}% Xu</span>
                        </div>

                        {!isMaxLevel && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-semibold">Sau khi nâng cấp:</span>
                            <span className="font-black text-amber-300">+{nextBonus}% Xu</span>
                          </div>
                        )}

                        {isMaxLevel ? (
                          <div className="w-full py-2.5 bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 rounded-xl font-black text-center text-xs">
                            ⭐ CẤP TỐI ĐA (LEVEL 5)
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={wallet.coins < upgradeCost}
                            onClick={() => handleUpgrade(def.id)}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <TrendingUp className="w-4 h-4 shrink-0" />
                            <span>NÂNG CẤP (🪙 {upgradeCost.toLocaleString()} XU)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INVENTORY & EQUIP */}
        {activeTab === 'INVENTORY' && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Current Equipped Overview Banner */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Trang Bị Đang Đeo Trên Người:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(SLOT_LABELS) as EquipmentSlot[]).map((slotKey) => {
                  const eqId = wallet.equipped[slotKey];
                  const eqDef = SHOP_CATALOG.find((d) => d.id === eqId);

                  return (
                    <div
                      key={slotKey}
                      className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center space-y-1"
                    >
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        {SLOT_LABELS[slotKey]}
                      </span>
                      {eqDef ? (
                        <div className="font-extrabold text-xs text-yellow-300 flex items-center justify-center gap-1 truncate">
                          <span>{eqDef.icon}</span>
                          <span className="truncate">{eqDef.name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic block">Trống</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory Items list to toggle equip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {wallet.inventory.map((invItem) => {
                const def = SHOP_CATALOG.find((d) => d.id === invItem.equipmentId);
                if (!def) return null;

                const isEquipped = wallet.equipped[def.slot] === def.id;

                return (
                  <div
                    key={invItem.instanceId}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isEquipped
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl p-2 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                        {def.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-sm truncate">{def.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-600/30 text-purple-300 border border-purple-500/40 shrink-0">
                            Lv {invItem.level}
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-bold block mt-0.5">
                          +{def.coinBonusPercentPerLevel * invItem.level}% Bonus Xu
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleEquip(def.slot, def.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isEquipped ? 'ĐANG ĐEO' : 'ĐEO NÀY'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
