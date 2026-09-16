import React, { useState, useEffect } from 'react';
import { GameRoom, Player, Quiz, Question, ChibiCustomization, PowerUpType, TeacherAccount, BattleSessionState } from './types';
import { SAMPLE_QUIZZES } from './data/sampleQuizzes';
import { getRandomChibi } from './data/chibiAssets';
import { realtime } from './services/realtime';
import { soundManager } from './services/audio';
import { TeacherAuthService } from './services/teacherAuthService';

import { ChibiAvatar } from './components/ChibiAvatar';
import { ChibiCustomizer } from './components/ChibiCustomizer';
import { ChibiLobby } from './components/ChibiLobby';
import { QuizCard } from './components/QuizCard';
import { BattleActionModal } from './components/BattleActionModal';
import { LiveLeaderboard } from './components/LiveLeaderboard';
import { QuizCreatorModal } from './components/QuizCreatorModal';
import { VercelDeployGuide } from './components/VercelDeployGuide';
import { TeacherAlertModal } from './components/TeacherAlertModal';
import { StudentAlertModal } from './components/StudentAlertModal';
import { TeacherGiftModal } from './components/TeacherGiftModal';
import { TeacherInquiryModal } from './components/TeacherInquiryModal';
import { TeacherAuthPanel } from './components/TeacherAuthPanel';
import { StudentShopModal } from './components/StudentShopModal';

import { getRankTier } from './data/rankAssets';
import { shuffleStudentQuestions } from './utils/shuffle';
import { calculateAnswerScore } from './utils/scoring';
import { calculateCoinReward } from './services/coinEngine';
import { StudentWalletService } from './services/studentWalletService';
import { BattleEngine, createInitialBattleState } from './services/battleEngine';

import {
  Sparkles,
  Gamepad2,
  Users,
  Plus,
  Play,
  QrCode,
  Rocket,
  Shield,
  Flame,
  Swords,
  RotateCcw,
  Gift,
  Zap,
  Megaphone,
  Trophy,
  LogOut,
  UserCheck,
  UserX,
  ShoppingBag,
} from 'lucide-react';

const STORAGE_CUSTOM_QUIZZES = 'chibi_quiz_custom_quizzes_v1';
const STORAGE_ACTIVE_HOST_ROOM = 'chibi_quiz_active_host_room_code';
const STORAGE_ACTIVE_PLAYER_SESSION = 'chibi_quiz_active_player_session';

