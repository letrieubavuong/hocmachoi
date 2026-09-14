import { GameRoom, Player, Quiz, GamePhase, AttackEvent } from '../types';
import Peer, { DataConnection } from 'peerjs';

const CHANNEL_NAME = 'chibi_quiz_realtime';
const STORAGE_KEY_PREFIX = 'chibi_quiz_room_';
const PEER_PREFIX = 'chibi-room-v1-';

export class RealtimeService {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(room: GameRoom) => void> = [];
  private currentRoomCode: string | null = null;

  // PeerJS Cross-Device WebRTC Engine
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

  // Host: Create a new room with PeerJS listener for phones
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

  // Initialize Host PeerJS listener to receive phone connections
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
              const updatedRoom = {
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
            this.executeAttack(roomCode, data.attackerId, data.targetId);
          }
        });

        conn.on('close', () => {
          this.connections.delete(conn.peer);
        });

        // Send current room state immediately upon phone connect
        const room = this.getRoom(roomCode);
        if (room) {
          conn.send({ type: 'ROOM_UPDATE', room });
        }
      });
    } catch (e) {
      console.warn('PeerJS init failed, falling back to local channel:', e);
    }
  }

  // Student: Join Room (Handles Phone to PC Cross-Device Sync & Late-Join!)
  public joinRoom(roomCode: string, player: Player): GameRoom | null {
    this.currentRoomCode = roomCode;

    // Check local storage first (same device / multi-tab)
    let room = this.getRoom(roomCode);

    // Initialize Student PeerJS to connect to Host PC
    try {
      if (this.peer) this.peer.destroy();
      this.peer = new Peer();

      this.peer.on('open', () => {
        const hostPeerId = `${PEER_PREFIX}${roomCode}`;
        const conn = this.peer!.connect(hostPeerId);
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
      console.warn('Student PeerJS connect fallback:', e);
    }

    // Fallback/Local update
    if (!room) {
      // Create temporary fallback state while peer syncing
      room = {
        roomCode,
        hostId: 'remote-host',
        quiz: {
          id: 'remote-quiz',
          title: 'Đang Tải Đề Thi Từ Giáo Viên...',
          subject: 'KHTN / Toán',
          description: 'Vui lòng chờ giây lát...',
          questions: [],
        },
        phase: 'LOBBY',
        currentQuestionIndex: 0,
        questionStartTime: Date.now(),
        players: { [player.id]: player },
        attacks: [],
        updatedAt: Date.now(),
      };
    } else {
      const updatedPlayers = { ...room.players, [player.id]: player };
      room = { ...room, players: updatedPlayers, updatedAt: Date.now() };
    }

    this.saveAndBroadcast(room);
    return room;
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
    this.broadcastToPeerClients(updatedRoom);
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

    let newShieldActive = player.shieldActive;
    let newShieldCount = player.shieldCount;
    if (newStreak >= 2 && !player.shieldActive) {
      newShieldActive = true;
      newShieldCount += 1;
    }

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
    this.broadcastToPeerClients(updatedRoom);

    // If client student connected to remote host, send action
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
    this.broadcastToPeerClients(updatedRoom);

    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'EXECUTE_ATTACK',
        attackerId,
        targetId,
      });
    }

    return { success: true, blocked, stolenPoints };
  }

  // Broadcast state to all connected PeerJS clients (Mobile Phones)
  private broadcastToPeerClients(room: GameRoom) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({ type: 'ROOM_UPDATE', room });
      }
    });
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
