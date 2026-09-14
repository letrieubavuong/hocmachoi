import React, { useEffect } from 'react';
import { Player, AttackEvent } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { Trophy, Shield, Flame, Swords, Medal } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../services/audio';

interface LiveLeaderboardProps {
  players: Record<string, Player>;
  attacks?: AttackEvent[];
  isFinal?: boolean;
  onNextQuestion?: () => void;
  isHost?: boolean;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  players,
  attacks = [],
  isFinal = false,
  onNextQuestion,
  isHost = false,
}) => {
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (isFinal) {
      soundManager.playFanfare();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [isFinal]);

  const top1 = sortedPlayers[0];
  const top2 = sortedPlayers[1];
  const top3 = sortedPlayers[2];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-400 flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
          {isFinal ? '🏆 BẢNG VINH DANH CHUNG CUỘC' : '⚡ BẢNG XẾP HẠNG THỜI GIAN THỰC'}
        </h2>
        <p className="text-sm text-slate-300">
          {isFinal ? 'Chúc mừng các học sinh xuất sắc nhất!' : 'Cập nhật điểm số và vị trí thứ hạng liên tục!'}
        </p>
      </div>

      {/* Top 3 Podium View for Final or Top Section */}
      <div className="grid grid-cols-3 gap-3 md:gap-6 items-end pt-8 pb-4">
        {/* Top 2 Silver */}
        <div className="flex flex-col items-center">
          {top2 ? (
            <div className="flex flex-col items-center animate-fade-in">
              <ChibiAvatar customization={top2.chibi} size="md" showName={true} name={top2.name} streak={top2.streak} shieldActive={top2.shieldActive} />
              <div className="w-full mt-3 bg-slate-800 border-t-4 border-slate-400 p-3 rounded-t-2xl text-center shadow-lg">
                <span className="text-2xl font-black text-slate-300 block">🥈 2ND</span>
                <span className="text-sm font-extrabold text-yellow-400">{top2.score} điểm</span>
              </div>
            </div>
          ) : (
            <div className="h-32 w-full bg-slate-800/40 rounded-t-2xl border-t-4 border-slate-700" />
          )}
        </div>

        {/* Top 1 Gold (Tallest) */}
        <div className="flex flex-col items-center">
          {top1 ? (
            <div className="flex flex-col items-center animate-bounce-slow">
              <ChibiAvatar customization={top1.chibi} size="lg" showName={true} name={top1.name} streak={top1.streak} shieldActive={top1.shieldActive} />
              <div className="w-full mt-3 bg-gradient-to-b from-amber-500/30 to-amber-600/50 border-t-4 border-yellow-400 p-4 rounded-t-2xl text-center shadow-2xl">
                <span className="text-3xl font-black text-yellow-400 block">🥇 1ST</span>
                <span className="text-base font-black text-yellow-300">{top1.score} điểm</span>
              </div>
            </div>
          ) : (
            <div className="h-44 w-full bg-slate-800/40 rounded-t-2xl border-t-4 border-yellow-500/50" />
          )}
        </div>

        {/* Top 3 Bronze */}
        <div className="flex flex-col items-center">
          {top3 ? (
            <div className="flex flex-col items-center animate-fade-in">
              <ChibiAvatar customization={top3.chibi} size="md" showName={true} name={top3.name} streak={top3.streak} shieldActive={top3.shieldActive} />
              <div className="w-full mt-3 bg-slate-800 border-t-4 border-amber-700 p-3 rounded-t-2xl text-center shadow-lg">
                <span className="text-2xl font-black text-amber-500 block">🥉 3RD</span>
                <span className="text-sm font-extrabold text-yellow-400">{top3.score} điểm</span>
              </div>
            </div>
          ) : (
            <div className="h-28 w-full bg-slate-800/40 rounded-t-2xl border-t-4 border-slate-700" />
          )}
        </div>
      </div>

      {/* Full Leaderboard List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Medal className="w-4 h-4 text-purple-400" />
          Danh Sách Chi Tiết Vị Trí
        </h3>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-sm text-yellow-400">
                  #{idx + 1}
                </span>
                <ChibiAvatar customization={player.chibi} size="sm" isBouncing={false} />
                <span className="font-extrabold text-white text-base">{player.name}</span>
              </div>

              <div className="flex items-center gap-3">
                {player.streak >= 2 && (
                  <span className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    <Flame className="w-3.5 h-3.5" /> {player.streak}
                  </span>
                )}
                {player.shieldActive && (
                  <span className="flex items-center gap-1 text-xs font-black text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                    <Shield className="w-3.5 h-3.5" /> Khiên
                  </span>
                )}
                <span className="text-lg font-black text-yellow-400 min-w-[70px] text-right">
                  {player.score} pt
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Realtime Battle Attack Log Feed */}
      {attacks.length > 0 && (
        <div className="bg-slate-950/80 border border-purple-500/20 p-4 rounded-2xl space-y-2">
          <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Swords className="w-4 h-4" /> Nhật Ký Đấu Tranh Tấn Công
          </span>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar text-xs">
            {attacks.map((att) => (
              <div key={att.id} className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-slate-300">
                {att.blocked ? (
                  <span className="text-cyan-300">
                    🛡️ <strong className="text-white">{att.targetName}</strong> đã dùng khiên chặn thành công cú đánh từ <strong>{att.attackerName}</strong>!
                  </span>
                ) : (
                  <span className="text-amber-300">
                    ⚔️ <strong className="text-white">{att.attackerName}</strong> đã đánh trúng <strong className="text-white">{att.targetName}</strong> và cướp +{att.stolenPoints} điểm!
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Host Controls for Next Step */}
      {isHost && onNextQuestion && !isFinal && (
        <button
          onClick={onNextQuestion}
          className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
        >
          TIẾP TỤC CÂU HỎI KẾ TIẾP ➔
        </button>
      )}
    </div>
  );
};
