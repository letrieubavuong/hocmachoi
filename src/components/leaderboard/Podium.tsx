import React, { useState, useEffect } from 'react';
import { Player } from '../../types';
import { ChibiAvatar } from '../ChibiAvatar';
import { getRankTier } from '../../data/rankAssets';

interface PodiumProps {
  top1?: Player;
  top2?: Player;
  top3?: Player;
  totalQuestions: number;
  isFinal?: boolean;
}

export const Podium: React.FC<PodiumProps> = ({
  top1,
  top2,
  top3,
  totalQuestions,
  isFinal = false,
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const top1AvatarSize = isMobile ? 'md' : 'lg';
  const runnerUpAvatarSize = isMobile ? 'sm' : 'md';

  return (
    <div className={`grid grid-cols-3 gap-1.5 sm:gap-4 md:gap-6 items-end w-full max-w-full overflow-hidden ${isFinal ? 'pt-6 pb-6' : 'pt-6 pb-2'}`}>
      {/* Top 2 (Silver) */}
      <div className="flex flex-col items-center min-w-0">
        {top2 ? (
          <div className="flex flex-col items-center w-full min-w-0">
            {(() => {
              const rank = getRankTier(top2.score, totalQuestions);
              return (
                <div className="flex flex-col items-center text-center min-w-0 w-full px-1">
                  <span className={`px-1.5 sm:px-2 py-0.5 mb-1.5 rounded-lg text-[9px] sm:text-[10px] font-black bg-gradient-to-r ${rank.bgGradient} text-white shadow-sm flex items-center justify-center gap-1 max-w-full truncate`}>
                    <span>{rank.icon}</span>
                    <span className="hidden sm:inline truncate">{rank.name}</span>
                  </span>
                  <ChibiAvatar customization={top2.chibi} size={runnerUpAvatarSize} showName={true} name={top2.name} streak={top2.streak} shieldActive={top2.shieldActive} />
                </div>
              );
            })()}
            <div className="w-full mt-2 bg-slate-800 border-t-4 border-slate-400 p-1.5 sm:p-3 rounded-t-2xl text-center shadow-lg min-w-0">
              <span className="text-sm sm:text-2xl font-black text-slate-300 block truncate">🥈 2ND</span>
              <span className="text-[11px] sm:text-sm font-extrabold text-yellow-400 block truncate">{top2.score} pt</span>
            </div>
          </div>
        ) : (
          <div className="h-24 sm:h-28 w-full bg-slate-800/30 rounded-t-2xl border-t-4 border-slate-700" />
        )}
      </div>

      {/* Top 1 (Gold - Champion) */}
      <div className="flex flex-col items-center min-w-0">
        {top1 ? (
          <div className="flex flex-col items-center w-full min-w-0">
            {(() => {
              const rank = getRankTier(top1.score, totalQuestions);
              return (
                <div className="flex flex-col items-center text-center min-w-0 w-full px-1">
                  <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 mb-1.5 rounded-xl text-[10px] sm:text-xs font-black bg-gradient-to-r ${rank.bgGradient} text-white shadow-md flex items-center justify-center gap-1 border border-yellow-300/40 max-w-full truncate`}>
                    <span>{rank.icon}</span>
                    <span className="truncate">{rank.name}</span>
                  </span>
                  <ChibiAvatar customization={top1.chibi} size={top1AvatarSize} showName={true} name={top1.name} streak={top1.streak} shieldActive={top1.shieldActive} />
                </div>
              );
            })()}
            <div className="w-full mt-2 bg-gradient-to-b from-amber-500/30 to-amber-600/50 border-t-4 border-yellow-400 p-2 sm:p-4 rounded-t-2xl text-center shadow-xl min-w-0">
              <span className="text-base sm:text-3xl font-black text-yellow-400 block truncate">🥇 1ST</span>
              <span className="text-xs sm:text-base font-black text-yellow-300 block truncate">{top1.score} pt</span>
            </div>
          </div>
        ) : (
          <div className="h-28 sm:h-36 w-full bg-slate-800/30 rounded-t-2xl border-t-4 border-yellow-500/40" />
        )}
      </div>

      {/* Top 3 (Bronze) */}
      <div className="flex flex-col items-center min-w-0">
        {top3 ? (
          <div className="flex flex-col items-center w-full min-w-0">
            {(() => {
              const rank = getRankTier(top3.score, totalQuestions);
              return (
                <div className="flex flex-col items-center text-center min-w-0 w-full px-1">
                  <span className={`px-1.5 sm:px-2 py-0.5 mb-1.5 rounded-lg text-[9px] sm:text-[10px] font-black bg-gradient-to-r ${rank.bgGradient} text-white shadow-sm flex items-center justify-center gap-1 max-w-full truncate`}>
                    <span>{rank.icon}</span>
                    <span className="hidden sm:inline truncate">{rank.name}</span>
                  </span>
                  <ChibiAvatar customization={top3.chibi} size={runnerUpAvatarSize} showName={true} name={top3.name} streak={top3.streak} shieldActive={top3.shieldActive} />
                </div>
              );
            })()}
            <div className="w-full mt-2 bg-slate-800 border-t-4 border-amber-700 p-1.5 sm:p-3 rounded-t-2xl text-center shadow-lg min-w-0">
              <span className="text-sm sm:text-2xl font-black text-amber-500 block truncate">🥉 3RD</span>
              <span className="text-[11px] sm:text-sm font-extrabold text-yellow-400 block truncate">{top3.score} pt</span>
            </div>
          </div>
        ) : (
          <div className="h-20 sm:h-24 w-full bg-slate-800/30 rounded-t-2xl border-t-4 border-slate-700" />
        )}
      </div>
    </div>
  );
};
