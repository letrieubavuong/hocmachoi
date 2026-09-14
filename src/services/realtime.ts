import { GameRoom, Player, Quiz, GamePhase, AttackEvent } from '../types';

const CHANNEL_NAME = 'chibi_quiz_realtime';
const STORAGE_KEY_PREFIX = 'chibi_quiz_room_';

export class RealtimeService {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(room: GameRoom) => void> = [];
  private currentRoomCode: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (event.data && event.data.roomCode === this.currentRoomCode) {
          this.notifyListeners(event.data);
        }
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith(STORAGE_KEY_PREFIX)) {
          const roomCode = event.key.replace(STORAGE_KEY_PREFIX, '');
          if (roomCode === this.currentRoomCode && event.newValue) {
            try {
              const room = JSON.parse(event.newValue) as GameRoom;
              this.notifyListeners(room);
            } catch (e) {
              console.error('Failed to parse room state from storage', e);
            }
          }
        }
      });
    }
  }

  // Create a new room as Host
  public createRoom(quiz: Quiz, hostId: string): GameRoom {
    const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const room: GameRoom = {
      roomCode,
      hostId,
      quiz,
      phase: 'LOBBY',
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
      players: {},
      attacks: [],
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(room);
    this.currentRoomCode = roomCode;
    return room;
  }

  // Join a room as Player (Includes Late-Join support!)
  public joinRoom(roomCode: string, player: Player): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    // Check if player already exists
    const updatedPlayers = { ...room.players, [player.id]: player };
    const updatedRoom: GameRoom = {
      ...room,
      players: updatedPlayers,
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    this.currentRoomCode = roomCode;
    return updatedRoom;
  }

  // Update Game Phase (e.g. Start Game -> 'QUESTION', Next -> 'RESULT', etc.)
  public updatePhase(roomCode: string, phase: GamePhase, questionIndex?: number): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const nextIndex = questionIndex !== undefined ? questionIndex : room.currentQuestionIndex;
    const updatedRoom: GameRoom = {
      ...room,
      phase,
      currentQuestionIndex: nextIndex,
      questionStartTime: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    return updatedRoom;
  }

  // Update Player Stats (Score, Streak, Shield)
  public updatePlayerStats(
    roomCode: string,
    playerId: string,
    deltaScore: number,
    isCorrect: boolean
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    const newStreak = isCorrect ? player.streak + 1 : 0;
    
    // Auto-gain shield on 2 streak
    let newShieldActive = player.shieldActive;
    let newShieldCount = player.shieldCount;
    if (newStreak >= 2 && !player.shieldActive) {
      newShieldActive = true;
      newShieldCount += 1;
    }

    // Gain attack card on 3 streak
    const newAttackReady = newStreak >= 3;

    const updatedPlayer: Player = {
      ...player,
      score: Math.max(0, player.score + deltaScore),
      streak: newStreak,
      shieldActive: newShieldActive,
      shieldCount: newShieldCount,
      attackCardReady: newAttackReady,
    };

    const updatedRoom: GameRoom = {
      ...room,
      players: {
        ...room.players,
        [playerId]: updatedPlayer,
      },
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    return updatedRoom;
  }

  // Perform Player Attack Mechanics!
  public executeAttack(
    roomCode: string,
    attackerId: string,
    targetId: string
  ): { success: boolean; blocked: boolean; stolenPoints: number } | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[attackerId] || !room.players[targetId]) return null;

    const attacker = room.players[attackerId];
    const target = room.players[targetId];

    let blocked = false;
    let stolenPoints = 0;

    const updatedTarget = { ...target };
    const updatedAttacker = { ...attacker, attackCardReady: false };

    if (target.shieldActive) {
      // SHIELD BLOCKS THE ATTACK!
      blocked = true;
      updatedTarget.shieldActive = false;
      updatedTarget.shieldCount = Math.max(0, target.shieldCount - 1);
      updatedTarget.lastAttackNotice = {
        attackerName: attacker.name,
        blocked: true,
        stolenPoints: 0,
        timestamp: Date.now(),
      };
    } else {
      // ATTACK SUCCEEDS: Steal 20% of target points (min 30 pts)
      blocked = false;
      stolenPoints = Math.max(30, Math.round(target.score * 0.2));
      updatedTarget.score = Math.max(0, target.score - stolenPoints);
      updatedAttacker.score += stolenPoints;

      updatedTarget.lastAttackNotice = {
        attackerName: attacker.name,
        blocked: false,
        stolenPoints,
        timestamp: Date.now(),
      };
    }

    const attackEvent: AttackEvent = {
      id: Math.random().toString(36).substr(2, 9),
      attackerId,
      attackerName: attacker.name,
      targetId,
      targetName: target.name,
      blocked,
      stolenPoints,
      timestamp: Date.now(),
    };

    const updatedRoom: GameRoom = {
      ...room,
      players: {
        ...room.players,
        [attackerId]: updatedAttacker,
        [targetId]: updatedTarget,
      },
      attacks: [attackEvent, ...room.attacks.slice(0, 15)],
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    return { success: true, blocked, stolenPoints };
  }

  // Get current room state
  public getRoom(roomCode: string): GameRoom | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${roomCode}`);
    if (!data) return null;
    try {
      return JSON.parse(data) as GameRoom;
    } catch {
      return null;
    }
  }

  // Subscribe to real-time updates for active room
  public subscribe(roomCode: string, callback: (room: GameRoom) => void): () => void {
    this.currentRoomCode = roomCode;
    this.listeners.push(callback);

    // Initial state push
    const initial = this.getRoom(roomCode);
    if (initial) {
      callback(initial);
    }

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private saveAndBroadcast(room: GameRoom) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${room.roomCode}`, JSON.stringify(room));
    if (this.channel) {
      this.channel.postMessage(room);
    }
    this.notifyListeners(room);
  }

  private notifyListeners(room: GameRoom) {
    this.listeners.forEach((cb) => cb(room));
  }
}

export const realtime = new RealtimeService();
