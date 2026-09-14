export interface ChibiCustomization {
  skinColor: string;
  hairStyle: 'short' | 'spiky' | 'pigtails' | 'curly' | 'long' | 'afro' | 'bald';
  hairColor: string;
  eyeType: 'happy' | 'star' | 'wink' | 'cool' | 'cute';
  outfitStyle: 'casual' | 'superhero' | 'hoodie' | 'uniform' | 'wizard';
  outfitColor: string;
  hatStyle: 'none' | 'crown' | 'cap' | 'catEars' | 'wizardHat' | 'halo';
  accessory: 'none' | 'glasses' | 'sunglasses' | 'mask' | 'headphone';
}

export type PowerUpType = 'ATTACK' | 'SHIELD' | 'DOUBLE_POINTS' | 'FREEZE' | 'MYSTERY_BOX';

export interface Player {
  id: string;
  name: string;
  chibi: ChibiCustomization;
  score: number;
  streak: number;
  shieldActive: boolean;
  shieldCount: number;
  doublePointsActive?: boolean;
  isFrozen?: boolean;
  frozenUntil?: number;
  unlockedPowerUp?: PowerUpType | null;
  lastAttackNotice?: {
    attackerName: string;
    blocked: boolean;
    stolenPoints: number;
    powerUpType?: PowerUpType;
    timestamp: number;
  };
  isReady: boolean;
  joinedAt: number;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  timeLimit: number; // in seconds
  points: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  questions: Question[];
}

export type GamePhase = 'LOBBY' | 'QUESTION' | 'RESULT' | 'ATTACK' | 'LEADERBOARD' | 'FINISHED';

export interface GameRoom {
  roomCode: string;
  hostId: string;
  quiz: Quiz;
  phase: GamePhase;
  currentQuestionIndex: number;
  questionStartTime: number;
  players: Record<string, Player>;
  attacks: AttackEvent[];
  updatedAt: number;
}

export interface AttackEvent {
  id: string;
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  blocked: boolean;
  stolenPoints: number;
  powerUpType?: PowerUpType;
  timestamp: number;
}
