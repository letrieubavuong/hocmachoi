import React, { useEffect } from 'react';
import { Player, AttackEvent } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { getRankTier, LIEN_QUAN_RANKS } from '../data/rankAssets';
import { Trophy, Shield, Flame, Swords, Medal, Zap, Sparkles, AlertTriangle, Eye, CheckCircle2, Users, Megaphone, Snowflake } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../services/audio';

interface LiveLeaderboardProps {
  players: Record<string, Player>;
  attacks?: AttackEvent[];
  isFinal?: boolean;
  onNextQuestion?: () => void;
  isHost?: boolean;
  onOpenTeacherAlert?: () => void;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  players,
  attacks = [],
  isFinal = false,
  onNextQuestion,
  isHost = false,
  onOpenTeacherAlert,
}) => {
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  const totalQuestions = 5; // Default reference questions count for rank threshold calculation

  const totalStudents = sortedPlayers.length;
  const awayStudents = sortedPlayers.filter((p) => p.isTabActive === false).length;
  const focusedStudents = totalStudents - awayStudents;
  const warnedStudents = sortedPlayers.filter((p) => (p.tabSwitchCount || 0) > 0).length;

  useEffect(() => {
    if (isFinal) {
      soundManager.playFanfare();
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.55 },
      });
    }
  }, [isFinal]);

  const top1 = sortedPlayers[0];
  const top2 = sortedPlayers[1];
  const top3 = sortedPlayers[2];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Title & Rank Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-yellow-300 font-extrabold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
          <span>Hệ Thống Rank Đấu Trường Theo Tỷ Lệ Đề Thi</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 flex items-center justify-center gap-3">
          <Trophy className="w-9 h-9 text-yellow-400 animate-bounce" />
          {isFinal ? '🏆 BẢNG VINH DANH CAO THỦ' : '⚡ BẢNG XẾP HẠNG THỜI GIAN THỰC'}
        </h2>
        <p className="text-xs md:text-sm text-slate-300">
          {isFinal ? 'Chúc mừng các Cao Thủ xuất sắc nhất mùa giải!' : 'Đua tốc độ làm bài & Tích điểm thăng hạng Lien Quan!'}
        </p>
      </div>

      {/* Teacher Anti-Cheat Monitoring Bar (Real-time Tab Tracker) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-black text-white uppercase tracking-wider">Giám Sát Trực Tuyến & Chống Gian Lận</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <span className="px-3 py-1 bg-slate-800 rounded-xl text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" /> Sĩ Số: <strong className="text-white font-extrabold">{totalStudents}</strong>
          </span>
          <span className="px-3 py-1 bg-emerald-600/20 rounded-xl text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đang Tập Trung: <strong className="text-white font-extrabold">{focusedStudents}</strong>
          </span>
          {awayStudents > 0 && (
            <span className="px-3 py-1 bg-rose-600/30 rounded-xl text-rose-300 border border-rose-500/50 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> 🔴 Rời Tab: <strong className="text-white font-extrabold">{awayStudents}</strong>
            </span>
          )}
          {warnedStudents > 0 && (
            <span className="px-3 py-1 bg-amber-500/20 rounded-xl text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> ⚠️ Cảnh Báo Chuyển Tab: <strong className="text-white font-extrabold">{warnedStudents} HS</strong>
            </span>
          )}

          {isHost && onOpenTeacherAlert && (
            <button
              onClick={onOpenTeacherAlert}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <Megaphone className="w-4 h-4 animate-bounce" /> 📢 Gửi Cảnh Báo Học Sinh
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Podium View with Lien Quan Rank Frames */}
      <div className="grid grid-cols-3 gap-3 md:gap-6 items-end pt-8 pb-4">
        {/* Top 2 Silver */}
        <div className="flex flex-col items-center">
          {top2 ? (
            <div className="flex flex-col items-center animate-fade-in w-full">
              {(() => {
                const rank = getRankTier(top2.score, totalQuestions);
                return (
                  <div className="flex flex-col items-center">
                    <span className={`px-2 py-0.5 mb-2 rounded-lg text-[10px] font-black bg-gradient-to-r ${rank.bgGradient} text-white shadow-md flex items-center gap-1`}>
                      <span>{rank.icon}</span>
                      <span>{rank.name}</span>
                    </span>
                    <ChibiAvatar customization={top2.chibi} size="md" showName={true} name={top2.name} streak={top2.streak} shieldActive={top2.shieldActive} />
                  </div>
                );
              })()}
              <div className="w-full mt-3 bg-slate-800 border-t-4 border-slate-400 p-3 rounded-t-2xl text-center shadow-lg">
                <span className="text-2xl font-black text-slate-300 block">🥈 2ND</span>
                <span className="text-sm font-extrabold text-yellow-400">{top2.score} PT</span>
              </div>
            </div>
          ) : (
            <div className="h-32 w-full bg-slate-800/40 rounded-t-2xl border-t-4 border-slate-700" />
          )}
        </div>

        {/* Top 1 Gold (Tallest Podium with Grandmaster Flame) */}
        <div className="flex flex-col items-center">
          {top1 ? (
            <div className="flex flex-col items-center animate-bounce-slow w-full">
              {(() => {
                const rank = getRankTier(top1.score, totalQuestions);
                return (
                  <div className="flex flex-col items-center">
                    <span className={`px-3 py-1 mb-2 rounded-xl text-xs font-black bg-gradient-to-r ${rank.bgGradient} text-white shadow-xl flex items-center gap-1.5 animate-pulse`}>
                      <span className="text-sm">{rank.icon}</span>
                      <span>{rank.name}</span>
                    </span>
                    <ChibiAvatar customization={top1.chibi} size="lg" showName={true} name={top1.name} streak={top1.streak} shieldActive={top1.shieldActive} />
                  </div>
                );
              })()}
              <div className="w-full mt-3 bg-gradient-to-b from-amber-500/30 to-amber-600/50 border-t-4 border-yellow-400 p-4 rounded-t-2xl text-center shadow-2xl">
                <span className="text-3xl font-black text-yellow-400 block">🥇 1ST</span>
                <span className="text-base font-black text-yellow-300">{top1.score} PT</span>
              </div>
            </div>
          ) : (
            <div className="h-44 w-full bg-slate-800/40 rounded-t-2xl border-t-4 border-yellow-500/50" />
          )}
        </div>

        {/* Top 3 Bronze */}
        <div className="flex flex-col items-center">
          {top3 ? (
            <div className="flex flex-col items-center animate-fade-in w-full">
              {(() => {
                const rank = getRankTier(top3.score, totalQuestions);
                return (
                  <div className="flex flex-col items-center">
                    <span className={`px-2 py-0.5 mb-2 rounded-lg text-[10px] font-black bg-gradient-to-r ${rank.bgGradient} text-white shadow-md flex items-center gap-1`}>
                      <span>{rank.icon}</span>
                      <span>{rank.name}</span>
                    </span>
                    <ChibiAvatar customization={top3.chibi} size="md" showName={true} name={top3.name} streak={top3.streak} shieldActive={top3.shieldActive} />
                  </div>
                );
              })()}
              <div className="w-full mt-3 bg-slate-800 border-t-4 border-amber-700 p-3 rounded-t-2xl text-center shadow-lg">
                <span className="text-2xl font-black text-amber-500 block">🥉 3RD</span>
                <span className="text-sm font-extrabold text-yellow-400">{top3.score} PT</span>
              </div>
            </div>
          ) : (
            <div className="h-28 w-full bg-slate-800/40 rounded-t-2xl border-t-4 border-slate-700" />
          )}
        </div>
      </div>

      {/* Full Leaderboard List with Lien Quan Rank Badges */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Medal className="w-4 h-4 text-purple-400" />
          Danh Sách Bảng Xếp Hạng & Bậc Rank Đấu Trường
        </h3>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {sortedPlayers.map((player, idx) => {
            const rank = getRankTier(player.score, totalQuestions);
            return (
              <div
                key={player.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700/60 transition-all gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-sm text-yellow-400 shrink-0">
                    #{idx + 1}
                  </span>
                  <ChibiAvatar customization={player.chibi} size="sm" isBouncing={false} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-white text-base">{player.name}</span>
                      {player.studentCode && (
                        <span className="px-1.5 py-0.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 rounded text-[10px] font-mono font-bold">
                          {player.studentCode}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{rank.subTitle}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                  {/* Tab Status Monitoring Badges */}
                  {player.isTabActive === false ? (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-600/30 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> 🔴 Rời Màn Hình
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 🟢 Tập Trung
                    </span>
                  )}

                  {(player.tabSwitchCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1" title="Số lần chuyển tab / rời màn hình">
                      <Eye className="w-3 h-3 text-amber-400" /> ⚠️ Rời tab: {player.tabSwitchCount} lần
                    </span>
                  )}

                  {(player.rapidGuessCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1" title="Số lần chọn lụi / lô tô đáp án quá nhanh (dưới 2s)">
                      <Snowflake className="w-3 h-3 text-cyan-300" /> 🎲 Lô tô: {player.rapidGuessCount} lần (Đóng băng 10s)
                    </span>
                  )}

                  {/* Lien Quan Rank Badge */}
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r ${rank.bgGradient} text-white shadow-md flex items-center gap-1 border border-white/20`}>
                    <span>{rank.icon}</span>
                    <span>{rank.name}</span>
                  </span>

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
            );
          })}
        </div>
      </div>

      {/* Lien Quan Rank Tiers Legend Ribbon */}
      <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-yellow-400" /> Tỷ Lệ Phần Trăm Leo Rank Đấu Trường Liên Quan Quiz
        </span>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          {LIEN_QUAN_RANKS.map((r) => (
            <div
              key={r.name}
              className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] bg-gradient-to-r ${r.bgGradient} text-white shadow-sm flex items-center gap-1 border border-white/20`}
            >
              <span>{r.icon}</span>
              <span>{r.name} ({r.percentThreshold}%+)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Realtime Battle Attack Log Feed */}
      {attacks.length > 0 && (
        <div className="bg-slate-950/80 border border-purple-500/20 p-4 rounded-2xl space-y-2">
          <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Swords className="w-4 h-4" /> Nhật Ký Đấu Tranh Tấn Công & Thẻ Thưởng
          </span>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar text-xs">
            {attacks.map((att) => (
              <div key={att.id} className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-slate-300">
                {att.powerUpType === 'FREEZE' ? (
                  <span className="text-cyan-300">
                    ❄️ <strong className="text-white">{att.attackerName}</strong> đã đóng băng màn hình của <strong>{att.targetName}</strong> trong 6s!
                  </span>
                ) : att.powerUpType === 'MYSTERY_BOX' ? (
                  <span className="text-yellow-300">
                    🎁 <strong className="text-white">{att.attackerName}</strong> đã trúng rương kho báu ngẫu nhiên!
                  </span>
                ) : att.blocked ? (
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
