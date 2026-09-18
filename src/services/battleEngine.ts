import { PowerUpType, Player } from '../types';
import { POWER_UP_CONFIG } from './powerUpEngine';

export type BattleMode = 'DISABLED' | 'ROUND' | 'PER_QUESTION' | 'RANDOM_TARGET_ONLY';
export type StudentTargetMode = 'MANUAL' | 'RANDOM';
export type BattlePhase = 'QUIZ' | 'BATTLE' | 'PAUSED';

export interface BattleConfig {
  questionsPerBattle: number;        // Default: 5
  battleDurationSec: number;         // Default: 10
  defaultBattleMode: BattleMode;     // Default: 'ROUND'
  defaultStudentTargetMode: StudentTargetMode; // Default: 'RANDOM'
  maxAttacksPerPlayerPerRound: number;// Default: 1
  maxAttacksReceivedPerRound: number; // Default: 1
  targetProtectionRounds: number;    // Default: 1
  attackCoinReward: number;          // Default: 0 (No coins from PvP)
  attackScoreReward: number;         // Default: 0 (No score from PvP)
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  questionsPerBattle: 5,
  battleDurationSec: 10,
  defaultBattleMode: 'ROUND',
  defaultStudentTargetMode: 'RANDOM',
  maxAttacksPerPlayerPerRound: 1,
  maxAttacksReceivedPerRound: 1,
  targetProtectionRounds: 1,
  attackCoinReward: 0,
  attackScoreReward: 0,
};

export interface BattleSessionState {
  battleEnabled: boolean;
  focusModeActive: boolean;
  battleMode: BattleMode;
  studentTargetMode: StudentTargetMode;
  currentPhase: BattlePhase;
  questionsUntilBattle: number;
  battleEndTimestamp: number;
  currentRoundId: number;
  attackerLogThisRound: Record<string, boolean>;     // playerId -> used attack
  receivedAttackCountThisRound: Record<string, number>;// playerId -> received count
  protectedPlayers: Record<string, number>;            // playerId -> protectedUntilRound
  lastTargetHistory: Record<string, string>;          // attackerId -> lastTargetId
}

export function createInitialBattleState(config: BattleConfig = DEFAULT_BATTLE_CONFIG): BattleSessionState {
  return {
    battleEnabled: config.defaultBattleMode !== 'DISABLED',
    focusModeActive: false,
    battleMode: config.defaultBattleMode,
    studentTargetMode: config.defaultStudentTargetMode,
    currentPhase: 'QUIZ',
    questionsUntilBattle: config.questionsPerBattle,
    battleEndTimestamp: 0,
    currentRoundId: 1,
    attackerLogThisRound: {},
    receivedAttackCountThisRound: {},
    protectedPlayers: {},
    lastTargetHistory: {},
  };
}

/**
 * Single Source of Truth for Focus Mode State Mutations
 */
export function setFocusModeState(prev?: BattleSessionState, active: boolean = true): BattleSessionState {
  const current = prev || createInitialBattleState();
  return {
    ...current,
    focusModeActive: active,
    currentPhase: active ? 'PAUSED' : (current.currentPhase === 'PAUSED' ? 'QUIZ' : current.currentPhase),
  };
}

/**
 * Single Source of Truth for Battle Mode State Mutations
 */
export function setBattleModeState(prev?: BattleSessionState, mode: BattleMode = 'ROUND'): BattleSessionState {
  const current = prev || createInitialBattleState();
  return {
    ...current,
    battleMode: mode,
    battleEnabled: mode !== 'DISABLED',
    studentTargetMode: mode === 'RANDOM_TARGET_ONLY' ? 'RANDOM' : current.studentTargetMode,
  };
}

export class BattleEngine {
  /**
   * Classify power-ups into Learning vs Battle types
   */
  public static isBattlePowerUp(type: PowerUpType): boolean {
    return type === 'ATTACK' || type === 'FREEZE' || type === 'BOMB';
  }

  public static isLearningPowerUp(type: PowerUpType): boolean {
    return !this.isBattlePowerUp(type);
  }

  /**
   * Filter valid targets for an offensive attack
   */
  public static getValidTargets(input: {
    attackerId: string;
    opponents: Player[];
    sessionState: BattleSessionState;
    config?: BattleConfig;
  }): Player[] {
    const { attackerId, opponents, sessionState, config = DEFAULT_BATTLE_CONFIG } = input;
    const currentRound = sessionState.currentRoundId;
    const lastTargetId = sessionState.lastTargetHistory[attackerId];

    const candidates = opponents.filter((p) => {
      // 1. Cannot attack self
      if (p.id === attackerId) return false;

      // 2. Check if player is currently protected by round protection
      const protectedUntil = sessionState.protectedPlayers[p.id] || 0;
      if (protectedUntil >= currentRound) return false;

      // 3. Check max attacks received per round
      const receivedCount = sessionState.receivedAttackCountThisRound[p.id] || 0;
      if (receivedCount >= config.maxAttacksReceivedPerRound) return false;

      return true;
    });

    if (candidates.length === 0) return [];

    // Filter out the last target if there are other alternative candidates available
    if (lastTargetId && candidates.length > 1) {
      const nonRepeated = candidates.filter((p) => p.id !== lastTargetId);
      if (nonRepeated.length > 0) return nonRepeated;
    }

    return candidates;
  }

