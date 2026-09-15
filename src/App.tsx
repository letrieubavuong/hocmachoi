import React, { useState, useEffect } from 'react';
import { GameRoom, Player, Quiz, ChibiCustomization, PowerUpType } from './types';
import { SAMPLE_QUIZZES } from './data/sampleQuizzes';
import { getRandomChibi } from './data/chibiAssets';
import { realtime } from './services/realtime';
import { soundManager } from './services/audio';

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

import { getRankTier } from './data/rankAssets';
import { shuffleStudentQuestions } from './utils/shuffle';

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
} from 'lucide-react';

const STORAGE_CUSTOM_QUIZZES = 'chibi_quiz_custom_quizzes_v1';

export function App() {
  const [role, setRole] = useState<'HOME' | 'HOST' | 'PLAYER'>('HOME');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  
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

  // Quiz Creator & Deploy Guide Modals
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [showTeacherAlertModal, setShowTeacherAlertModal] = useState(false);

  // Student: Anti-Cheat Tab Switch & Window Focus Monitor
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarningToast, setShowTabWarningToast] = useState(false);

  useEffect(() => {
    if (role !== 'PLAYER' || !room?.roomCode || !player?.id) return;

    let isHiddenState = false;

    const handleTabLeave = () => {
      if (isHiddenState) return;
      isHiddenState = true;

      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        realtime.updatePlayerTabStatus(room.roomCode, player.id, false, nextCount);
        return nextCount;
      });

      setShowTabWarningToast(true);
      setTimeout(() => setShowTabWarningToast(false), 4500);
    };

    const handleTabReturn = () => {
      if (!isHiddenState) return;
      isHiddenState = false;

      setTabSwitchCount((currentCount) => {
        realtime.updatePlayerTabStatus(room.roomCode, player.id, true, currentCount);
        return currentCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabLeave();
      } else {
        handleTabReturn();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleTabLeave);
    window.addEventListener('focus', handleTabReturn);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleTabLeave);
      window.removeEventListener('focus', handleTabReturn);
    };
  }, [role, room?.roomCode, player?.id]);

  // Read URL query parameter for QR Code quick join (e.g. ?pin=839204)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
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

      // Keep local player state synced
      if (player?.id && updatedRoom.players[player.id]) {
        const syncedPlayer = updatedRoom.players[player.id];
        setPlayer(syncedPlayer);

        // Auto trigger power-up card modal if unlocked
        if (syncedPlayer.unlockedPowerUp && updatedRoom.phase === 'QUESTION') {
          setShowPowerUpModal(true);
        }
      }
    });

    return () => unsubscribe();
  }, [room?.roomCode, player?.id]);

  // Host: Create Room
  const handleCreateRoom = (quizToUse: Quiz) => {
    const hostId = `host-${Date.now()}`;
    const newRoom = realtime.createRoom(quizToUse, hostId);
    setRoom(newRoom);
    setRole('HOST');
    soundManager.playBGM();
  };

  // Student: Join Room (Connects via PeerJS WebRTC to Host PC!)
  const handleJoinAsPlayer = (name: string, chibi: ChibiCustomization) => {
    const code = roomCodeInput.trim();
    if (!code) return;

    const playerId = `player-${Date.now()}`;
    const newPlayer: Player = {
      id: playerId,
      name,
      chibi,
      score: 0,
      streak: 0,
      shieldActive: false,
      shieldCount: 0,
      isReady: true,
      joinedAt: Date.now(),
    };

    setPlayer(newPlayer);
    setShowCustomizer(false);

    const updatedRoom = realtime.joinRoom(code, newPlayer);
    if (updatedRoom) {
      setRoom(updatedRoom);
    }
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

  // Student: Submit Answer
  const handleAnswerSubmit = (selectedIndex: number, isCorrect: boolean, timeSpentSec: number) => {
    if (!room || !player) return;

    const questionsList = player.shuffledQuestions || room.quiz.questions;
    const currentQ = questionsList[player.currentQuestionIndex || 0];
    let scoreToAdd = 0;
    if (isCorrect && currentQ) {
      let speedBonus = 0;
      if (timeSpentSec <= 3) speedBonus = 150;
      else if (timeSpentSec <= 6) speedBonus = 100;
      else if (timeSpentSec <= 10) speedBonus = 50;

      const streakMultiplier = player.streak >= 2 ? 1.5 : 1;
      scoreToAdd = Math.round(((currentQ.points || 100) + speedBonus) * streakMultiplier);
    }

    const updatedRoom = realtime.updatePlayerStats(room.roomCode, player.id, scoreToAdd, isCorrect);
    if (updatedRoom) setRoom(updatedRoom);
  };

  // Execute Player Power-Up Action
  const handleExecutePowerUp = (targetId: string, powerUpType: PowerUpType) => {
    if (!room || !player) return null;
    const result = realtime.executePowerUp(room.roomCode, player.id, targetId, powerUpType);
    setShowPowerUpModal(false);
    return result;
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
              className="px-4 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            >
              <Rocket className="w-4 h-4 text-emerald-400" />
              Deploy Vercel (Free 100%)
            </button>
          </div>
        </div>

        {/* Main Hero Header */}
        <div className="w-full max-w-4xl text-center my-6 z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
            <span>Nền tảng Quiz Game Chibi Đấu Trường Rank Liên Quân</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 drop-shadow-lg">
            Học Tập Thật Vui Với Chibi Battle Quiz!
          </h1>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            Quét mã QR vào phòng ngay lập tức. Đua tốc độ trả lời câu hỏi, mở rương may mắn, đóng băng đối thủ & leo Rank Liên Quân Đấu Trường!
          </p>
        </div>

        {/* Dual Cards: Student Join & Teacher Host */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 my-6 z-10">
          {/* Card 1: Student Join */}
          <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-purple-500/40 shadow-2xl flex flex-col justify-between space-y-6 hover:border-purple-400 transition-all">
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Dành Cho Học Sinh</h2>
              <p className="text-xs text-slate-400">
                Nhập 6 chữ số Mã PIN được giáo viên cung cấp để tạo nhân vật Chibi và tham gia sảnh chờ!
              </p>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  MÃ PHÒNG (GAME PIN):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Nhập 6 chữ số (VD: 839204)..."
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-950 border-2 border-purple-500/60 rounded-2xl text-center text-yellow-400 font-black text-3xl tracking-widest focus:outline-none focus:border-yellow-400 transition-all placeholder:text-base placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (roomCodeInput.trim()) setRole('PLAYER');
                else alert('Vui lòng nhập Mã PIN phòng trước!');
              }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
              VÀO PHÒNG CHƠI NGAY ➔
            </button>
          </div>

          {/* Card 2: Teacher Host */}
          <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-emerald-500/40 shadow-2xl flex flex-col justify-between space-y-6 hover:border-emerald-400 transition-all">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Dành Cho Giáo Viên (Host)</h2>
              <p className="text-xs text-slate-400">
                Hỗ trợ nhập trực tiếp file .tex (gói ex_test chuẩn Việt Nam) hoặc chọn bộ đề có sẵn!
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  CHỌN BỘ CÂU HỎI QUIZ:
                </label>
                <select
                  value={selectedQuiz.id}
                  onChange={(e) => {
                    const found = quizzesList.find((q) => q.id === e.target.value);
                    if (found) setSelectedQuiz(found);
                  }}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-emerald-400"
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
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4 text-emerald-400" /> Thêm/Import Đề Thi LaTeX (.tex ex_test)
              </button>
            </div>

            <button
              onClick={() => handleCreateRoom(selectedQuiz)}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current" />
              TẠO SẢNH & MÃ QR ➔
            </button>
          </div>
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
        const accuracyPct = Math.round((correctCount / (player.totalAnswered || totalCount || 1)) * 100);

        return (
          <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center relative">
            <StudentAlertModal alertEvent={room.latestTeacherAlert} currentPlayerId={player.id} />

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

              <div className="grid grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="p-3 text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase">Tổng Điểm</div>
                  <div className="text-2xl font-black text-yellow-400 mt-1">{player.score.toLocaleString()}</div>
                </div>
                <div className="p-3 text-center border-x border-slate-800">
                  <div className="text-xs text-slate-400 font-bold uppercase">Đúng / Tổng</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{correctCount} / {totalCount}</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase">Tỷ Lệ Đúng</div>
                  <div className="text-2xl font-black text-cyan-400 mt-1">{accuracyPct}%</div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-4xl">
              <LiveLeaderboard players={room.players} attacks={room.attacks} isFinal={false} />
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
            onAnswerSubmit={handleAnswerSubmit}
            onAutoNext={handleStudentNextQuestion}
          />

          <BattleActionModal
            attacker={player}
            opponents={opponents}
            isOpen={showPowerUpModal}
            powerUpType={player.unlockedPowerUp}
            onExecutePowerUp={handleExecutePowerUp}
            onClose={() => setShowPowerUpModal(false)}
            onNextQuestion={handleStudentNextQuestion}
          />

          <StudentAlertModal alertEvent={room.latestTeacherAlert} currentPlayerId={player.id} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center">
        <StudentAlertModal
          alertEvent={room.latestTeacherAlert}
          currentPlayerId={player.id}
        />
        <LiveLeaderboard
          players={room.players}
          attacks={room.attacks}
          isFinal={room.phase === 'FINISHED'}
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
                onClick={() => setShowTeacherAlertModal(true)}
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

                  const accuracyPct = (p.totalAnswered || 0) > 0
                    ? Math.round(((p.correctCount || 0) / p.totalAnswered!) * 100)
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
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-base text-white">{p.name}</h4>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-gradient-to-r ${tier.bgGradient} text-white shadow-sm flex items-center gap-1`}>
                                <span>{tier.icon}</span>
                                <span>{tier.name}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
                              <span>🎯 Đúng {p.correctCount || 0}/{p.totalAnswered || 0} câu ({accuracyPct}%)</span>
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

                        <button
                          onClick={() => setShowTeacherAlertModal(true)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer shrink-0"
                        >
                          📢 Cảnh báo
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
          onNextQuestion={handleNextQuestion}
          onOpenTeacherAlert={() => setShowTeacherAlertModal(true)}
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
        />
      </div>
    );
  }

  return null;
}
