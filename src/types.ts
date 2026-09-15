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

export type PowerUpType = 
  | 'ATTACK' 
  | 'SHIELD' 
  | 'DOUBLE_POINTS' 
  | 'FREEZE' 
  | 'MYSTERY_BOX' 
  | 'BOMB' 
  | 'ORACLE_5050' 
  | 'ROCKET_BOOST' 
  | 'REFLECT_SHIELD';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface Question {
  id: string;
  type?: QuestionType; // 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  questionText: string;
  options: string[]; // For MULTIPLE_CHOICE (4 choices) or TRUE_FALSE (4 statements: a, b, c, d)
  correctIndex?: number; // For MULTIPLE_CHOICE (0, 1, 2, 3)
  tfAnswers?: boolean[]; // For TRUE_FALSE (4 booleans: e.g. [true, false, true, false])
  shortAnswerText?: string; // For SHORT_ANSWER (e.g. "3.5" or "12")
  timeLimit: number; // in seconds
  points: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  grade?: string;
  subject?: string;
  questions: Question[];
  createdAt?: number;
}

export type GamePhase = 'LOBBY' | 'QUESTION' | 'RESULT' | 'ATTACK' | 'LEADERBOARD' | 'FINISHED';

export interface Player {
  id: string;
  studentCode?: string;
  name: string;
  chibi: ChibiCustomization;
  score: number;
  streak: number;
  shieldActive: boolean;
  shieldCount: number;
  reflectShieldActive?: boolean;
  doublePointsActive?: boolean;
  oracle5050Active?: boolean;
  isFrozen?: boolean;
  isBombed?: boolean;
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
  tabSwitchCount?: number;
  isTabActive?: boolean;
  lastTabSwitchTime?: number;
  currentQuestionIndex?: number;
  totalAnswered?: number;
  correctCount?: number;
  shuffledQuestions?: Question[];
  isFinished?: boolean;
}

export interface TeacherAlertEvent {
  id: string;
  senderName: string;
  targetId: string; // 'ALL' or player id
  targetName?: string;
  message: string;
  alertType: 'WARNING' | 'SILENCE' | 'FOCUS' | 'CUSTOM' | 'PRAISE';
  timestamp: number;
}

export interface TeacherGiftEvent {
  id: string;
  senderName: string;
  targetId: string; // 'ALL' or player id
  targetName?: string;
  powerUpType: PowerUpType;
  giftTitle: string;
  timestamp: number;
}

export interface GameRoom {
  roomCode: string;
  hostId: string;
  quiz: Quiz;
  phase: GamePhase;
  currentQuestionIndex: number;
  questionStartTime: number;
  players: Record<string, Player>;
  attacks: AttackEvent[];
  latestTeacherAlert?: TeacherAlertEvent;
  latestTeacherGift?: TeacherGiftEvent;
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
