/**
 * Pure Coin Engine for Live Quiz Economy
 * Calculates coin rewards authoritatively based on accuracy, speed, streak, and equipment bonuses.
 */

export const COIN_REWARD_CONFIG = {
  correctAnswerBase: 10,
  speedBonus: {
    under5sec: 3,
    under10sec: 2,
    under15sec: 1,
  },
  streakBonus: {
    streak3: 2,
    streak5: 5,
    streak10: 10,
  },
};

export interface CoinRewardInput {
  isCorrect: boolean;
  timeSpentSec: number;
  streak: number;
  equipmentCoinBonusPercent?: number; // e.g. 5%
}

export interface CoinRewardResult {
  baseCoins: number;
  speedBonusCoins: number;
  streakBonusCoins: number;
  equipmentBonusCoins: number;
  totalCoins: number;
}

export function calculateCoinReward(input: CoinRewardInput): CoinRewardResult {
  const { isCorrect, timeSpentSec, streak, equipmentCoinBonusPercent = 0 } = input;

  // Incorrect answer = 0 coins. No coin deductions ever!
  if (!isCorrect) {
    return {
      baseCoins: 0,
      speedBonusCoins: 0,
      streakBonusCoins: 0,
      equipmentBonusCoins: 0,
      totalCoins: 0,
    };
  }

  const baseCoins = COIN_REWARD_CONFIG.correctAnswerBase;

  // Speed Bonus Coins (lightweight speed incentive)
  let speedBonusCoins = 0;
  if (timeSpentSec <= 5) {
    speedBonusCoins = COIN_REWARD_CONFIG.speedBonus.under5sec;
  } else if (timeSpentSec <= 10) {
    speedBonusCoins = COIN_REWARD_CONFIG.speedBonus.under10sec;
  } else if (timeSpentSec <= 15) {
    speedBonusCoins = COIN_REWARD_CONFIG.speedBonus.under15sec;
  }

  // Streak Bonus Coins (milestone bonuses)
  let streakBonusCoins = 0;
  if (streak >= 10) {
    streakBonusCoins = COIN_REWARD_CONFIG.streakBonus.streak10;
  } else if (streak >= 5) {
    streakBonusCoins = COIN_REWARD_CONFIG.streakBonus.streak5;
  } else if (streak >= 3) {
    streakBonusCoins = COIN_REWARD_CONFIG.streakBonus.streak3;
  }

  const rawSubtotal = baseCoins + speedBonusCoins + streakBonusCoins;
  const equipmentBonusCoins = Math.floor((rawSubtotal * Math.max(0, equipmentCoinBonusPercent)) / 100);

  const totalCoins = rawSubtotal + equipmentBonusCoins;

  return {
    baseCoins,
    speedBonusCoins,
    streakBonusCoins,
    equipmentBonusCoins,
    totalCoins,
  };
}
