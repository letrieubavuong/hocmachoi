import { CoinRewardResult } from './coinEngine';

export type EquipmentSlot = 'HEAD' | 'BODY' | 'WEAPON' | 'ACCESSORY' | 'PET';

export type EquipmentRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  description: string;
  icon: string;
  rarity: EquipmentRarity;
  basePrice: number;
  maxLevel: number;
  coinBonusPercentPerLevel: number; // e.g. 2% -> Lv5 = +10%
  chibiStyleOverrides?: {
    hatStyle?: string;
    outfitStyle?: string;
    accessory?: string;
  };
}

export interface StudentInventoryItem {
  instanceId: string;
  equipmentId: string;
  level: number; // 1 to 5
  acquiredAt: number;
}

export interface StudentWallet {
  studentId: string;
  studentName: string;
  coins: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  inventory: StudentInventoryItem[];
  equipped: Record<EquipmentSlot, string | null>; // equipmentId
  processedAttemptKeys: string[]; // Idempotency transaction tracker
  updatedAt: number;
}

export const SHOP_CATALOG: EquipmentDefinition[] = [
  {
    id: 'hat_astronaut',
    name: '🪖 Mũ Phi Hành Gia',
    slot: 'HEAD',
    description: 'Bảo vệ đầu óc minh mẫn, tăng +1% Xu mỗi level.',
    icon: '🪖',
    rarity: 'COMMON',
    basePrice: 300,
    maxLevel: 5,
    coinBonusPercentPerLevel: 1,
    chibiStyleOverrides: { hatStyle: 'cap' },
  },
  {
    id: 'hat_crown',
    name: '👑 Vương Miện Tri Thức',
    slot: 'HEAD',
    description: 'Biểu tượng của học sinh xuất sắc, +2% Xu mỗi level.',
    icon: '👑',
    rarity: 'RARE',
    basePrice: 800,
    maxLevel: 5,
    coinBonusPercentPerLevel: 2,
    chibiStyleOverrides: { hatStyle: 'crown' },
  },
  {
    id: 'hat_wizard',
    name: '🧙 Mũ Phù Thủy Vật Lý',
    slot: 'HEAD',
    description: 'Biến công thức khó thành dễ dàng, +3% Xu mỗi level.',
    icon: '🧙',
    rarity: 'EPIC',
    basePrice: 1500,
    maxLevel: 5,
    coinBonusPercentPerLevel: 3,
    chibiStyleOverrides: { hatStyle: 'wizardHat' },
  },
  {
    id: 'body_lab',
    name: '🥼 Áo Thí Nghiệm Nhà Bác Học',
    slot: 'BODY',
    description: 'Trang phục thí nghiệm chuẩn mực, +1% Xu mỗi level.',
    icon: '🥼',
    rarity: 'COMMON',
    basePrice: 350,
    maxLevel: 5,
    coinBonusPercentPerLevel: 1,
    chibiStyleOverrides: { outfitStyle: 'uniform' },
  },
  {
    id: 'body_hero',
    name: '🦸 Áo Choàng Siêu Anh Hùng',
    slot: 'BODY',
    description: 'Bứt phá tốc độ giải đề, +2% Xu mỗi level.',
    icon: '🦸',
    rarity: 'RARE',
    basePrice: 900,
    maxLevel: 5,
    coinBonusPercentPerLevel: 2,
    chibiStyleOverrides: { outfitStyle: 'superhero' },
  },
  {
    id: 'body_armor',
    name: '🛡️ Giáp Năng Lượng Plasma',
    slot: 'BODY',
    description: 'Bảo vệ tối đa & hấp thụ năng lượng, +3% Xu mỗi level.',
    icon: '🛡️',
    rarity: 'EPIC',
    basePrice: 1800,
    maxLevel: 5,
    coinBonusPercentPerLevel: 3,
    chibiStyleOverrides: { outfitStyle: 'wizard' },
  },
  {
    id: 'weapon_wand',
    name: '🪄 Gậy Phép Thuật Physics',
    slot: 'WEAPON',
    description: 'Tỏa sáng phép thuật giải nhanh, +2% Xu mỗi level.',
    icon: '🪄',
    rarity: 'RARE',
    basePrice: 1000,
    maxLevel: 5,
    coinBonusPercentPerLevel: 2,
  },
  {
    id: 'weapon_sword',
    name: '⚡ Kiếm Plasma Newton',
    slot: 'WEAPON',
    description: 'Thanh kiếm huyền thoại của nhà Vật Lý, +4% Xu mỗi level.',
    icon: '⚡',
    rarity: 'LEGENDARY',
    basePrice: 2500,
    maxLevel: 5,
    coinBonusPercentPerLevel: 4,
  },
  {
    id: 'acc_glasses',
    name: '👓 Kính Tri Thức Bác Học',
    slot: 'ACCESSORY',
    description: 'Nhìn thấu đáp án trắc nghiệm, +1% Xu mỗi level.',
    icon: '👓',
    rarity: 'COMMON',
    basePrice: 250,
    maxLevel: 5,
    coinBonusPercentPerLevel: 1,
    chibiStyleOverrides: { accessory: 'glasses' },
  },
  {
    id: 'acc_ring',
    name: '💍 Nhẫn May Mắn',
    slot: 'ACCESSORY',
    description: 'Tăng cường may mắn nhận thưởng, +2% Xu mỗi level.',
    icon: '💍',
    rarity: 'RARE',
    basePrice: 750,
    maxLevel: 5,
    coinBonusPercentPerLevel: 2,
  },
  {
    id: 'pet_owl',
    name: '🦉 Cú Mèo Thông Thái',
    slot: 'PET',
    description: 'Bạn đồng hành mẫn cán nhắc bài, +3% Xu mỗi level.',
    icon: '🦉',
    rarity: 'EPIC',
    basePrice: 1600,
    maxLevel: 5,
    coinBonusPercentPerLevel: 3,
  },
  {
    id: 'pet_dragon',
    name: '🐲 Rồng Con Năng Lượng',
    slot: 'PET',
    description: 'Thú cưng truyền thuyết phun lửa tri thức, +4% Xu mỗi level.',
    icon: '🐲',
    rarity: 'LEGENDARY',
    basePrice: 3000,
    maxLevel: 5,
    coinBonusPercentPerLevel: 4,
  },
];

