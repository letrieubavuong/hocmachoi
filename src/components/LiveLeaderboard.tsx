import React, { useEffect, useState } from 'react';
import { Player, AttackEvent } from '../types';
import confetti from 'canvas-confetti';
import { soundManager } from '../services/audio';
import { Medal } from 'lucide-react';

import { LeaderboardHeader } from './leaderboard/LeaderboardHeader';
import { TeacherMonitor } from './leaderboard/TeacherMonitor';
import { Podium } from './leaderboard/Podium';
import { PlayerRow } from './leaderboard/PlayerRow';
import { BattleLog } from './leaderboard/BattleLog';
import { RankLegendModal } from './leaderboard/RankLegendModal';
import { ConfirmModal } from './leaderboard/ConfirmModal';

interface LiveLeaderboardProps {
  players: Record<string, Player>;
  attacks?: AttackEvent[];
  isFinal?: boolean;
  onNextQuestion?: () => void;
  isHost?: boolean;
  onOpenTeacherAlert?: () => void;
  onRemovePlayer?: (playerId: string) => void;
  totalQuestions?: number;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  players,
  attacks = [],
  isFinal = false,
  onNextQuestion,
  isHost = false,
  onOpenTeacherAlert,
  onRemovePlayer,
  totalQuestions = 5,
}) => {
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isRankLegendOpen, setIsRankLegendOpen] = useState(false);

  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);

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

  const handleConfirmDelete = () => {
    if (playerToDelete) {
      onRemovePlayer?.(playerToDelete.id);
      setPlayerToDelete(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Leaderboard Title & Header */}
      <LeaderboardHeader
        isFinal={isFinal}
        totalQuestions={totalQuestions}
        players={sortedPlayers}
        onOpenRankLegend={() => setIsRankLegendOpen(true)}
      />

      {/* Teacher Anti-Cheat Bar (Only rendered for Host) */}
      {isHost && (
        <TeacherMonitor
          players={sortedPlayers}
          onOpenTeacherAlert={onOpenTeacherAlert}
        />
      )}

      {/* Top 3 Podium View */}
      <Podium
        top1={top1}
        top2={top2}
        top3={top3}
        totalQuestions={totalQuestions}
        isFinal={isFinal}
      />

      {/* Full Leaderboard Race List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Medal className="w-4 h-4 text-purple-400" />
            Bảng Xếp Hạng Đấu Trường ({sortedPlayers.length} Học Sinh)
          </h3>
          {isHost && (
            <span className="text-[10px] text-slate-500 font-semibold italic hidden sm:inline">
              * Bấm vào học sinh để xem chi tiết giám sát
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {sortedPlayers.map((player, idx) => (
            <PlayerRow
              key={player.id}
              player={player}
              rankIndex={idx}
              totalQuestions={totalQuestions}
              isHost={isHost}
              onDeletePlayer={(p) => setPlayerToDelete(p)}
            />
          ))}
        </div>
      </div>

      {/* Collapsible Battle Attack Log Feed */}
      <BattleLog attacks={attacks} />

      {/* Host Controls for Next Step */}
      {isHost && onNextQuestion && !isFinal && (
        <button
          onClick={onNextQuestion}
          className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
        >
          TIẾP TỤC CÂU HỎI KẾ TIẾP ➔
        </button>
      )}

      {/* Rank Legend Modal */}
      <RankLegendModal
        isOpen={isRankLegendOpen}
        onClose={() => setIsRankLegendOpen(false)}
        totalQuestions={totalQuestions}
      />

      {/* Confirm Delete Player Modal */}
      <ConfirmModal
        isOpen={!!playerToDelete}
        playerName={playerToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPlayerToDelete(null)}
      />
    </div>
  );
};
