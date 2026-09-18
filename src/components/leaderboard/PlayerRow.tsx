import React, { useState } from 'react';
import { Player } from '../../types';
import { ChibiAvatar } from '../ChibiAvatar';
import { getRankTier } from '../../data/rankAssets';
import { Flame, Shield, AlertTriangle, Eye, Snowflake, UserX, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface PlayerRowProps {
  player: Player;
  rankIndex: number;
  totalQuestions: number;
  isHost?: boolean;
  onDeletePlayer?: (player: Player) => void;
}

export const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  rankIndex,
  totalQuestions,
  isHost = false,
  onDeletePlayer,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const rank = getRankTier(player.score, totalQuestions);

  const hasAlerts =
    player.isTabActive === false ||
    (player.tabSwitchCount || 0) > 0 ||
    (player.rapidGuessCount || 0) > 0;

  return (
    <div className="bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700/60 overflow-hidden transition-all">
      {/* Main Row Bar */}
      <div
        onClick={() => isHost && setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between p-2.5 sm:p-3.5 gap-2 ${
          isHost ? 'cursor-pointer select-none hover:bg-slate-800/90' : ''
        }`}
      >
        {/* Left Section: Rank Number | Avatar | Name & Code | Rank Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs sm:text-sm text-yellow-400 shrink-0">
            #{rankIndex + 1}
          </span>

          <ChibiAvatar customization={player.chibi} size="sm" isBouncing={false} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-white text-sm sm:text-base truncate">
                {player.name}
              </span>
              {isHost && player.studentCode && (
                <span className="px-1 py-0.2 bg-purple-950/80 border border-purple-500/40 text-purple-300 rounded text-[9px] sm:text-[10px] font-mono font-bold shrink-0">
                  {player.studentCode}
                </span>
              )}
            </div>

            {/* Rank Badge Subtitle */}
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black bg-gradient-to-r ${rank.bgGradient} text-white flex items-center gap-1 border border-white/20 shrink-0`}>
                <span>{rank.icon}</span>
                <span>{rank.name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Streak | Shield | Score | (Host Expand Arrow) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Active Streak */}
          {player.streak >= 2 && (
            <span className="flex items-center gap-0.5 text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20" title={`Chuỗi ${player.streak} câu đúng`}>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{player.streak}</span>
            </span>
          )}

          {/* Active Shield */}
          {player.shieldActive && (
            <span className="flex items-center gap-0.5 text-xs font-black text-cyan-400 bg-cyan-500/10 px-1.5 py-1 rounded-lg border border-cyan-500/20" title="Đang mở khiên bảo vệ">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
            </span>
          )}

          {/* Score */}
          <span className="text-base sm:text-lg font-black text-yellow-400 min-w-[60px] text-right">
            {player.score} <span className="text-xs text-yellow-500/80 font-normal">pt</span>
          </span>

          {/* Host Inspector Toggle Indicator */}
          {isHost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details Sub-Panel for Teacher / Host */}
      {isHost && isExpanded && (
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {player.isTabActive === false ? (
              <span className="px-2 py-0.5 rounded-lg font-bold bg-rose-600/30 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" /> Rời Màn Hình
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đang Tập Trung
              </span>
            )}

            {(player.tabSwitchCount || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-lg font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-400" /> Rời tab: {player.tabSwitchCount} lần
              </span>
            )}

            {(player.rapidGuessCount || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-lg font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <Snowflake className="w-3 h-3 text-cyan-300" /> Lô tô fast-guess: {player.rapidGuessCount} lần
              </span>
            )}
          </div>

          {onDeletePlayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePlayer(player);
              }}
              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold ml-auto"
            >
              <UserX className="w-3.5 h-3.5" /> Xóa Khỏi Phòng
            </button>
          )}
        </div>
      )}
    </div>
  );
};