  /**
   * Pick a random target safely from valid candidates
   */
  public static pickRandomTarget(input: {
    attackerId: string;
    opponents: Player[];
    sessionState: BattleSessionState;
    config?: BattleConfig;
  }): Player | null {
    const valid = this.getValidTargets(input);
    if (valid.length === 0) return null;
    const idx = Math.floor(Math.random() * valid.length);
    return valid[idx];
  }

  /**
   * Authoritative validation of an attack request
   */
  public static validateAttack(input: {
    attackerId: string;
    targetId: string;
    powerUpType: PowerUpType;
    sessionState: BattleSessionState;
    opponents: Player[];
    currentTime?: number;
    config?: BattleConfig;
  }): { valid: boolean; reason?: string; resolvedTargetId?: string } {
    const {
      attackerId,
      targetId,
      powerUpType,
      sessionState,
      opponents,
      currentTime = Date.now(),
      config = DEFAULT_BATTLE_CONFIG,
    } = input;

    // 1. Check if Focus Mode is ON
    if (sessionState.focusModeActive) {
      return { valid: false, reason: 'Giáo viên đã bật Chế độ Tập trung.' };
    }

    // 2. If it's a Learning / Self-Target Power-Up (e.g. MYSTERY_BOX, SHIELD, DOUBLE_POINTS, ORACLE_5050, etc.)
    if (!this.isBattlePowerUp(powerUpType)) {
      // Self-target learning items can always be executed by the student!
      return { valid: true, resolvedTargetId: attackerId };
    }

    // 3. For Offensive PvP Power-Ups (ATTACK, FREEZE, BOMB):
    if (!sessionState.battleEnabled || sessionState.battleMode === 'DISABLED') {
      return { valid: false, reason: 'Chế độ Trận đấu hiện đang tắt.' };
    }

    if (sessionState.currentPhase !== 'BATTLE') {
      return { valid: false, reason: 'Chỉ có thể tấn công trong Battle Time.' };
    }

    if (sessionState.battleEndTimestamp > 0 && currentTime > sessionState.battleEndTimestamp) {
      return { valid: false, reason: 'Thời gian Battle Time đã kết thúc.' };
    }

    if (sessionState.attackerLogThisRound[attackerId]) {
      return { valid: false, reason: 'Bạn đã sử dụng lượt tấn công trong vòng này rồi.' };
    }

    // Handle target selection (Random vs Manual)
    let finalTargetId = targetId;
    if (sessionState.studentTargetMode === 'RANDOM' || sessionState.battleMode === 'RANDOM_TARGET_ONLY') {
      const randomTarget = this.pickRandomTarget({ attackerId, opponents, sessionState, config });
      if (!randomTarget) {
        return { valid: false, reason: 'Không tìm thấy mục tiêu hợp lệ (đang được bảo vệ).' };
      }
      finalTargetId = randomTarget.id;
    } else {
      // Validate specified target
      const targetPlayer = opponents.find((p) => p.id === targetId);
      if (!targetPlayer) {
        return { valid: false, reason: 'Không tìm thấy đối thủ.' };
      }

      const validTargets = this.getValidTargets({ attackerId, opponents, sessionState, config });
      if (!validTargets.some((p) => p.id === targetId)) {
        return { valid: false, reason: 'Đối thủ đang ở trạng thái bảo vệ hoặc đã bị tấn công.' };
      }
    }

    return { valid: true, resolvedTargetId: finalTargetId };
  }

  /**
   * Apply attack state updates to BattleSessionState after execution
   */
  public static registerAttackResult(
    state: BattleSessionState,
    attackerId: string,
    targetId: string,
    config: BattleConfig = DEFAULT_BATTLE_CONFIG
  ): BattleSessionState {
    const currentRound = state.currentRoundId;

    const newAttackerLog = { ...state.attackerLogThisRound, [attackerId]: true };
    const currentReceived = state.receivedAttackCountThisRound[targetId] || 0;
    const newReceivedCount = { ...state.receivedAttackCountThisRound, [targetId]: currentReceived + 1 };

    // Apply protection to target if they reached max attacks received
    const newProtected = { ...state.protectedPlayers };
    if (newReceivedCount[targetId] >= config.maxAttacksReceivedPerRound) {
      newProtected[targetId] = currentRound + config.targetProtectionRounds;
    }

    const newLastTargetHistory = { ...state.lastTargetHistory, [attackerId]: targetId };

    return {
      ...state,
      attackerLogThisRound: newAttackerLog,
      receivedAttackCountThisRound: newReceivedCount,
      protectedPlayers: newProtected,
      lastTargetHistory: newLastTargetHistory,
    };
  }

  /**
   * Advance round (e.g. after questionsPerBattle or when teacher starts next round)
   */
  public static advanceRound(state: BattleSessionState, config: BattleConfig = DEFAULT_BATTLE_CONFIG): BattleSessionState {
    return {
      ...state,
      currentRoundId: state.currentRoundId + 1,
      currentPhase: 'QUIZ',
      questionsUntilBattle: config.questionsPerBattle,
      battleEndTimestamp: 0,
      attackerLogThisRound: {},
      receivedAttackCountThisRound: {},
    };
  }
}
