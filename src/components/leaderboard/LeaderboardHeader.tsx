import React from 'react';
import { Trophy, Info, Flame, Users, CheckCircle2, Award } from 'lucide-react';
import { Player } from '../../types';

interface LeaderboardHeaderProps {
  isFinal: boolean;
  totalQuestions: number;
  players: Player[];
  onOpenRankLegend: () => void;
}

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  isFinal,
  totalQuestions,
  players,
  onOpenRankLegend,
}) => {
  const totalStudents = players.length;
  const avgScore = totalStudents > 0 
    ? Math.round(players.reduce((acc, p) => acc + p.score, 0) / totalStudents)
    : 0;
  const maxStreak = players.reduce((max, p) => Math.max(max, p.streak || 0), 0);

  return (
    <div className="text-center space-y-3">
      {/* Top Tag & Rank Info Trigger */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onOpenRankLegend}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-yellow-300 font-bold text-xs transition-colors cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-yellow-400" />
          <span>Hệ Thống Rank ({totalQuestions} câu)</span>
        </button>
      </div>

      {/* Main Banner Title */}
      <div className="space-y-1">
        <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 flex items-center justify-center gap-2.5">
          <Trophy className={`w-8 h-8 text-yellow-400 ${isFinal ? 'animate-bounce' : ''}`} />
          {isFinal ? '🏆 BẢNG VINH DANH CAO THỦ' : '⚡ BẢNG XẾP HẠNG TRỰC TIẾP'}
        </h2>
        <p className="text-xs md:text-sm text-slate-300">
          {isFinal
            ? 'Chúc mừng các Cao Thủ xuất sắc nhất mùa giải Đấu Trường Quiz!'
            : 'Đua tốc độ làm bài & tích điểm thăng hạng Liên Quân!'}
        </p>
      </div>

      {/* Final Mode Summary Cards */}
      {isFinal && totalStudents > 0 && (
        <div className="grid grid-cols-3 gap-2.5 max-w-lg mx-auto pt-2">
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-purple-400" /> Sĩ Số
            </span>
            <span className="text-lg font-black text-white block mt-0.5">{totalStudents} HS</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-yellow-400" /> Trung Bình
            </span>
            <span className="text-lg font-black text-yellow-400 block mt-0.5">{avgScore} pt</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" /> Chuỗi Tốt Nhất
            </span>
            <span className="text-lg font-black text-rose-400 block mt-0.5">🔥 {maxStreak}</span>
          </div>
        </div>
      )}
    </div>
  );
};
