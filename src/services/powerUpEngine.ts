import { PowerUpType, Player } from '../types';
import {
  Swords,
  Shield,
  Zap,
  Snowflake,
  Gift,
  Bomb,
  Eye,
  Rocket,
  ShieldAlert,
  Flame,
} from 'lucide-react';

export type TargetMode = 'SELF' | 'OPPONENT' | 'ALL';

export interface PowerUpDefinition {
  type: PowerUpType;
  title: string;
  subTitle: string;
  description: string;
  targetMode: TargetMode;
  icon: any;
  badgeColor: string;
  cardBgGradient: string;
  borderClass: string;
  enabledInHomework: boolean;
  maxStack: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

export const POWER_UP_CONFIG: Record<PowerUpType, PowerUpDefinition> = {
  ATTACK: {
    type: 'ATTACK',
    title: 'TẤN CÔNG',
    subTitle: 'CƯỚP 20% ĐIỂM',
    description: 'Chọn 1 đối thủ bất kỳ để cướp 20% tổng điểm số!',
    targetMode: 'OPPONENT',
    icon: Swords,
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    cardBgGradient: 'from-rose-950/80 via-slate-900 to-red-950/80',
    borderClass: 'border-rose-500/50 hover:border-rose-400',
    enabledInHomework: false,
    maxStack: 1,
    rarity: 'EPIC',
  },
  SHIELD: {
    type: 'SHIELD',
    title: 'KHIÊN BẢO VỆ',
    subTitle: 'CHẶN SÁT THƯƠNG',
    description: 'Bật khiên bảo vệ chặn 100% đòn tấn công từ đối thủ!',
    targetMode: 'SELF',
    icon: Shield,
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    cardBgGradient: 'from-cyan-950/80 via-slate-900 to-blue-950/80',
    borderClass: 'border-cyan-500/50 hover:border-cyan-400',
    enabledInHomework: true,
    maxStack: 3,
    rarity: 'COMMON',
  },
  ORACLE_5050: {
    type: 'ORACLE_5050',
    title: 'MẮT THẦN 50:50',
    subTitle: 'LOẠI 2 ĐÁP ÁN SAI',
    description: 'Mở trợ giúp loại bỏ 2 phương án sai ở câu tiếp theo!',
    targetMode: 'SELF',
    icon: Eye,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    cardBgGradient: 'from-emerald-950/80 via-slate-900 to-teal-950/80',
    borderClass: 'border-emerald-500/50 hover:border-emerald-400',
    enabledInHomework: true,
    maxStack: 1,
    rarity: 'COMMON',
  },
  MYSTERY_BOX: {
    type: 'MYSTERY_BOX',
    title: 'MỞ RƯƠNG KHO BÁU',
    subTitle: 'NHẬN ĐIỂM NGẪU NHIÊN',
    description: 'Mở rương nhận ngẫu nhiên +100 đến +500 điểm!',
    targetMode: 'SELF',
    icon: Gift,
    badgeColor: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50',
    cardBgGradient: 'from-yellow-950/80 via-slate-900 to-amber-950/80',
    borderClass: 'border-yellow-400/60 hover:border-yellow-300',
    enabledInHomework: true,
    maxStack: 1,
    rarity: 'RARE',
  },
  FREEZE: {
    type: 'FREEZE',
    title: 'ĐÓNG BẰNG',
    subTitle: 'ĐÓNG BẰNG MÀN HÌNH',
    description: 'Đóng băng màn hình đối thủ trong 10 giây!',
    targetMode: 'OPPONENT',
    icon: Snowflake,
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    cardBgGradient: 'from-cyan-950/80 via-slate-900 to-blue-950/80',
    borderClass: 'border-cyan-400/60 hover:border-cyan-300',
    enabledInHomework: false,
    maxStack: 1,
    rarity: 'EPIC',
  },
  BOMB: {
    type: 'BOMB',
    title: 'BOM HẸN GIỜ',
    subTitle: 'GẮN BOM VÀO CÂU KẾ',
    description: 'Trả lời đúng để phá bom (+50đ). Trả lời sai bom nổ (-150đ)!',
    targetMode: 'OPPONENT',
    icon: Bomb,
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    cardBgGradient: 'from-orange-950/80 via-slate-900 to-red-950/80',
    borderClass: 'border-orange-500/60 hover:border-orange-400',
    enabledInHomework: false,
    maxStack: 1,
    rarity: 'RARE',
  },
  DOUBLE_POINTS: {
    type: 'DOUBLE_POINTS',
    title: 'X2 ĐIỂM SỐ',
    subTitle: 'NHÂN ĐÔI ĐIỂM CÂU KẾ',
    description: 'Nhân đôi số điểm đạt được ở câu hỏi tiếp theo!',
    targetMode: 'SELF',
    icon: Zap,
    badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    cardBgGradient: 'from-amber-950/80 via-slate-900 to-yellow-950/80',
    borderClass: 'border-yellow-500/50 hover:border-yellow-400',
    enabledInHomework: true,
    maxStack: 1,
    rarity: 'RARE',
  },
  ROCKET_BOOST: {
    type: 'ROCKET_BOOST',
    title: 'TĂNG TỐC TÊN LỬA',
    subTitle: 'THƯỞNG TỐC ĐỘ <5S',
    description: 'Trả lời đúng dưới 5s ở câu tiếp theo nhận thêm +200 điểm!',
    targetMode: 'SELF',
    icon: Rocket,
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    cardBgGradient: 'from-purple-950/80 via-slate-900 to-indigo-950/80',
    borderClass: 'border-purple-500/50 hover:border-purple-400',
    enabledInHomework: true,
    maxStack: 1,
    rarity: 'RARE',
  },
  REFLECT_SHIELD: {
    type: 'REFLECT_SHIELD',
    title: 'KHIÊN PHẢN ĐÒN',
    subTitle: 'PHẢN ĐÒN TẤN CÔNG',
    description: 'Phản đòn Tấn công / Đóng băng / Bom về chính chủ!',
    targetMode: 'SELF',
    icon: ShieldAlert,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    cardBgGradient: 'from-amber-950/80 via-slate-900 to-orange-950/80',
    borderClass: 'border-amber-500/50 hover:border-amber-400',
    enabledInHomework: true,
    maxStack: 1,
    rarity: 'LEGENDARY',
  },
  STREAK_GUARD: {
    type: 'STREAK_GUARD',
    title: 'BẢO TOÀN CHUỖI',
    subTitle: 'GIỮ CHUỖI KHI TRẢ LỜI SAI',
    description: 'Nếu trả lời sai ở câu tiếp theo, chuỗi thắng sẽ không bị reset!',
    targetMode: 'SELF',
    icon: Flame,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    cardBgGradient: 'from-rose-950/80 via-slate-900 to-orange-950/80',
    borderClass: 'border-rose-500/50 hover:border-rose-400',
    enabledInHomework: true,
    maxStack: 1,
    rarity: 'COMMON',
  },
};

export const REWARD_OPTIONS_LIVE: PowerUpType[] = [
  'SHIELD',
  'DOUBLE_POINTS',
  'ORACLE_5050',
  'REFLECT_SHIELD',
  'STREAK_GUARD',
  'MYSTERY_BOX',
  'ROCKET_BOOST',
  'ATTACK',
  'FREEZE',
  'BOMB',
];

export const REWARD_OPTIONS_HOMEWORK: PowerUpType[] = [
  'SHIELD',
  'DOUBLE_POINTS',
  'ORACLE_5050',
  'STREAK_GUARD',
  'MYSTERY_BOX',
  'ROCKET_BOOST',
  'REFLECT_SHIELD',
];

export class PowerUpEngine {
  /**
   * Check if a power-up targets opponents (offensive attack)
   */
  public static isOffensivePowerUp(type: PowerUpType): boolean {
    return POWER_UP_CONFIG[type]?.targetMode === 'OPPONENT';
  }

