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
} from 'lucide-react';

export function App() {
  const [role, setRole] = useState<'HOME' | 'HOST' | 'PLAYER'>('HOME');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz>(SAMPLE_QUIZZES[0]);
  const [quizzesList, setQuizzesList] = useState<Quiz[]>(SAMPLE_QUIZZES);

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

  // Host: Go to Next Question or Final Leaderboard
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

  // Student: Submit Answer
  const handleAnswerSubmit = (selectedIndex: number, isCorrect: boolean, timeSpentSec: number) => {
    if (!room || !player) return;

    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    let scoreToAdd = 0;
    if (isCorrect && currentQ) {
      const speedBonus = Math.max(10, Math.round((currentQ.timeLimit - timeSpentSec) * 5));
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

  // Save new custom quiz from QuizCreatorModal
  const handleSaveQuiz = (newQuiz: Quiz) => {
    setQuizzesList([newQuiz, ...quizzesList]);
    setSelectedQuiz(newQuiz);
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
      const currentQ = room.quiz.questions[room.currentQuestionIndex] || {
        id: 'fallback-q',
        questionText: 'Đang tải câu hỏi...',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
      };
      const opponents = Object.values(room.players);

      return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center relative">
          <QuizCard
            question={currentQ}
            questionNumber={room.currentQuestionIndex + 1}
            totalQuestions={room.quiz.questions.length || 1}
            player={player}
            onAnswerSubmit={handleAnswerSubmit}
          />

          <BattleActionModal
            attacker={player}
            opponents={opponents}
            isOpen={showPowerUpModal}
            powerUpType={player.unlockedPowerUp}
            onExecutePowerUp={handleExecutePowerUp}
            onClose={() => setShowPowerUpModal(false)}
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
          </div>
          <ChibiLobby
            room={room}
            isHost={true}
            onStartGame={handleStartGame}
          />
        </div>
      );
    }

    if (room.phase === 'QUESTION') {
      const currentQ = room.quiz.questions[room.currentQuestionIndex];
      return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-between space-y-6">
          <div className="w-full max-w-4xl flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <span className="text-yellow-400 font-extrabold text-sm">
              MÃ PHÒNG (PIN): {room.roomCode}
            </span>
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-sm shadow-md"
            >
              Bảng Xếp Hạng / Câu Tiếp ➔
            </button>
          </div>

          {currentQ && (
            <QuizCard
              question={currentQ}
              questionNumber={room.currentQuestionIndex + 1}
              totalQuestions={room.quiz.questions.length}
              onAnswerSubmit={() => {}}
            />
          )}
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
        />
        <button
          onClick={handleResetHome}
          className="mt-8 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-2xl shadow-lg"
        >
          Kết Thúc Bài Test & Về Trang Chủ
        </button>
      </div>
    );
  }

  return null;
}
