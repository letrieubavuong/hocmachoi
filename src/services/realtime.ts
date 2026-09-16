import { GameRoom, Player, Quiz, Question, GamePhase, AttackEvent, PowerUpType, TeacherAlertEvent, TeacherGiftEvent, StudentInquiryEvent, BattleSessionState } from '../types';
import { PowerUpEngine } from './powerUpEngine';
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
              const incomingPlayer: Player = data.player;
              const existingPlayer = Object.values(currentRoom.players).find(
                (p) =>
                  p.id === incomingPlayer.id ||
                  (p.name.trim().toLowerCase() === incomingPlayer.name.trim().toLowerCase() && p.name.trim() !== '') ||
                  (p.studentCode && incomingPlayer.studentCode && p.studentCode === incomingPlayer.studentCode)
              );

              let finalPlayer: Player;
              if (existingPlayer) {
                // Restore existing player progress without resetting score or question index
                finalPlayer = {
                  ...existingPlayer,
                  isTabActive: true,
                  chibi: incomingPlayer.chibi || existingPlayer.chibi,
                };
              } else {
                finalPlayer = {
                  ...incomingPlayer,
                  isTabActive: true,
                };
              }

              const updatedRoom: GameRoom = {
                ...currentRoom,
                players: { ...currentRoom.players, [finalPlayer.id]: finalPlayer },
                updatedAt: Date.now(),
              };
              this.saveAndBroadcast(updatedRoom);
              this.broadcastToPeerClients(updatedRoom);
            }
          } else if (data?.type === 'SUBMIT_ANSWER') {
            this.updatePlayerStats(roomCode, data.playerId, data.scoreToAdd, data.isCorrect);
          } else if (data?.type === 'INIT_QUESTIONS') {
            this.initializePlayerQuestions(roomCode, data.playerId, data.shuffledQuestions);
          } else if (data?.type === 'ADVANCE_QUESTION') {
            this.advancePlayerQuestion(roomCode, data.playerId);
          } else if (data?.type === 'EXECUTE_ATTACK') {
            this.executePowerUp(roomCode, data.attackerId, data.targetId, data.powerUpType);
          } else if (data?.type === 'TAB_STATUS_UPDATE') {
            this.updatePlayerTabStatus(roomCode, data.playerId, data.isTabActive, data.tabSwitchCount);
          } else if (data?.type === 'REMOVE_PLAYER') {
            this.removePlayer(roomCode, data.playerId);
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
      const existingPlayer = Object.values(room.players).find(
        (p) =>
          p.id === player.id ||
          (p.name.trim().toLowerCase() === player.name.trim().toLowerCase() && p.name.trim() !== '') ||
          (p.studentCode && player.studentCode && p.studentCode === player.studentCode)
      );

      let playerToUse: Player;
      if (existingPlayer) {
        playerToUse = {
          ...existingPlayer,
          isTabActive: true,
          chibi: player.chibi || existingPlayer.chibi,
        };
      } else {
        playerToUse = player;
      }

      const updatedPlayers = { ...room.players, [playerToUse.id]: playerToUse };
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

  // Initialize randomized per-student questions
  public initializePlayerQuestions(
    roomCode: string,
    playerId: string,
    shuffledQuestions: Question[]
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    if (player.shuffledQuestions && player.shuffledQuestions.length > 0) {
      return room;
    }

    const updatedPlayer: Player = {
      ...player,
      shuffledQuestions,
      currentQuestionIndex: 0,
      totalAnswered: 0,
      correctCount: 0,
      isFinished: false,
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
        type: 'INIT_QUESTIONS',
        playerId,
        shuffledQuestions,
      });
    }

    return updatedRoom;
  }

  // Update Player Stats with PowerUp Engine Evaluation
  public updatePlayerStats(
    roomCode: string,
    playerId: string,
    deltaScore: number,
    isCorrect: boolean,
    timeSpentSec: number = 10
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    const isHomework = room.quiz?.mode === 'HOMEWORK';

    // 1. Evaluate score, streak, bomb, rocket, streak-guard using PowerUpEngine
    const { finalDeltaScore, newStreak } = PowerUpEngine.evaluateAnswerModifiers({
      player,
      baseDeltaScore: deltaScore,
      isCorrect,
      timeSpentSec,
    });

    let newShieldActive = player.shieldActive;
    let newShieldCount = player.shieldCount;
    let unlockedPowerUp: PowerUpType | null = null;

    // 2. Award new power-up reward if streak milestone reached (Streak >= 2)
    if (newStreak >= 2) {
      const playerList = Object.values(room.players).sort((a, b) => b.score - a.score);
      const rankIndex = playerList.findIndex((p) => p.id === playerId);
      const playerRank = rankIndex !== -1 ? rankIndex + 1 : playerList.length;

      unlockedPowerUp = PowerUpEngine.getRandomRewardForPlayer(
        newStreak,
        playerRank,
        playerList.length,
        isHomework
      );

      if (unlockedPowerUp === 'SHIELD') {
        newShieldActive = true;
        newShieldCount += 1;
      }
    }

    // 3. Reset consumed single-use buffs
    const updatedPlayer: Player = {
      ...player,
      score: Math.max(0, player.score + finalDeltaScore),
      streak: newStreak,
      shieldActive: newShieldActive,
      shieldCount: newShieldCount,
      doublePointsActive: false,
      oracle5050Active: false,
      rocketBoostActive: false,
      streakGuardActive: false,
      isFrozen: false,
      freezeUntil: undefined,
      isBombed: false,
      unlockedPowerUp,
      totalAnswered: (player.totalAnswered || 0) + 1,
      correctCount: (player.correctCount || 0) + (isCorrect ? 1 : 0),
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

  // Advance per-student question index independently
  public advancePlayerQuestion(roomCode: string, playerId: string): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    const totalQ = player.shuffledQuestions?.length || room.quiz.questions.length;
    const currentQIdx = player.currentQuestionIndex || 0;
    const nextQIdx = currentQIdx + 1;
    const isFinished = nextQIdx >= totalQ;

    const updatedPlayer: Player = {
      ...player,
      currentQuestionIndex: nextQIdx,
      isFinished,
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
        type: 'ADVANCE_QUESTION',
        playerId,
      });
    }

    return updatedRoom;
  }

  // Update Player Tab / Window Visibility Status (Anti-Cheat Monitoring)
  public updatePlayerTabStatus(
    roomCode: string,
    playerId: string,
    isTabActive: boolean,
    tabSwitchCount: number
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    const updatedPlayer: Player = {
      ...player,
      isTabActive,
      tabSwitchCount,
      lastTabSwitchTime: !isTabActive ? Date.now() : player.lastTabSwitchTime,
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
        type: 'TAB_STATUS_UPDATE',
        playerId,
        isTabActive,
        tabSwitchCount,
      });
    }

    return updatedRoom;
  }

  // Teacher: Send Warning / Announcement Alert to Student Screen(s)
  public sendTeacherAlert(
    roomCode: string,
    targetId: string,
    message: string,
    alertType: 'WARNING' | 'SILENCE' | 'FOCUS' | 'CUSTOM' | 'PRAISE' = 'WARNING'
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const targetPlayer = targetId !== 'ALL' ? room.players[targetId] : undefined;

    const alertEvent: TeacherAlertEvent = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderName: 'Giáo Viên',
      targetId,
      targetName: targetPlayer ? targetPlayer.name : 'Tất cả học sinh',
      message,
      alertType,
      timestamp: Date.now(),
    };

    const updatedRoom: GameRoom = {
      ...room,
      latestTeacherAlert: alertEvent,
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    this.broadcastToPeerClients(updatedRoom);

    return updatedRoom;
  }

  // Teacher: Grant Reward / Power-Up to a Specific Student or All Students
  public grantTeacherReward(
    roomCode: string,
    targetId: string, // 'ALL' or player id
    powerUpType: PowerUpType,
    giftTitle: string
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const targetPlayer = targetId !== 'ALL' ? room.players[targetId] : undefined;
    const giftEvent: TeacherGiftEvent = {
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Giáo Viên',
      targetId,
      targetName: targetPlayer ? targetPlayer.name : 'Tất cả học sinh',
      powerUpType,
      giftTitle,
      timestamp: Date.now(),
    };

    const updatedPlayers = { ...room.players };

    const applyGiftToPlayer = (p: Player): Player => {
      let score = p.score;
      let shieldActive = p.shieldActive;
      let shieldCount = p.shieldCount;
      let doublePointsActive = p.doublePointsActive;
      let oracle5050Active = p.oracle5050Active;
      let reflectShieldActive = p.reflectShieldActive;
      let rocketBoostActive = p.rocketBoostActive;
      let streakGuardActive = p.streakGuardActive;

      if (powerUpType === 'MYSTERY_BOX') {
        score += 300;
      } else if (powerUpType === 'SHIELD') {
        shieldActive = true;
        shieldCount += 1;
      } else if (powerUpType === 'DOUBLE_POINTS') {
        doublePointsActive = true;
      } else if (powerUpType === 'ORACLE_5050') {
        oracle5050Active = true;
      } else if (powerUpType === 'REFLECT_SHIELD') {
        reflectShieldActive = true;
      } else if (powerUpType === 'ROCKET_BOOST') {
        rocketBoostActive = true;
      } else if (powerUpType === 'STREAK_GUARD') {
        streakGuardActive = true;
      }

      return {
        ...p,
        score,
        shieldActive,
        shieldCount,
        doublePointsActive,
        oracle5050Active,
        reflectShieldActive,
        rocketBoostActive,
        streakGuardActive,
        unlockedPowerUp: powerUpType,
      };
    };

    if (targetId === 'ALL') {
      Object.keys(updatedPlayers).forEach((pId) => {
        updatedPlayers[pId] = applyGiftToPlayer(updatedPlayers[pId]);
      });
    } else if (updatedPlayers[targetId]) {
      updatedPlayers[targetId] = applyGiftToPlayer(updatedPlayers[targetId]);
    }

    const updatedRoom: GameRoom = {
      ...room,
      players: updatedPlayers,
      latestTeacherGift: giftEvent,
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    this.broadcastToPeerClients(updatedRoom);
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

    // Check Shield / Reflect Shield on Target for Offensive Attacks
    if (target.id !== attacker.id && (target.reflectShieldActive || target.shieldActive)) {
      if (target.reflectShieldActive && PowerUpEngine.isOffensivePowerUp(powerUpType)) {
        // REFLECT SHIELD: Bounces offensive attack back to Attacker!
        blocked = true;
        updatedTarget.reflectShieldActive = false;

        if (powerUpType === 'ATTACK') {
          stolenPoints = Math.max(30, Math.round(attacker.score * 0.2));
          updatedAttacker.score = Math.max(0, attacker.score - stolenPoints);
          updatedTarget.score += stolenPoints;
        } else if (powerUpType === 'FREEZE') {
          updatedAttacker.isFrozen = true;
          updatedAttacker.freezeUntil = Date.now() + 10000;
        } else if (powerUpType === 'BOMB') {
          updatedAttacker.isBombed = true;
        }
      } else if (target.shieldActive && PowerUpEngine.isOffensivePowerUp(powerUpType)) {
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
      } else if (powerUpType === 'FREEZE') {
        updatedTarget.isFrozen = true;
        updatedTarget.freezeUntil = Date.now() + 10000;
      } else if (powerUpType === 'BOMB') {
        updatedTarget.isBombed = true;
      } else if (powerUpType === 'SHIELD') {
        updatedAttacker.shieldActive = true;
        updatedAttacker.shieldCount = (attacker.shieldCount || 0) + 1;
      } else if (powerUpType === 'DOUBLE_POINTS') {
        updatedAttacker.doublePointsActive = true;
      } else if (powerUpType === 'MYSTERY_BOX') {
        mysteryBonus = Math.floor(10 + Math.random() * 41) * 10; // +100 to +500 random points
        updatedAttacker.score += mysteryBonus;
      } else if (powerUpType === 'ROCKET_BOOST') {
        updatedAttacker.rocketBoostActive = true;
      } else if (powerUpType === 'STREAK_GUARD') {
        updatedAttacker.streakGuardActive = true;
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

    const updatedPlayers = {
      ...room.players,
      [attackerId]: updatedAttacker,
      ...(targetId !== attackerId ? { [targetId]: updatedTarget } : {}),
    };

    const updatedRoom: GameRoom = {
      ...room,
      players: updatedPlayers,
      attacks: [attackEvent, ...room.attacks],
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    this.broadcastToPeerClients(updatedRoom);

    return {
      success: true,
      blocked,
      stolenPoints,
      mysteryBonus,
    };
  }

  // Teacher / Engine: Update Battle Session State & Broadcast
  public updateBattleSessionState(
    roomCode: string,
    stateUpdater: BattleSessionState | ((prev?: BattleSessionState) => BattleSessionState)
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const nextState =
      typeof stateUpdater === 'function' ? stateUpdater(room.battleSessionState) : stateUpdater;

    const updatedRoom: GameRoom = {
      ...room,
      battleSessionState: nextState,
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    this.broadcastToPeerClients(updatedRoom);
    return updatedRoom;
  }

  // Teacher: Remove / Kick player from room
  public removePlayer(roomCode: string, playerId: string): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const { [playerId]: removed, ...remainingPlayers } = room.players;

    const updatedRoom: GameRoom = {
      ...room,
      players: remainingPlayers,
      updatedAt: Date.now(),
    };

    this.saveAndBroadcast(updatedRoom);
    this.broadcastToPeerClients(updatedRoom);

    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'REMOVE_PLAYER',
        playerId,
      });
    }

    return updatedRoom;
  }

  // Freeze player (e.g. for rapid guessing / anti-spam violation or freeze power-up)
  public freezePlayer(
    roomCode: string,
    playerId: string,
    durationSec: number = 10,
    reason?: string
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    const updatedPlayer: Player = {
      ...player,
      isFrozen: true,
      freezeReason: reason || '⚠️ CẢNH BÁO LÔ TÔ ĐÁP ÁN: Bạn chọn quá nhanh (dưới 2s)! Đóng băng 10s.',
      rapidGuessCount: (player.rapidGuessCount || 0) + 1,
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
        type: 'FREEZE_PLAYER',
        playerId,
        durationSec,
        reason,
      });
    }

    return updatedRoom;
  }

  // Host: Reconnect Host Peer after F5 page refresh
  public reconnectHost(roomCode: string): GameRoom | null {
    this.currentRoomCode = roomCode;
    this.initHostPeer(roomCode);
    return this.getRoom(roomCode);
  }

  // Student: Reconnect Student Peer after F5 page refresh
  public reconnectStudent(roomCode: string, player: Player): GameRoom | null {
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
      console.warn('Student reconnect PeerJS error:', e);
    }
    return room;
  }

  // Unfreeze player after freeze duration expires
  public unfreezePlayer(roomCode: string, playerId: string): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    if (!player.isFrozen) return room;

    const updatedPlayer: Player = {
      ...player,
      isFrozen: false,
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
    return updatedRoom;
  }

  // Student: Submit Question Inquiry to Teacher
  public submitStudentInquiry(
    roomCode: string,
    playerId: string,
    questionNumber: number,
    question: Question,
    note?: string
  ): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    const inquiryEvent: StudentInquiryEvent = {
      id: Math.random().toString(36).substring(2, 9),
      playerId,
      studentName: player.name,
      studentCode: player.studentCode,
      questionNumber,
      question,
      note,
      timestamp: Date.now(),
      resolved: false,
    };

    const updatedPlayer: Player = {
      ...player,
      pendingInquiry: inquiryEvent,
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
        type: 'SUBMIT_INQUIRY',
        inquiry: inquiryEvent,
      });
    }

    return updatedRoom;
  }

  // Teacher: Resolve Student Inquiry
  public resolveStudentInquiry(roomCode: string, playerId: string): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    const updatedPlayer: Player = {
      ...player,
      pendingInquiry: null,
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
    return updatedRoom;
  }

  // Explicitly clear player power-up state
  public clearPlayerPowerUp(roomCode: string, playerId: string): GameRoom | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.players[playerId]) return null;

    const player = room.players[playerId];
    if (!player.unlockedPowerUp) return room;

    const updatedPlayer: Player = {
      ...player,
      unlockedPowerUp: null,
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
    return updatedRoom;
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