  /**
   * Deterministically calculate 2 wrong choice indices for 50:50 Oracle
   * Uses simple string hash so it stays identical across re-renders & reconnects
   */
  public static getDeterministic5050Indices(
    questionId: string,
    playerId: string,
    correctIndex: number
  ): number[] {
    const wrong = [0, 1, 2, 3].filter((i) => i !== correctIndex);
    if (wrong.length <= 2) return wrong;

    // Simple hash based on questionId + playerId
    const seedStr = `${questionId}_${playerId}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % wrong.length;
    const firstWrong = wrong[idx];
    const remainingWrong = wrong.filter((i) => i !== firstWrong);
    return [firstWrong, remainingWrong[0]];
  }

  /**
   * Comeback Bonus algorithm for struggling students
   */
  public static getRandomRewardForPlayer(
    streak: number,
    playerRank: number,
    totalPlayers: number,
    isHomework: boolean = false
  ): PowerUpType {
    const options = isHomework ? REWARD_OPTIONS_HOMEWORK : REWARD_OPTIONS_LIVE;

    // Comeback Bonus: If student is in bottom 30% rank or lost a high streak, favor supportive items
    const isBottomRank = totalPlayers > 3 && playerRank / totalPlayers >= 0.7;
    if (isBottomRank) {
      const supportiveItems: PowerUpType[] = ['ORACLE_5050', 'SHIELD', 'STREAK_GUARD', 'DOUBLE_POINTS'];
      return supportiveItems[Math.floor(Math.random() * supportiveItems.length)];
    }

    if (streak === 2) {
      const tier1: PowerUpType[] = ['SHIELD', 'DOUBLE_POINTS', 'ORACLE_5050', 'STREAK_GUARD'];
      return tier1[Math.floor(Math.random() * tier1.length)];
    }

    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Evaluate answer modifiers for score, streak, bomb defuse/explosion, rocket boost
   */
  public static evaluateAnswerModifiers(input: {
    player: Player;
    baseDeltaScore: number;
    isCorrect: boolean;
    timeSpentSec: number;
  }): {
    finalDeltaScore: number;
    newStreak: number;
    consumedPowerUps: {
      doublePoints?: boolean;
      oracle5050?: boolean;
      rocketBoost?: boolean;
      streakGuard?: boolean;
      bombDefused?: boolean;
      bombExploded?: boolean;
    };
    bonusFeedbackNotes: string[];
  } {
    const { player, baseDeltaScore, isCorrect, timeSpentSec } = input;
    let finalDeltaScore = baseDeltaScore;
    let newStreak = isCorrect ? player.streak + 1 : 0;

    const notes: string[] = [];
    const consumed = {
      doublePoints: false,
      oracle5050: false,
      rocketBoost: false,
      streakGuard: false,
      bombDefused: false,
      bombExploded: false,
    };

    // 1. Double Points
    if (player.doublePointsActive) {
      consumed.doublePoints = true;
      if (isCorrect) {
        finalDeltaScore = baseDeltaScore * 2;
        notes.push('⚡ X2 Điểm số kích hoạt!');
      }
    }

    // 2. Rocket Boost (Bonus +200 if correct in < 5.0 seconds)
    if (player.rocketBoostActive) {
      consumed.rocketBoost = true;
      if (isCorrect && timeSpentSec < 5.0) {
        finalDeltaScore += 200;
        notes.push('🚀 Thưởng Tăng tốc bứt phá (+200đ)!');
      }
    }

    // 3. Bomb Defuse vs Explosion Penalty (-150)
    if (player.isBombed) {
      if (isCorrect) {
        consumed.bombDefused = true;
        finalDeltaScore += 50;
        notes.push('💣 PHÁ BOM THÀNH CÔNG! (+50đ thưởng)');
      } else {
        consumed.bombExploded = true;
        finalDeltaScore -= 150;
        notes.push('💣 BOM NỔ TUNG! (-150đ phạt)');
      }
    }

    // 4. Streak Guard (Preserve streak on incorrect answer)
    if (!isCorrect && player.streakGuardActive) {
      consumed.streakGuard = true;
      newStreak = player.streak; // Preserve existing streak
      notes.push('🔥 Bảo toàn chuỗi thành công!');
    }

    // 5. 50:50 Oracle
    if (player.oracle5050Active) {
      consumed.oracle5050 = true;
    }

    return {
      finalDeltaScore,
      newStreak,
      consumedPowerUps: consumed,
      bonusFeedbackNotes: notes,
    };
  }
}
