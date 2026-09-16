/**
 * Pure Scoring Engine for Quiz / Battle Mode
 * Single Source of Truth for Points & Speed Bonus Calculations
 */

export interface ScoreInput {
  basePoints: number;
  timeSpentSec: number;
  isCorrect: boolean;
  streak: number;
  doublePointsActive?: boolean;
}

export interface ScoreResult {
  basePoints: number;
  speedBonus: number;
  speedRating: string;
  streakMultiplier: number;
  doublePointsMultiplier: number;
  effectiveMultiplier: number;
  totalEarned: number;
}

export function calculateAnswerScore(input: ScoreInput): ScoreResult {
  const { basePoints, timeSpentSec, isCorrect, streak, doublePointsActive } = input;

  if (!isCorrect) {
    return {
      basePoints: 0,
      speedBonus: 0,
      speedRating: 'Chưa chính xác',
      streakMultiplier: 1,
      doublePointsMultiplier: 1,
      effectiveMultiplier: 1,
      totalEarned: 0,
    };
  }

  let speedBonus = 0;
  let speedRating = 'Thường';

  if (timeSpentSec <= 3) {
    speedBonus = 150;
    speedRating = '⚡ TỐC ĐỘ SIÊU THẦN! (+150 PT)';
  } else if (timeSpentSec <= 6) {
    speedBonus = 100;
    speedRating = '🚀 TỐC ĐỘ ÁNH SÁNG! (+100 PT)';
  } else if (timeSpentSec <= 10) {
    speedBonus = 50;
    speedRating = '💨 TỐC ĐỘ NHANH NHẸN (+50 PT)';
  }

  const effectiveBase = (basePoints || 100) + speedBonus;
  const streakMultiplier = streak >= 2 ? 1.5 : 1;
  const doublePointsMultiplier = doublePointsActive ? 2 : 1;
  const effectiveMultiplier = streakMultiplier * doublePointsMultiplier;

  const totalEarned = Math.round(effectiveBase * effectiveMultiplier);

  return {
    basePoints: basePoints || 100,
    speedBonus,
    speedRating,
    streakMultiplier,
    doublePointsMultiplier,
    effectiveMultiplier,
    totalEarned,
  };
}

/**
 * Strict & Safe Short Answer Evaluator for Physics & General Science
 * - Replaces unsafe parseFloat (which allowed "3.5abc" to pass for 3.5)
 * - Supports comma (3,5) and dot (3.5) decimal formats
 * - Supports scientific notation (2e-3)
 * - Strict numeric regex ensures full string is numeric before Number comparison
 */
export function evaluateShortAnswer(userStr: string, targetStr: string): boolean {
  if (!userStr || !targetStr) return false;

  const userClean = userStr.trim();
  const targetClean = targetStr.trim();

  if (!userClean || !targetClean) return false;

  // 1. Direct Case-Insensitive String Comparison (ignoring extra internal spaces)
  const userTextNorm = userClean.toLowerCase().replace(/\s+/g, '');
  const targetTextNorm = targetClean.toLowerCase().replace(/\s+/g, '');

  if (userTextNorm === targetTextNorm) {
    return true;
  }

  // 2. Decimal Comma Normalization (e.g. "3,5" -> "3.5")
  const userNumStr = userClean.replace(',', '.').replace(/\s+/g, '');
  const targetNumStr = targetClean.replace(',', '.').replace(/\s+/g, '');

  if (userNumStr.toLowerCase() === targetNumStr.toLowerCase()) {
    return true;
  }

  // 3. Strict Numeric Parsing (Strict Regex: full string must be valid number)
  const STRICT_NUMERIC_REGEX = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;

  const isUserNumeric = STRICT_NUMERIC_REGEX.test(userNumStr);
  const isTargetNumeric = STRICT_NUMERIC_REGEX.test(targetNumStr);

  if (isUserNumeric && isTargetNumeric) {
    const userVal = Number(userNumStr);
    const targetVal = Number(targetNumStr);

    if (!isNaN(userVal) && !isNaN(targetVal)) {
      // Numerical comparison with small epsilon for floating point accuracy
      return Math.abs(userVal - targetVal) < 1e-6;
    }
  }

  return false;
}