const STORAGE_WALLET_PREFIX = 'chibi_quiz_wallet_';

export class StudentWalletService {
  private static getStorageKey(studentId: string): string {
    const cleanId = (studentId || 'default_student').trim();
    return `${STORAGE_WALLET_PREFIX}${cleanId}`;
  }

  /**
   * Get or initialize student wallet
   */
  public static getWallet(studentId: string, studentName: string = 'Học Sinh'): StudentWallet {
    if (typeof window === 'undefined') {
      return this.createDefaultWallet(studentId, studentName);
    }

    const key = this.getStorageKey(studentId);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.coins === 'number') {
          return {
            ...this.createDefaultWallet(studentId, studentName),
            ...parsed,
          };
        }
      } catch (e) {
        console.error('[StudentWalletService] Failed to parse wallet:', e);
      }
    }

    const newWallet = this.createDefaultWallet(studentId, studentName);
    this.saveWallet(newWallet);
    return newWallet;
  }

  /**
   * Save wallet to localStorage
   */
  public static saveWallet(wallet: StudentWallet): void {
    if (typeof window === 'undefined') return;
    const key = this.getStorageKey(wallet.studentId);
    try {
      localStorage.setItem(key, JSON.stringify(wallet));
    } catch (e) {
      console.error('[StudentWalletService] Failed to save wallet:', e);
    }
  }

  private static createDefaultWallet(studentId: string, studentName: string): StudentWallet {
    return {
      studentId: studentId || 'default_student',
      studentName: studentName || 'Học Sinh',
      coins: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      inventory: [],
      equipped: {
        HEAD: null,
        BODY: null,
        WEAPON: null,
        ACCESSORY: null,
        PET: null,
      },
      processedAttemptKeys: [],
      updatedAt: Date.now(),
    };
  }

  /**
   * Calculate current equipment coin bonus percentage
   */
  public static getEquippedCoinBonusPercent(wallet: StudentWallet): number {
    let totalBonus = 0;
    Object.values(wallet.equipped).forEach((equipmentId) => {
      if (!equipmentId) return;
      const def = SHOP_CATALOG.find((item) => item.id === equipmentId);
      const invItem = wallet.inventory.find((inv) => inv.equipmentId === equipmentId);
      if (def && invItem) {
        totalBonus += def.coinBonusPercentPerLevel * invItem.level;
      }
    });
    return totalBonus;
  }

  /**
   * Idempotently credit coins for a quiz answer attempt key
   */
  public static creditCoins(
    studentId: string,
    studentName: string,
    transactionKey: string, // `${roomId}_q${questionId}_${studentId}`
    coinResult: CoinRewardResult
  ): { wallet: StudentWallet; credited: boolean } {
    const wallet = this.getWallet(studentId, studentName);

    // Anti-farming check: If key already processed, do not add coins again!
    if (wallet.processedAttemptKeys.includes(transactionKey)) {
      return { wallet, credited: false };
    }

    if (coinResult.totalCoins <= 0) {
      // Mark key as processed even if 0 coins to maintain record
      const updatedKeys = [transactionKey, ...wallet.processedAttemptKeys.slice(0, 199)];
      const updatedWallet = { ...wallet, processedAttemptKeys: updatedKeys, updatedAt: Date.now() };
      this.saveWallet(updatedWallet);
      return { wallet: updatedWallet, credited: false };
    }

    const updatedKeys = [transactionKey, ...wallet.processedAttemptKeys.slice(0, 199)];
    const newCoins = wallet.coins + coinResult.totalCoins;
    const newLifetime = wallet.lifetimeEarned + coinResult.totalCoins;

    const updatedWallet: StudentWallet = {
      ...wallet,
      coins: newCoins,
      lifetimeEarned: newLifetime,
      processedAttemptKeys: updatedKeys,
      updatedAt: Date.now(),
    };

    this.saveWallet(updatedWallet);
    return { wallet: updatedWallet, credited: true };
  }

  /**
   * Purchase an equipment item from Shop
   */
  public static purchaseItem(
    studentId: string,
    equipmentId: string
  ): { success: boolean; message: string; wallet: StudentWallet } {
    const wallet = this.getWallet(studentId);
    const def = SHOP_CATALOG.find((item) => item.id === equipmentId);

    if (!def) {
      return { success: false, message: 'Trang bị không tồn tại trong Cửa Hàng!', wallet };
    }

    // Check if already owned
    const existing = wallet.inventory.find((inv) => inv.equipmentId === equipmentId);
    if (existing) {
      return { success: false, message: 'Bạn đã sở hữu trang bị này rồi!', wallet };
    }

    if (wallet.coins < def.basePrice) {
      return {
        success: false,
        message: `Bạn cần thêm 🪙 ${def.basePrice - wallet.coins} Xu để mua trang bị này!`,
        wallet,
      };
    }

    const newInventoryItem: StudentInventoryItem = {
      instanceId: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      equipmentId,
      level: 1,
      acquiredAt: Date.now(),
    };

    const newEquipped = { ...wallet.equipped };
    // Auto-equip if slot is empty
    if (!newEquipped[def.slot]) {
      newEquipped[def.slot] = equipmentId;
    }

    const updatedWallet: StudentWallet = {
      ...wallet,
      coins: wallet.coins - def.basePrice,
      lifetimeSpent: wallet.lifetimeSpent + def.basePrice,
      inventory: [...wallet.inventory, newInventoryItem],
      equipped: newEquipped,
      updatedAt: Date.now(),
    };

    this.saveWallet(updatedWallet);
    return { success: true, message: `Mua thành công ${def.name}!`, wallet: updatedWallet };
  }

  /**
   * Upgrade an owned equipment item level (Lv1 -> Lv5)
   */
  public static upgradeItem(
    studentId: string,
    equipmentId: string
  ): { success: boolean; message: string; wallet: StudentWallet } {
    const wallet = this.getWallet(studentId);
    const def = SHOP_CATALOG.find((item) => item.id === equipmentId);
    const invIndex = wallet.inventory.findIndex((inv) => inv.equipmentId === equipmentId);

    if (!def || invIndex === -1) {
      return { success: false, message: 'Bạn chưa sở hữu trang bị này!', wallet };
    }

    const currentItem = wallet.inventory[invIndex];
    if (currentItem.level >= def.maxLevel) {
      return { success: false, message: 'Trang bị đã đạt cấp độ tối đa (Lv 5)!', wallet };
    }

    // Upgrade cost formula: Math.round(basePrice * 0.6 * currentLevel)
    const upgradeCost = Math.round(def.basePrice * 0.6 * currentItem.level);

    if (wallet.coins < upgradeCost) {
      return {
        success: false,
        message: `Bạn cần thêm 🪙 ${upgradeCost - wallet.coins} Xu để nâng cấp lên Lv ${currentItem.level + 1}!`,
        wallet,
      };
    }

    const updatedInventory = [...wallet.inventory];
    updatedInventory[invIndex] = {
      ...currentItem,
      level: currentItem.level + 1,
    };

    const updatedWallet: StudentWallet = {
      ...wallet,
      coins: wallet.coins - upgradeCost,
      lifetimeSpent: wallet.lifetimeSpent + upgradeCost,
      inventory: updatedInventory,
      updatedAt: Date.now(),
    };

    this.saveWallet(updatedWallet);
    return {
      success: true,
      message: `Nâng cấp ${def.name} lên Lv ${currentItem.level + 1} thành công!`,
      wallet: updatedWallet,
    };
  }

  /**
   * Equip / Unequip an item in inventory
   */
  public static equipItem(
    studentId: string,
    slot: EquipmentSlot,
    equipmentId: string | null
  ): StudentWallet {
    const wallet = this.getWallet(studentId);
    const updatedEquipped = {
      ...wallet.equipped,
      [slot]: equipmentId,
    };

    const updatedWallet: StudentWallet = {
      ...wallet,
      equipped: updatedEquipped,
      updatedAt: Date.now(),
    };

    this.saveWallet(updatedWallet);
    return updatedWallet;
  }
}
