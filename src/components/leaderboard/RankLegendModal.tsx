import React from 'react';
import { LIEN_QUAN_RANKS } from '../../data/rankAssets';
import { calculateEstimatedMaxQuizScore } from '../../utils/scoring';
import { Zap, X, Info } from 'lucide-react';

interface RankLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalQuestions: number;
}

export const RankLegendModal: React.FC<RankLegendModalProps> = ({
  isOpen,
  onClose,
  totalQuestions,
}) => {
  if (!isOpen) return null;

  const estimatedMaxScore = calculateEstimatedMaxQuizScore(totalQuestions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-black text-white">Hệ Thống Rank Liên Quân Quiz</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Thứ hạng Rank được tính dựa trên tỷ lệ điểm số bạn đạt được so với điểm tối đa của bộ câu hỏi ({totalQuestions} câu ~ ước tính {estimatedMaxScore} pt):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {LIEN_QUAN_RANKS.map((r) => {
            const reqScore = Math.round((estimatedMaxScore * r.percentThreshold) / 100);
            return (
              <div
                key={r.name}
                className="flex items-center justify-between p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-xl bg-gradient-to-r ${r.bgGradient} flex items-center justify-center text-sm shrink-0 shadow-md border border-white/20`}>
                    {r.icon}
                  </span>
                  <div>
                    <div className="font-extrabold text-sm text-white">{r.name}</div>
                    <div className="text-[10px] text-slate-400">{r.subTitle}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-yellow-400">{r.percentThreshold}%+</div>
                  <div className="text-[10px] text-slate-400">≥ {reqScore} pt</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Điểm số tăng khi trả lời đúng & nhanh. Sử dụng các kỹ năng cướp điểm, đóng băng hoặc dùng khiên để bảo vệ điểm số của bạn!
          </span>
        </div>
      </div>
    </div>
  );
};
