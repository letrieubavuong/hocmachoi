import { GameRoom, Player, Quiz, GamePhase, AttackEvent, PowerUpType } from '../types';
import Peer, { DataConnection } from 'peerjs';

const CHANNEL_NAME = 'chibi_quiz_realtime';
const STORAGE_KEY_PREFIX = 'chibi_quiz_room_';
const PEER_PREFIX = 'chibi-room-v4-';

export class RealtimeService {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(room: GameRoom) => void> = [];
  private currentRoomCode: string | null = null;

  // PeerJS Cross-Device Engine
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;

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

  // Host: Create a new room
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
    this.initHostPeer(roomCode);

    return room;
  }

  private initHostPeer(roomCode: string) {
    try {
      if (this.peer) this.peer.destroy();
      this.peer = new Peer(`${PEER_PREFIX}${roomCode}`);

      this.peer.on('connection', (conn) => {
        this.connections.set(conn.peer, conn);

        conn.on('data', (data: any) => {
          if (data?.type === 'JOIN_PLAYER') {
            const currentRoom = this.getRoom(roomCode);
            if (currentRoom) {
              const updatedRoom: GameRoom = {
                ...currentRoom,
                players: { ...currentRoom.players, [data.player.id]: data.player },
                updatedAt: Date.now(),
              };
              this.saveAndBroadcast(updatedRoom);
              this.broadcastToPeerClients(updatedRoom);
            }
          } else if (data?.type === 'SUBMIT_ANSWER') {
            this.updatePlayerStats(roomCode, data.playerId, data.scoreToAdd, data.isCorrect);
          } else if (data?.type === 'EXECUTE_ATTACK') {
            this.executePowerUp(roomCode, data.attackerId, data.targetId, data.powerUpType);
          }
        });

        conn.on('close', () => {
          this.connections.delete(conn.peer);
        });

        const currentRoom = this.getRoom(roomCode);
        if (currentRoom) {
          conn.send({ type: 'ROOM_UPDATE', room: currentRoom });
        }
      });
    } catch (e) {
      console.warn('PeerJS init error:', e);
    }
  }

  // Student: Join Room
  public joinRoom(roomCode: string, player: Player): GameRoom | null {
    this.currentRoomCode = roomCode;
    let room = this.getRoom(roomCode);

    try {
      if (this.peer) this.peer.destroy();
      this.peer = new Peer();

      this.peer.on('open', () => {
        const hostPeerId = `${PEER_PREFIX}${roomCode}`;
        const conn = this.peer!.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on('open', () => {
          conn.send({ type: 'JOIN_PLAYER', player });
        });

        conn.on('data', (data: any) => {
          if (data?.type === 'ROOM_UPDATE' && data.room) {
            this.saveLocalOnly(data.room);
            this.notifyListeners(data.room);
          }
        });
      });
    } catch (e) {
      console.warn('Student PeerJS connect error:', e);
    }

    if (room) {
      const updatedPlayers = { ...room.players, [player.id]: player };
      room = { ...room, players: updatedPlayers, updatedAt: Date.now() };
      this.saveAndBroadcast(room);
      return room;
    }

    const placeholderRoom: GameRoom = {
      roomCode,
      hostId: 'remote-host',
      quiz: {
        id: 'remote-quiz',
        title: 'Đang Kết Nối Phòng Giáo Viên...',
        subject: 'Quiz Game',
        description: 'Đang đồng bộ dữ liệu thời gian thực...',
        questions: [],
      },
      phase: 'LOBBY',
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
      players: { [player.id]: player },
      attacks: [],
      updatedAt: Date.now(),
    };

    this.saveLocalOnly(placeholderRoom);
    return placeholderRoom;
  }

  // Host: Update Game Phase
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
    this.broadcastToPeerClients(updatedRoom);
    return updatedRoom;
  }

  // Update Player Stats with 10 Epic Power-Ups!
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

    let newShieldActive = player.shieldActive;
    let newShieldCount = player.shieldCount;
    let unlockedPowerUp: PowerUpType | null = player.unlockedPowerUp || null;

    // Rich Power-up rewards algorithm
    if (newStreak === 2) {
      const tier1Options: PowerUpType[] = ['SHIELD', 'DOUBLE_POINTS', 'ORACLE_5050', 'REFLECT_SHIELD'];
      unlockedPowerUp = tier1Options[Math.floor(Math.random() * tier1Options.length)];
      if (unlockedPowerUp === 'SHIELD' && !newShieldActive) {
        newShieldActive = true;
        newShieldCount += 1;
      }
    } else if (newStreak >= 3) {
      const tier2Options: PowerUpType[] = [
        'ATTACK',
        'FREEZE',
        'MYSTERY_BOX',
        'SWAP_SCORE',
        'BOMB',
        'ROCKET_BOOST',
        'REFLECT_SHIELD',
      ];
      unlockedPowerUp = tier2Options[Math.floor(Math.random() * tier2Options.length)];
    }

    // Apply double points multiplier if active
    let finalDeltaScore = deltaScore;
    let doublePointsActive = player.doublePointsActive;
    if (player.doublePointsActive && isCorrect) {
      finalDeltaScore = deltaScore * 2;
      doublePointsActive = false;
    }

    const updatedPlayer: Player = {
      ...player,
      score: Math.max(0, player.score + finalDeltaScore),
      streak: newStreak,
      shieldActive: newShieldActive,
      shieldCount: newShieldCount,
      doublePointsActive,
      unlockedPowerUp,
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
    this.broadcastToPeerClients(updatedRoom);

    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'SUBMIT_ANSWER',
        playerId,
        scoreToAdd: deltaScore,
        isCorrect,
      });
    }

    return updatedRoom;
  }

  // Execute Power-Up Action (Supports 10 Epic Power-Ups!)
  public executePowerUp(
    roomCode: string,
    attackerId: string,
    targetId: string,
    powerUpType: PowerUpType = 'ATTACK'
  ): { success: boolean; blocked: boolean; stolenPoints: number; mysteryBonus?: number } | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[attackerId]) return null;

    const attacker = room.players[attackerId];
    const target = room.players[targetId] || attacker;

    let blocked = false;
    let stolenPoints = 0;
    let mysteryBonus = 0;

    let updatedAttacker = { ...attacker, unlockedPowerUp: null };
    let updatedTarget = { ...target };

    // Check Shield / Reflect Shield on Target
    if (target.id !== attacker.id && (target.reflectShieldActive || target.shieldActive)) {
      if (target.reflectShieldActive && powerUpType === 'ATTACK') {
        // REFLECT SHIELD: Damage bounces back onto Attacker!
        blocked = true;
        stolenPoints = Math.max(30, Math.round(attacker.score * 0.2));
        updatedAttacker.score = Math.max(0, attacker.score - stolenPoints);
        updatedTarget.score += stolenPoints;
        updatedTarget.reflectShieldActive = false;
      } else if (target.shieldActive) {
        // STANDARD SHIELD: Blocks attack completely
        blocked = true;
        updatedTarget.shieldActive = false;
        updatedTarget.shieldCount = Math.max(0, target.shieldCount - 1);
      }
    }

    if (!blocked) {
      if (powerUpType === 'ATTACK') {
        stolenPoints = Math.max(30, Math.round(target.score * 0.2));
        updatedTarget.score = Math.max(0, target.score - stolenPoints);
        updatedAttacker.score += stolenPoints;
      } else if (powerUpType === 'SWAP_SCORE') {
        // SWAP SCORE: Directly swap total scores!
        const tempScore = updatedAttacker.score;
        updatedAttacker.score = updatedTarget.score;
        updatedTarget.score = tempScore;
      } else if (powerUpType === 'FREEZE') {
        updatedTarget.isFrozen = true;
      } else if (powerUpType === 'BOMB') {
        updatedTarget.isBombed = true;
      } else if (powerUpType === 'DOUBLE_POINTS') {
        updatedAttacker.doublePointsActive = true;
      } else if (powerUpType === 'MYSTERY_BOX') {
        mysteryBonus = Math.floor(200 + Math.random() * 350); // +200 to +550
        updatedAttacker.score += mysteryBonus;
      } else if (powerUpType === 'ROCKET_BOOST') {
        mysteryBonus = 300;
        updatedAttacker.score += 300;
      } else if (powerUpType === 'ORACLE_5050') {
        updatedAttacker.oracle5050Active = true;
      } else if (powerUpType === 'REFLECT_SHIELD') {
        updatedAttacker.reflectShieldActive = true;
      }
    }

    const attackEvent: AttackEvent = {
      id: Math.random().toString(36).substr(2, 9),
      attackerId,
      attackerName: attacker.name,
      targetId: target.id,
      targetName: target.name,
      blocked,
      stolenPoints,
      powerUpType,
      timestamp: Date.now(),
    };

    const updatedRoom: GameRoom = {
      ...room,
      players: {
        ...room.players,
        [attackerId]: updatedAttacker,
        ...(target.id !== attackerId ? { [target.id]: updatedTarget } : {}),
      },
      attacks: [attackEvent, ...room.attacks.slice(0, 15)],
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    this.broadcastToPeerClients(updatedRoom);

    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'EXECUTE_ATTACK',
        attackerId,
        targetId,
        powerUpType,
      });
    }

    return { success: true, blocked, stolenPoints, mysteryBonus };
  }

  private broadcastToPeerClients(room: GameRoom) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({ type: 'ROOM_UPDATE', room });
      }
    });
  }

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

  public subscribe(roomCode: string, callback: (room: GameRoom) => void): () => void {
    this.currentRoomCode = roomCode;
    this.listeners.push(callback);

    const initial = this.getRoom(roomCode);
    if (initial) {
      callback(initial);
    }

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private saveLocalOnly(room: GameRoom) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${room.roomCode}`, JSON.stringify(room));
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