export function App() {
  const [role, setRole] = useState<'HOME' | 'HOST' | 'PLAYER'>('HOME');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeHomeTab, setActiveHomeTab] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [currentTeacher, setCurrentTeacher] = useState<TeacherAccount | null>(() => TeacherAuthService.getCurrentTeacher());
  
  // Custom quizzes persistent storage
  const [quizzesList, setQuizzesList] = useState<Quiz[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_CUSTOM_QUIZZES);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return [...parsed, ...SAMPLE_QUIZZES];
          }
        } catch (e) {
          console.error('Failed to parse saved quizzes', e);
        }
      }
    }
    return SAMPLE_QUIZZES;
  });

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz>(quizzesList[0]);

  // Active game room state
  const [room, setRoom] = useState<GameRoom | null>(null);

  // Student player identity
  const [player, setPlayer] = useState<Player | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(true);

  // Battle attack / powerup modal state
  const [showPowerUpModal, setShowPowerUpModal] = useState(false);

  // Quiz Creator, Deploy Guide & Teacher Gift/Alert Modals
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [showTeacherAlertModal, setShowTeacherAlertModal] = useState(false);
  const [alertTargetStudentId, setAlertTargetStudentId] = useState('ALL');
  const [showTeacherGiftModal, setShowTeacherGiftModal] = useState(false);
  const [giftTargetStudentId, setGiftTargetStudentId] = useState('ALL');
  const [selectedInquiryStudent, setSelectedInquiryStudent] = useState<Player | null>(null);

  // Kicked by Teacher modal state
  const [showKickedModal, setShowKickedModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);

  // Student: Anti-Cheat Tab Switch & Window Focus Monitor
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarningToast, setShowTabWarningToast] = useState(false);

  useEffect(() => {
    if (role !== 'PLAYER' || !room?.roomCode || !player?.id) return;

    let isHiddenState = false;

    const handleTabLeave = () => {
      if (isHiddenState) return;
      isHiddenState = true;

      const newCount = tabSwitchCount + 1;
      setTabSwitchCount(newCount);
      setShowTabWarningToast(true);

      realtime.updatePlayerTabStatus(room.roomCode, player.id, false, newCount);

      setTimeout(() => setShowTabWarningToast(false), 6000);
    };

    const handleTabReturn = () => {
      isHiddenState = false;
      realtime.updatePlayerTabStatus(room.roomCode, player.id, true, tabSwitchCount);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleTabLeave();
      else handleTabReturn();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleTabLeave);
    window.addEventListener('focus', handleTabReturn);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleTabLeave);
      window.removeEventListener('focus', handleTabReturn);
    };
  }, [role, room?.roomCode, player?.id, tabSwitchCount]);

  // Restore active Teacher Host or Student session after F5 page refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const hostParam = params.get('host');
    const pinParam = params.get('pin');

    // Priority 1: Restore Teacher Host room on F5
    const savedHostCode = hostParam || localStorage.getItem(STORAGE_ACTIVE_HOST_ROOM);
    if (savedHostCode) {
      const existingRoom = realtime.reconnectHost(savedHostCode);
      if (existingRoom) {
        setRoom(existingRoom);
        setRole('HOST');
        soundManager.playBGM();
        return;
      }
    }

    // Priority 2: Restore Student Player session on F5
    const savedPlayerSession = localStorage.getItem(STORAGE_ACTIVE_PLAYER_SESSION);
    if (savedPlayerSession) {
      try {
        const { roomCode: savedCode, player: savedPlayer } = JSON.parse(savedPlayerSession);
        const existingRoom = realtime.reconnectStudent(savedCode, savedPlayer);
        if (existingRoom) {
          const latestPlayer = existingRoom.players[savedPlayer.id] || savedPlayer;
          setPlayer(latestPlayer);
          setRoom(existingRoom);
          setRole('PLAYER');
          setShowCustomizer(false);
          soundManager.playBGM();
          return;
        }
      } catch (e) {
        console.error('Failed to restore player session on refresh', e);
      }
    }

    // Priority 3: QR Code Quick Join Param
    if (pinParam) {
      setRoomCodeInput(pinParam);
      setRole('PLAYER');
    }
  }, []);

  // Subscribe to real-time updates when inside a room
  useEffect(() => {
    if (!room?.roomCode) return;

    const unsubscribe = realtime.subscribe(room.roomCode, (updatedRoom) => {
      setRoom(updatedRoom);

      // Keep local player state synced (match by player.id or name fallback for restored players)
      if (role === 'PLAYER' && player) {
        const syncedPlayer =
          updatedRoom.players[player.id] ||
          (player.studentCode
            ? Object.values(updatedRoom.players).find((p) => p.studentCode && p.studentCode.trim() === player.studentCode?.trim())
            : undefined);

        if (syncedPlayer) {
          setPlayer(syncedPlayer);
          localStorage.setItem(
            STORAGE_ACTIVE_PLAYER_SESSION,
            JSON.stringify({ roomCode: updatedRoom.roomCode, player: syncedPlayer })
          );

          // Auto trigger power-up card modal ONLY if THIS player unlocked a power-up
          if (syncedPlayer.unlockedPowerUp && updatedRoom.phase === 'QUESTION') {
            setShowPowerUpModal(true);
          }
        } else {
          // Player was removed / kicked by Teacher!
          localStorage.removeItem(STORAGE_ACTIVE_PLAYER_SESSION);
          setPlayer(null);
          setRoom(null);
          setRole('HOME');
          setShowKickedModal(true);
        }
      }
    });

    return () => unsubscribe();
  }, [room?.roomCode, player?.id, player?.name, role]);

  // Host: Remove / Kick Player from Room
  const handleRemovePlayer = (playerId: string) => {
    if (!room) return;
    const updatedRoom = realtime.removePlayer(room.roomCode, playerId);
    if (updatedRoom) setRoom(updatedRoom);
  };

  // Host: Create Room
  const handleCreateRoom = (quizToUse: Quiz) => {
    const hostId = `host-${Date.now()}`;
    const newRoom = realtime.createRoom(quizToUse, hostId);
    const roomWithBattle = realtime.updateBattleSessionState(newRoom.roomCode, createInitialBattleState());
    setRoom(roomWithBattle || newRoom);
    setRole('HOST');
    localStorage.setItem(STORAGE_ACTIVE_HOST_ROOM, newRoom.roomCode);
    soundManager.playBGM();
  };

  // Student: Join Room (Connects via PeerJS WebRTC to Host PC!)
  const handleJoinAsPlayer = (name: string, chibi: ChibiCustomization) => {
    const code = roomCodeInput.trim();
    if (!code) return;

    // Check if room already exists locally to restore existing player stats
    const existingRoom = realtime.getRoom(code);
    const existingPlayer = existingRoom
      ? Object.values(existingRoom.players).find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase() && p.name.trim() !== ''
        )
      : undefined;

    let playerToJoin: Player;
    if (existingPlayer) {
      playerToJoin = {
        ...existingPlayer,
        isTabActive: true,
        chibi: chibi || existingPlayer.chibi,
      };
    } else {
      const studentCode = `HS-${Math.floor(1000 + Math.random() * 9000)}`;
      const playerId = `player-${studentCode.toLowerCase()}-${Math.random().toString(36).substr(2, 6)}`;
      playerToJoin = {
        id: playerId,
        studentCode,
        name,
        chibi,
        score: 0,
        streak: 0,
        shieldActive: false,
        shieldCount: 0,
        isReady: true,
        joinedAt: Date.now(),
      };
    }

    setPlayer(playerToJoin);
    setShowCustomizer(false);

    const updatedRoom = realtime.joinRoom(code, playerToJoin);
    if (updatedRoom) {
      setRoom(updatedRoom);
      const restored =
        updatedRoom.players[playerToJoin.id] ||
        (playerToJoin.studentCode
          ? Object.values(updatedRoom.players).find((p) => p.studentCode && p.studentCode.trim() === playerToJoin.studentCode?.trim())
          : undefined);
      if (restored) {
        setPlayer(restored);
        playerToJoin = restored;
      }
    }
    localStorage.setItem(STORAGE_ACTIVE_PLAYER_SESSION, JSON.stringify({ roomCode: code, player: playerToJoin }));
    soundManager.playBGM();
  };

  // Host: Start Game
  const handleStartGame = () => {
    if (!room) return;
    const updated = realtime.updatePhase(room.roomCode, 'QUESTION', 0);
    if (updated) setRoom(updated);
  };

  // Host: Overall Game Phase Progression
  const handleNextQuestion = () => {
    if (!room) return;
    const nextIdx = room.currentQuestionIndex + 1;
    if (nextIdx < room.quiz.questions.length) {
      const updated = realtime.updatePhase(room.roomCode, 'QUESTION', nextIdx);
      if (updated) setRoom(updated);
    } else {
      const updated = realtime.updatePhase(room.roomCode, 'FINISHED');
      if (updated) setRoom(updated);
    }
  };

  // Student: Per-student independent question advancement
  const handleStudentNextQuestion = () => {
    if (!room || !player) return;
    const updatedRoom = realtime.advancePlayerQuestion(room.roomCode, player.id);
    if (updatedRoom) setRoom(updatedRoom);
  };

  // Student: Unfreeze player when freeze timer expires
  const handleUnfreezePlayer = () => {
    if (!room || !player) return;
    const updatedRoom = realtime.unfreezePlayer(room.roomCode, player.id);
    if (updatedRoom) setRoom(updatedRoom);
  };

  // Student: Submit Answer (Updates both Live Match Score & Persistent Student Wallet Coins)
  const handleAnswerSubmit = (selectedIndex: number, isCorrect: boolean, timeSpentSec: number) => {
    if (!room || !player) return { scoreEarned: 0, coinsEarned: 0 };

    // Anti-Guessing ("Lô tô đáp án") Check: If student answers under 2 seconds, trigger 10s freeze!
    if (timeSpentSec < 2) {
      const reason = '⚠️ CẢNH BÁO LÔ TÔ ĐÁP ÁN: Bạn chọn quá nhanh (dưới 2s)! Hệ thống tự động đóng băng 10 giây để bạn đọc kỹ câu hỏi.';
      const frozenRoom = realtime.freezePlayer(room.roomCode, player.id, 10, reason);
      if (frozenRoom) setRoom(frozenRoom);
    }

    const questionsList = player.shuffledQuestions || room.quiz.questions;
    const currentQ = questionsList[player.currentQuestionIndex || 0];
    let scoreToAdd = 0;
    if (isCorrect && currentQ) {
      const scoreResult = calculateAnswerScore({
        basePoints: currentQ.points || 100,
        timeSpentSec,
        isCorrect: true,
        streak: player.streak,
        doublePointsActive: false, // Let realtime.updatePlayerStats handle doublePointsActive consumption
      });
      scoreToAdd = scoreResult.totalEarned;
    }

    const updatedRoom = realtime.updatePlayerStats(room.roomCode, player.id, scoreToAdd, isCorrect, timeSpentSec);
    if (updatedRoom) setRoom(updatedRoom);

    // Calculate & Credit Coin Economy (Persistent Student Wallet)
    const wallet = StudentWalletService.getWallet(player.id, player.name);
    const equipBonus = StudentWalletService.getEquippedCoinBonusPercent(wallet);
    const coinReward = calculateCoinReward({
      isCorrect,
      timeSpentSec,
      streak: player.streak,
      equipmentCoinBonusPercent: equipBonus,
    });

    const transactionKey = `${room.roomCode}_q${currentQ?.id || player.currentQuestionIndex || 0}_${player.id}`;
    StudentWalletService.creditCoins(player.id, player.name, transactionKey, coinReward);

    // Controlled Battle Mode Progression
    if (room.battleSessionState && !room.battleSessionState.focusModeActive) {
      const qUntil = Math.max(0, (room.battleSessionState.questionsUntilBattle || 5) - 1);
      if (qUntil === 0 && room.battleSessionState.battleEnabled) {
        soundManager.playCorrect();
        const durationSec = 10;
        const battleEndTime = Date.now() + durationSec * 1000;

        realtime.updateBattleSessionState(room.roomCode, (prev?: BattleSessionState) => ({
          ...(prev || createInitialBattleState()),
          currentPhase: 'BATTLE',
          questionsUntilBattle: 0,
          battleEndTimestamp: battleEndTime,
        }));

        setTimeout(() => {
          realtime.updateBattleSessionState(room.roomCode, (prev?: BattleSessionState) =>
            BattleEngine.advanceRound(prev || createInitialBattleState())
          );
        }, durationSec * 1000);
      } else {
        realtime.updateBattleSessionState(room.roomCode, (prev?: BattleSessionState) => ({
          ...(prev || createInitialBattleState()),
          questionsUntilBattle: qUntil,
        }));
      }
    }

    return { scoreEarned: scoreToAdd, coinsEarned: coinReward.totalCoins };
  };

  // Student: Send Question Inquiry to Teacher
  const handleSendInquiry = (questionNumber: number, question: Question) => {
    if (!room || !player) return;
    const updatedRoom = realtime.submitStudentInquiry(room.roomCode, player.id, questionNumber, question);
    if (updatedRoom) setRoom(updatedRoom);
  };

  // Teacher: Resolve Student Question Inquiry
  const handleResolveInquiry = (playerId: string) => {
    if (!room) return;
    const updatedRoom = realtime.resolveStudentInquiry(room.roomCode, playerId);
    if (updatedRoom) setRoom(updatedRoom);
  };

  // Execute Player Power-Up Action with Controlled Battle Engine Validation
  const handleExecutePowerUp = (targetId: string, powerUpType: PowerUpType) => {
    if (!room || !player) return null;

    const sessionState = room.battleSessionState || createInitialBattleState();
    const opponents = Object.values(room.players);

    // Validate attack through Controlled Battle Engine
    const validation = BattleEngine.validateAttack({
      attackerId: player.id,
      targetId,
      powerUpType,
      sessionState,
      opponents,
    });

    if (!validation.valid) {
      soundManager.playShieldBlock();
      setShowPowerUpModal(false);
      if (room && player) {
        realtime.clearPlayerPowerUp(room.roomCode, player.id);
      }
      return null;
    }

    const resolvedTargetId = validation.resolvedTargetId || targetId;
    const result = realtime.executePowerUp(room.roomCode, player.id, resolvedTargetId, powerUpType);

    if (result?.success) {
      realtime.updateBattleSessionState(room.roomCode, (prev?: BattleSessionState) =>
        BattleEngine.registerAttackResult(prev || sessionState, player.id, resolvedTargetId)
      );
    }

    setPlayer((prev) => (prev ? { ...prev, unlockedPowerUp: null } : null));
    return result;
  };

  // Auto-open Power-Up Modal on Student device when a powerup is granted/unlocked
  useEffect(() => {
    if (player?.unlockedPowerUp) {
      setShowPowerUpModal(true);
    }
  }, [player?.unlockedPowerUp]);

  // Teacher: Send Gift / Power-Up Reward to Students
  const handleSendTeacherGift = (targetId: string, powerUpType: PowerUpType, giftTitle: string) => {
    if (!room) return;
    const updatedRoom = realtime.grantTeacherReward(room.roomCode, targetId, powerUpType, giftTitle);
    if (updatedRoom) setRoom(updatedRoom);
  };

  // Save new custom quiz into localStorage persistently!
  const handleSaveQuiz = (newQuiz: Quiz) => {
    const updated = [newQuiz, ...quizzesList.filter((q) => q.id !== newQuiz.id)];
    setQuizzesList(updated);
    setSelectedQuiz(newQuiz);

    const customOnly = updated.filter((q) => !SAMPLE_QUIZZES.some((s) => s.id === q.id));
    localStorage.setItem(STORAGE_CUSTOM_QUIZZES, JSON.stringify(customOnly));
  };

  const handleResetHome = () => {
    soundManager.stopBGM();
    localStorage.removeItem(STORAGE_ACTIVE_HOST_ROOM);
    localStorage.removeItem(STORAGE_ACTIVE_PLAYER_SESSION);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
    setRole('HOME');
    setRoom(null);
    setPlayer(null);
    setShowCustomizer(true);
  };

  // ==================== RENDER: HOME LANDING PAGE ====================
  if (role === 'HOME') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-6 relative overflow-hidden font-sans">
        {/* Ambient background glows */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Navbar */}
        <div className="w-full max-w-6xl flex items-center justify-between z-10 py-4">
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-2xl text-slate-900 font-black text-xl shadow-lg">
              ⚡
            </span>
            <span className="text-xl md:text-2xl font-black tracking-tight text-white">Học Mà Chơi</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeployGuide(true)}
              className="px-4 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-emerald-400" />
              Deploy Vercel (Free 100%)
            </button>
          </div>
        </div>

        {/* Main Hero Header */}
        <div className="w-full max-w-4xl text-center my-4 z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
            <span>Nền tảng Quiz Game Chibi Đấu Trường Rank Liên Quân</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 drop-shadow-lg">
            Học Tập Thật Vui Với Chibi Battle Quiz!
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Quét mã QR hoặc nhập mã PIN vào phòng ngay lập tức. Đua tốc độ trả lời câu hỏi, mở rương may mắn, đóng băng đối thủ & leo Rank Liên Quân!
          </p>
        </div>

        {/* Tab Switcher: Student vs Teacher */}
        <div className="w-full max-w-lg z-10 my-2">
          <div className="p-1.5 bg-slate-900/90 border-2 border-slate-800 rounded-2xl flex items-center gap-2 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setActiveHomeTab('STUDENT')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeHomeTab === 'STUDENT'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>🎓 DÀNH CHO HỌC SINH</span>
            </button>

            <button
              onClick={() => setActiveHomeTab('TEACHER')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeHomeTab === 'TEACHER'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>👨‍🏫 DÀNH CHO GIÁO VIÊN</span>
            </button>
          </div>
        </div>

        {/* Main Form Content Container */}
        <div className="w-full max-w-xl my-4 z-10">
          {activeHomeTab === 'STUDENT' ? (
            /* ==================== TAB 1: STUDENT JOIN CARD ==================== */
            <div className="bg-slate-900/95 backdrop-blur-xl p-8 rounded-3xl border-2 border-purple-500/50 shadow-2xl space-y-6 text-center animate-fade-in relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto shadow-lg shadow-purple-500/10">
                <Gamepad2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-white">Tham Gia Phòng Bài Thi</h2>
                <p className="text-xs md:text-sm text-slate-300 font-medium">
                  Nhập 6 chữ số Mã PIN do Giáo viên cung cấp để tạo nhân vật Chibi và tham gia Đấu Trường!
                </p>
              </div>

              <div className="space-y-2 py-2">
                <label className="block text-xs font-black text-purple-300 uppercase tracking-widest text-left">
                  🔑 MÃ PHÒNG (GAME PIN):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Nhập 6 chữ số (VD: 839204)..."
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-950 border-2 border-purple-500/60 rounded-2xl text-center text-yellow-400 font-black text-3xl md:text-4xl tracking-widest focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-purple-500/20 transition-all placeholder:text-base placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-600 shadow-inner"
                />
              </div>

              <button
                onClick={() => {
                  if (roomCodeInput.trim()) setRole('PLAYER');
                  else alert('Vui lòng nhập Mã PIN phòng trước!');
                }}
                className="w-full py-4.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
              >
                🚀 VÀO PHÒNG LÀM BÀI NGAY ➔
              </button>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setActiveHomeTab('TEACHER')}
                  className="text-xs font-semibold text-slate-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span>👨‍🏫 Bạn là Giáo viên muốn tạo sảnh bài thi?</span>
                  <span className="text-emerald-400 font-bold underline">Bấm vào đây ➔</span>
                </button>
              </div>
            </div>
          ) : (
            /* ==================== TAB 2: TEACHER HOST PANEL ==================== */
            !currentTeacher || currentTeacher.status !== 'APPROVED' ? (
              <TeacherAuthPanel onLoginSuccess={(acc) => setCurrentTeacher(acc)} />
            ) : (
              <div className="bg-slate-900/95 backdrop-blur-xl p-8 rounded-3xl border-2 border-emerald-500/50 shadow-2xl space-y-6 text-center animate-fade-in relative overflow-hidden">
                {/* Logged in Teacher Badge Bar */}
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-left">
                    <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block font-black text-sm">{currentTeacher.fullName}</strong>
                      <span className="text-emerald-300 font-mono text-[11px]">{currentTeacher.email} • [Đã Duyệt Quyền ✅]</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      TeacherAuthService.logout();
                      setCurrentTeacher(null);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white">Khu Vực Tạo Sảnh Cho Giáo Viên</h2>
                  <p className="text-xs md:text-sm text-slate-300 font-medium">
                    Chọn đề thi hoặc import đề thi LaTeX (.tex gói ex_test) để phát mã QR Code cho học sinh!
                  </p>
                </div>

                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-black text-emerald-300 uppercase tracking-widest mb-2">
                      📋 CHỌN BỘ CÂU HỎI QUIZ:
                    </label>
                    <select
                      value={selectedQuiz.id}
                      onChange={(e) => {
                        const found = quizzesList.find((q) => q.id === e.target.value);
                        if (found) setSelectedQuiz(found);
                      }}
                      className="w-full px-4 py-3.5 bg-slate-950 border-2 border-slate-700 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-emerald-400"
                    >
                      {quizzesList.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title} ({q.questions.length} câu)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setShowQuizCreator(true)}
                    className="w-full py-3 px-4 bg-slate-800/90 hover:bg-slate-800 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" /> Thêm/Import Đề Thi LaTeX (.tex ex_test)
                  </button>
                </div>

                <button
                  onClick={() => handleCreateRoom(selectedQuiz)}
                  className="w-full py-4.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-current" />
                  ▶ TẠO SẢNH & MÃ QR CODE ➔
                </button>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setActiveHomeTab('STUDENT')}
                    className="text-xs font-semibold text-slate-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <span>🎓 Bạn là Học sinh muốn tham gia thi?</span>
                    <span className="text-purple-400 font-bold underline">Nhập mã PIN ở đây ➔</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Feature Badges Footer */}
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-center gap-6 py-4 border-t border-slate-800/80 text-xs text-slate-400 font-bold z-10">
          <span className="flex items-center gap-1.5 text-yellow-400">
            <QrCode className="w-4 h-4" /> Quét QR Code Tham Gia Trực Tiếp
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Shield className="w-4 h-4" /> Tấn Công & Khiên Bảo Vệ
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <Zap className="w-4 h-4" /> Đua Tốc Độ & X2 Điểm
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-pink-400">
            <Gift className="w-4 h-4" /> Rương May Mắn & Đóng Băng
          </span>
        </div>

        {/* Modals */}
        <QuizCreatorModal
          isOpen={showQuizCreator}
          onClose={() => setShowQuizCreator(false)}
          onSaveQuiz={handleSaveQuiz}
        />

        <VercelDeployGuide
          isOpen={showDeployGuide}
          onClose={() => setShowDeployGuide(false)}
        />
      </div>
    );
  }

  // ==================== RENDER: STUDENT FLOW ====================
  if (role === 'PLAYER') {
    if (showCustomizer && !player) {
      return (
        <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center relative">
          <button
            onClick={handleResetHome}
            className="absolute top-6 left-6 px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" /> Đổi Mã Phòng
          </button>
          <ChibiCustomizer onComplete={handleJoinAsPlayer} />
        </div>
      );
    }

    if (!room || !player) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold">Đang kết nối phòng {roomCodeInput}...</h2>
          </div>
        </div>
      );
    }

    if (room.phase === 'LOBBY') {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
          <StudentAlertModal
            alertEvent={room.latestTeacherAlert}
            giftEvent={room.latestTeacherGift}
            currentPlayerId={player.id}
          />
          <div className="w-full max-w-6xl flex justify-between items-center mb-4">
            <button
              onClick={handleResetHome}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" /> Thoát Phòng
            </button>
          </div>
          <ChibiLobby
            room={room}
            isHost={false}
            currentPlayerId={player.id}
            onStartGame={() => {}}
          />
        </div>
      );
    }

    if (room.phase === 'QUESTION') {
      // Ensure student has shuffled questions initialized
      if (!player.shuffledQuestions || player.shuffledQuestions.length === 0) {
        const shuffled = shuffleStudentQuestions(room.quiz.questions);
        realtime.initializePlayerQuestions(room.roomCode, player.id, shuffled);
      }

      const questionsList = player.shuffledQuestions || room.quiz.questions;
      const currentQIdx = player.currentQuestionIndex || 0;
      const isFinished = player.isFinished || currentQIdx >= questionsList.length;

      const opponents = Object.values(room.players);

      if (isFinished) {
        const totalCount = questionsList.length;
        const correctCount = player.correctCount || 0;
        const accuracyPct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
        const studentWallet = StudentWalletService.getWallet(player.id, player.name);

        return (
          <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center relative">
            <StudentAlertModal
              alertEvent={room.latestTeacherAlert}
              giftEvent={room.latestTeacherGift}
              currentPlayerId={player.id}
            />

            <div className="w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-fade-in mb-8">
              <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg shadow-emerald-500/20">
                🎉
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-emerald-400 to-teal-300">
                Chúc Mừng Bạn Đã Hoàn Thành Bài Thi!
              </h2>
              <p className="text-sm text-slate-300 font-medium">
                Bạn đã trả lời hết tất cả câu hỏi. Dưới đây là kết quả của bạn và Bảng Xếp Hạng trực tiếp!
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="p-2.5 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Điểm Trận Đấu</div>
                  <div className="text-xl font-black text-yellow-400 mt-1">{player.score.toLocaleString()}</div>
                </div>
                <div className="p-2.5 text-center border-l border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Đúng / Tổng</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">{correctCount} / {totalCount}</div>
                </div>
                <div className="p-2.5 text-center border-l border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tỷ Lệ Đúng</div>
                  <div className="text-xl font-black text-cyan-400 mt-1">{accuracyPct}%</div>
                </div>
                <div className="p-2.5 text-center border-l border-slate-800">
                  <div className="text-[10px] text-amber-400 font-bold uppercase">Ví Xu Lâu Dài</div>
                  <div className="text-xl font-black text-yellow-300 mt-1 font-mono">🪙 {studentWallet.coins.toLocaleString()}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowShopModal(true)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm"
              >
                <ShoppingBag className="w-5 h-5 text-slate-950 shrink-0" />
                <span>MỞ CỬA HÀNG TRANG BỊ & NÂNG CẤP (VÍ XU: 🪙 {studentWallet.coins.toLocaleString()})</span>
              </button>
            </div>

            <div className="w-full max-w-4xl">
              <LiveLeaderboard
                players={room.players}
                attacks={room.attacks}
                isFinal={false}
                totalQuestions={room.quiz?.questions?.length || 5}
              />
            </div>
          </div>
        );
      }

      const currentQ = questionsList[currentQIdx] || {
        id: 'fallback-q',
        questionText: 'Đang tải câu hỏi...',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
      };

      return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center relative">
          {showTabWarningToast && (
            <div className="fixed top-6 right-6 z-50 bg-rose-950/95 border-2 border-rose-500 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce max-w-md">
              <span className="text-3xl">⚠️</span>
              <div>
                <h4 className="font-black text-sm text-yellow-300">CẢNH BÁO RỜI MÀN HÌNH!</h4>
                <p className="text-xs text-rose-200 mt-0.5">
                  Bạn vừa rời tab / mở ứng dụng khác (Lần thứ {tabSwitchCount}). Đã ghi nhận báo cáo đến màn hình Giáo viên!
                </p>
              </div>
            </div>
          )}

          <QuizCard
            question={currentQ}
            questionNumber={currentQIdx + 1}
            totalQuestions={questionsList.length || 1}
            player={player}
            battleSessionState={room.battleSessionState}
            onAnswerSubmit={handleAnswerSubmit}
            onAutoNext={handleStudentNextQuestion}
            onUnfreeze={handleUnfreezePlayer}
            onSendInquiry={handleSendInquiry}
          />

          <BattleActionModal
            attacker={player}
            opponents={opponents}
            isOpen={showPowerUpModal}
            powerUpType={player.unlockedPowerUp}
            battleSessionState={room.battleSessionState}
            onExecutePowerUp={handleExecutePowerUp}
            onClose={() => {
              setShowPowerUpModal(false);
              setPlayer((prev) => (prev ? { ...prev, unlockedPowerUp: null } : null));
              if (room && player) {
                const updated = realtime.clearPlayerPowerUp(room.roomCode, player.id);
                if (updated) setRoom(updated);
              }
            }}
            onNextQuestion={handleStudentNextQuestion}
          />

          <StudentAlertModal
            alertEvent={room.latestTeacherAlert}
            giftEvent={room.latestTeacherGift}
            currentPlayerId={player.id}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center">
        <StudentAlertModal
          alertEvent={room.latestTeacherAlert}
          giftEvent={room.latestTeacherGift}
          currentPlayerId={player.id}
        />
        <LiveLeaderboard
          players={room.players}
          attacks={room.attacks}
          isFinal={room.phase === 'FINISHED'}
          totalQuestions={room.quiz?.questions?.length || 5}
        />
        <button
          onClick={handleResetHome}
          className="mt-8 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-2xl shadow-lg"
        >
          Trở Về Trang Chủ
        </button>
      </div>
    );
  }

  // ==================== RENDER: TEACHER HOST FLOW ====================
  if (role === 'HOST' && room) {
    if (room.phase === 'LOBBY') {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-6xl flex justify-between items-center mb-4">
            <button
              onClick={handleResetHome}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" /> Hủy Phòng
            </button>
            <button
              onClick={() => setShowTeacherAlertModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            >
              <Megaphone className="w-4 h-4 animate-bounce" /> 📢 Gửi Cảnh Báo
            </button>
          </div>
          <ChibiLobby
            room={room}
            isHost={true}
            onStartGame={handleStartGame}
            onRemovePlayer={handleRemovePlayer}
          />
          <TeacherAlertModal
            isOpen={showTeacherAlertModal}
            onClose={() => setShowTeacherAlertModal(false)}
            roomCode={room.roomCode}
            players={room.players}
          />
        </div>
      );
    }

    if (room.phase === 'QUESTION') {
      const allPlayers = Object.values(room.players);
      const totalCount = allPlayers.length;
      // Real-time sorting by highest score first!
      const sortedPlayers = [...allPlayers].sort((a, b) => b.score - a.score);

      const finishedCount = allPlayers.filter((p) => p.isFinished).length;
      const awayCount = allPlayers.filter((p) => p.isTabActive === false).length;
      const warnedCount = allPlayers.filter((p) => (p.tabSwitchCount || 0) > 0).length;
      const totalQuestions = room.quiz.questions.length || 1;

      return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center space-y-6 font-sans">
          {/* Top Control & Stats Header */}
          <div className="w-full max-w-6xl bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border-2 border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-2xl flex items-center gap-2">
                <span className="text-xs font-bold text-yellow-300 uppercase">MÃ PHÒNG (PIN):</span>
                <span className="text-2xl font-black text-yellow-400 tracking-wider">{room.roomCode}</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs font-bold text-slate-300">
                <Users className="w-4 h-4 text-purple-400" />
                <span>{totalCount} Học sinh</span>
              </div>

              {finishedCount > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2 rounded-2xl text-xs font-extrabold text-emerald-300">
                  <span>✅ {finishedCount}/{totalCount} Hoàn thành</span>
                </div>
              )}

              {awayCount > 0 && (
                <div className="flex items-center gap-1.5 bg-rose-600/30 border border-rose-500/50 px-3.5 py-2 rounded-2xl text-xs font-black text-rose-300 animate-pulse">
                  <span>🔴 {awayCount} HS rời tab</span>
                </div>
              )}

              {warnedCount > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-3.5 py-2 rounded-2xl text-xs font-bold text-yellow-300">
                  <span>⚠️ {warnedCount} HS vi phạm</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setGiftTargetStudentId('ALL');
                  setShowTeacherGiftModal(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-pink-500 hover:from-yellow-400 hover:to-pink-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-yellow-500/30 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Gift className="w-4 h-4 text-slate-950 animate-bounce" /> 🎁 Tặng Quà Học Sinh
              </button>
              <button
                onClick={() => {
                  setAlertTargetStudentId('ALL');
                  setShowTeacherAlertModal(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Megaphone className="w-4 h-4 animate-bounce" /> 📢 Gửi Cảnh Báo Lớp
              </button>
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn kết thúc bài thi cho tất cả học sinh không?')) {
                    const updated = realtime.updatePhase(room.roomCode, 'FINISHED');
                    if (updated) setRoom(updated);
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                🏁 KẾT THÚC BÀI THI
              </button>
            </div>
          </div>

          {/* Full Width Master Live Student Ranking & Progress Table */}
          <div className="w-full max-w-6xl bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border-2 border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-2">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400 animate-bounce" />
                  BẢNG GIÁM SÁT TIẾN ĐỘ & BẢNG XẾP HẠNG THỜI GIAN THỰC
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Tự động sắp xếp vị trí theo Điểm số & Thứ hạng (Real-time sorting) • Xáo câu hỏi per student
                </p>
              </div>

              <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-xl">
                ⚡ Tự động cập nhật thứ hạng liên tục
              </span>
            </div>

            {sortedPlayers.length === 0 ? (
              <div className="text-center py-16 text-slate-500 font-medium">
                Chưa có học sinh nào tham gia bài thi...
              </div>
            ) : (
              <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                {sortedPlayers.map((p, index) => {
                  const rankIndex = index + 1;
                  const currentIdx = p.currentQuestionIndex || 0;
                  const progressPct = Math.min(100, Math.round((currentIdx / totalQuestions) * 100));
                  const isAway = p.isTabActive === false;
                  const hasSwitched = (p.tabSwitchCount || 0) > 0;
                  const tier = getRankTier(p.score, totalQuestions);

                  const accuracyPct = totalQuestions > 0
                    ? Math.round(((p.correctCount || 0) / totalQuestions) * 100)
                    : 0;

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 ${
                        p.isFinished
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : isAway
                          ? 'bg-rose-950/40 border-rose-500 animate-pulse'
                          : index === 0
                          ? 'bg-slate-900 border-yellow-500/60 shadow-lg shadow-yellow-500/10'
                          : 'bg-slate-950/90 border-slate-800 hover:border-purple-500/50'
                      }`}
                    >
                      {/* Section 1: Rank Badge & Student Identity */}
                      <div className="flex items-center gap-3 min-w-[240px]">
                        {/* Rank Badge */}
                        {index === 0 && (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 font-black text-sm flex flex-col items-center justify-center shadow-lg shadow-yellow-500/30 border-2 border-yellow-200 shrink-0">
                            <span className="text-xs">🥇</span>
                            <span>#1</span>
                          </div>
                        )}
                        {index === 1 && (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-slate-950 font-black text-xs flex flex-col items-center justify-center shadow-md border-2 border-slate-200 shrink-0">
                            <span className="text-xs">🥈</span>
                            <span>#2</span>
                          </div>
                        )}
                        {index === 2 && (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-amber-100 font-black text-xs flex flex-col items-center justify-center shadow-md border-2 border-amber-600 shrink-0">
                            <span className="text-xs">🥉</span>
                            <span>#3</span>
                          </div>
                        )}
                        {index > 2 && (
                          <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-300 font-black text-sm flex items-center justify-center border border-slate-700 shrink-0">
                            #{rankIndex}
                          </div>
                        )}

                        {/* Avatar & Name & Rank Tier */}
                        <div className="flex items-center gap-3">
                          <ChibiAvatar customization={p.chibi} size="sm" isBouncing={false} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-base text-white">{p.name}</h4>
                              {p.studentCode && (
                                <span className="px-1.5 py-0.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 rounded text-[10px] font-mono font-bold">
                                  🆔 {p.studentCode}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-gradient-to-r ${tier.bgGradient} text-white shadow-sm flex items-center gap-1`}>
                                <span>{tier.icon}</span>
                                <span>{tier.name}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5 flex-wrap">
                              <span>🎯 Đúng {p.correctCount || 0}/{totalQuestions} câu ({accuracyPct}%)</span>
                              {(p.rapidGuessCount || 0) > 0 && (
                                <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold flex items-center gap-1">
                                  🎲 Lô tô ({p.rapidGuessCount} lần)
                                </span>
                              )}
                              {p.pendingInquiry && (
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                  💬 Thắc mắc câu {p.pendingInquiry.questionNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Progress Bar */}
                      <div className="flex-1 min-w-[200px] max-w-md space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-300">
                          <span className="text-purple-300">Tiến độ: Câu {currentIdx}/{totalQuestions}</span>
                          <span className="text-yellow-400">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden relative">
                          <div
                            className={`h-full transition-all duration-700 rounded-full ${
                              p.isFinished
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : isAway
                                ? 'bg-rose-500 animate-pulse'
                                : 'bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-400'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Section 3: Score & Streak */}
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <div className="text-right">
                          <div className="text-xl font-black text-yellow-400 tracking-wide">
                            {p.score.toLocaleString()} <span className="text-xs font-bold text-slate-400">PT</span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            {p.streak >= 2 && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-black flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-amber-400" /> {p.streak}
                              </span>
                            )}
                            {p.shieldActive && (
                              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md text-[10px] font-black flex items-center gap-0.5">
                                <Shield className="w-3 h-3 text-cyan-400" /> Khiên
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Anti-Cheat Tab Status & Action */}
                      <div className="flex items-center gap-3 min-w-[200px] justify-end">
                        {p.isFinished ? (
                          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black flex items-center gap-1">
                            ✅ Hoàn thành ({totalQuestions}/{totalQuestions})
                          </span>
                        ) : isAway ? (
                          <span className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-black animate-bounce flex items-center gap-1 shadow-lg shadow-rose-600/30">
                            🔴 RỜI TAB ({p.tabSwitchCount})
                          </span>
                        ) : hasSwitched ? (
                          <span className="px-3 py-1.5 bg-amber-500/20 text-yellow-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1">
                            ⚠️ Vi phạm ({p.tabSwitchCount} lần)
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1">
                            🟢 Tập trung 100%
                          </span>
                        )}

                        {p.pendingInquiry && (
                          <button
                            onClick={() => setSelectedInquiryStudent(p)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black rounded-xl border-2 border-amber-300 shadow-lg shadow-amber-500/30 animate-bounce flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <span>💬 GIẢI ĐÁP CÂU {p.pendingInquiry.questionNumber}</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setGiftTargetStudentId(p.id);
                            setShowTeacherGiftModal(true);
                          }}
                          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-300 hover:text-slate-950 text-xs font-bold rounded-xl border border-yellow-500/40 transition-all cursor-pointer shrink-0"
                        >
                          🎁 Tặng quà
                        </button>

                        <button
                          onClick={() => {
                            setAlertTargetStudentId(p.id);
                            setShowTeacherAlertModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer shrink-0"
                        >
                          📢 Cảnh báo
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa học sinh "${p.name}" (${p.studentCode || p.id}) khỏi phòng không?`)) {
                              handleRemovePlayer(p.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold rounded-xl border border-rose-500/40 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                          title={`Xóa học sinh ${p.name} khỏi phòng`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <TeacherAlertModal
            isOpen={showTeacherAlertModal}
            onClose={() => setShowTeacherAlertModal(false)}
            roomCode={room.roomCode}
            players={room.players}
            initialTargetId={alertTargetStudentId}
            battleSessionState={room.battleSessionState}
          />

          <TeacherGiftModal
            isOpen={showTeacherGiftModal}
            onClose={() => setShowTeacherGiftModal(false)}
            players={Object.values(room.players)}
            onSendGift={handleSendTeacherGift}
            initialTargetId={giftTargetStudentId}
          />

          <TeacherInquiryModal
            isOpen={!!selectedInquiryStudent && !!selectedInquiryStudent.pendingInquiry}
            inquiry={selectedInquiryStudent ? selectedInquiryStudent.pendingInquiry || null : null}
            onResolve={(playerId) => {
              handleResolveInquiry(playerId);
              setSelectedInquiryStudent(null);
            }}
            onSendReward={(playerId) => {
              setGiftTargetStudentId(playerId);
              setShowTeacherGiftModal(true);
            }}
            onClose={() => setSelectedInquiryStudent(null)}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center">
        <LiveLeaderboard
          players={room.players}
          attacks={room.attacks}
          isFinal={room.phase === 'FINISHED'}
          isHost={true}
          totalQuestions={room.quiz?.questions?.length || 5}
          onNextQuestion={handleNextQuestion}
          onOpenTeacherAlert={() => {
            setAlertTargetStudentId('ALL');
            setShowTeacherAlertModal(true);
          }}
          onRemovePlayer={handleRemovePlayer}
        />
        <button
          onClick={handleResetHome}
          className="mt-8 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-2xl shadow-lg"
        >
          Kết Thúc Bài Test & Về Trang Chủ
        </button>

        <TeacherAlertModal
          isOpen={showTeacherAlertModal}
          onClose={() => setShowTeacherAlertModal(false)}
          roomCode={room.roomCode}
          players={room.players}
          initialTargetId={alertTargetStudentId}
          battleSessionState={room.battleSessionState}
        />

        <TeacherGiftModal
          isOpen={showTeacherGiftModal}
          onClose={() => setShowTeacherGiftModal(false)}
          players={Object.values(room.players)}
          onSendGift={handleSendTeacherGift}
          initialTargetId={giftTargetStudentId}
        />
      </div>
    );
  }

  return (
    <>
      {showKickedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-3xl mx-auto">
              🚫
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-rose-400">Bạn đã bị Giáo viên xóa khỏi phòng!</h3>
              <p className="text-xs text-slate-300 font-medium">
                Giáo viên đã mời bạn ra khỏi phòng bài thi. Vui lòng liên hệ Giáo viên nếu có nhầm lẫn.
              </p>
            </div>
            <button
              onClick={() => {
                setShowKickedModal(false);
                handleResetHome();
              }}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-base shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              Trở Về Trang Chủ
            </button>
          </div>
        </div>
      )}
      {/* Student Shop & Equipment Modal */}
      {player && (
        <StudentShopModal
          isOpen={showShopModal}
          studentId={player.id}
          studentName={player.name}
          onClose={() => setShowShopModal(false)}
        />
      )}
    </>
  );
}
