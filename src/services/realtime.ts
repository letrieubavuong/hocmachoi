import { GameRoom, Player, Quiz, GamePhase, AttackEvent } from '../types';
import Peer, { DataConnection } from 'peerjs';

const CHANNEL_NAME = 'chibi_quiz_realtime';
const STORAGE_KEY_PREFIX = 'chibi_quiz_room_';
const PEER_PREFIX = 'chibi-room-v2-';

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

  // Host: Create a new room with PeerJS listener for remote phones
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
      
      // Clean peer ID for host
      const peerId = `${PEER_PREFIX}${roomCode}`;
      this.peer = new Peer(peerId, {
        debug: 1,
      });

      this.peer.on('open', (id) => {
        console.log('Host PeerJS initialized successfully:', id);
      });

      this.peer.on('connection', (conn) => {
        console.log('New student connected via PeerJS:', conn.peer);
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
            this.executeAttack(roomCode, data.attackerId, data.targetId);
          }
        });

        conn.on('close', () => {
          this.connections.delete(conn.peer);
        });

        // Send current room state immediately upon student connect
        const currentRoom = this.getRoom(roomCode);
        if (currentRoom) {
          conn.send({ type: 'ROOM_UPDATE', room: currentRoom });
        }
      });

      this.peer.on('error', (err) => {
        console.warn('Host PeerJS warning:', err);
      });
    } catch (e) {
      console.warn('PeerJS init failed:', e);
    }
  }

  // Student: Join Room (Handles Remote Phone to PC Sync & Late-Join!)
  public joinRoom(roomCode: string, player: Player): GameRoom | null {
    this.currentRoomCode = roomCode;

    // Check local storage first (for same device / multi-tab test)
    let room = this.getRoom(roomCode);

    // Initialize Student PeerJS to connect to Host PC
    try {
      if (this.peer) this.peer.destroy();
      this.peer = new Peer({ debug: 1 });

      this.peer.on('open', () => {
        const hostPeerId = `${PEER_PREFIX}${roomCode}`;
        console.log('Student attempting WebRTC connection to Host:', hostPeerId);
        const conn = this.peer!.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on('open', () => {
          console.log('WebRTC connection established with Host PC!');
          conn.send({ type: 'JOIN_PLAYER', player });
        });

        conn.on('data', (data: any) => {
          if (data?.type === 'ROOM_UPDATE' && data.room) {
            console.log('Received room state update from Host PC');
            this.saveLocalOnly(data.room);
            this.notifyListeners(data.room);
          }
        });

        conn.on('error', (err) => {
          console.warn('Connection to host error:', err);
        });
      });
    } catch (e) {
      console.warn('Student PeerJS connect error:', e);
    }

    // If local room exists (same tab/browser)
    if (room) {
      const updatedPlayers = { ...room.players, [player.id]: player };
      room = { ...room, players: updatedPlayers, updatedAt: Date.now() };
      this.saveAndBroadcast(room);
      return room;
    }

    // Initial placeholder room while PeerJS syncs state from Host PC
    const initialPlaceholderRoom: GameRoom = {
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

    this.saveLocalOnly(initialPlaceholderRoom);
    return initialPlaceholderRoom;
  }

  // Host: Update Game Phase (e.g. Start Game -> 'QUESTION', Next -> 'RESULT', etc.)
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
