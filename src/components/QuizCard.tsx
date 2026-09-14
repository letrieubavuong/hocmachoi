import React, { useState, useEffect } from 'react';
import { Question, Player } from '../types';
import { soundManager } from '../services/audio';
import { MathRenderer } from './MathRenderer';
import { getRankTier } from '../data/rankAssets';
import { Flame, Shield, Clock, CheckCircle2, XCircle, Zap, Gauge } from 'lucide-react';

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  player?: Player;
  onAnswerSubmit: (selectedIndex: number, isCorrect: boolean, timeSpentSec: number) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  player,
  onAnswerSubmit,
}) => {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit || 20);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastEarnedScore, setLastEarnedScore] = useState<{
    base: number;
    speedBonus: number;
    multiplier: number;
    total: number;
    speedRating: string;
  } | null>(null);

  useEffect(() => {
    setTimeLeft(question.timeLimit || 20);
    setSelectedOption(null);
    setIsAnswered(false);
    setLastEarnedScore(null);
  }, [question]);

  useEffect(() => {
    if (isAnswered) return;
    if (timeLeft <= 0) {
      handleSelect(-1);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswered]);

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(index);

    const isCorrect = index === question.correctIndex;
    const timeSpent = (question.timeLimit || 20) - timeLeft;

    let speedBonus = 0;
    let speedRating = 'Thường';
    if (timeSpent <= 3) {
      speedBonus = 150;
      speedRating = '⚡ TỐC ĐỘ SIÊU THẦN! (+150 PT)';
    } else if (timeSpent <= 6) {
      speedBonus = 100;
      speedRating = '🚀 TỐC ĐỘ ÁNH SÁNG! (+100 PT)';
    } else if (timeSpent <= 10) {
      speedBonus = 50;
      speedRating = '💨 TỐC ĐỘ NHANH NHẸN (+50 PT)';
    }

    const basePoints = question.points || 100;
    const multiplier = player && player.streak >= 2 ? 1.5 : 1;
    const totalEarned = isCorrect ? Math.round((basePoints + speedBonus) * multiplier) : 0;

    if (isCorrect) {
      soundManager.playCorrect();
      setLastEarnedScore({
        base: basePoints,
        speedBonus,
        multiplier,
        total: totalEarned,
        speedRating,
      });
    } else {
      soundManager.playWrong();
    }

    onAnswerSubmit(index, isCorrect, timeSpent);
  };

  const optionColors = [
    'from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border-red-400',
    'from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border-blue-400',
    'from-amber-600 to-yellow-700 hover:from-amber-500 hover:to-yellow-600 border-yellow-400',
    'from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 border-green-400',
  ];

  const optionLabels = ['A', 'B', 'C', 'D'];
  const timerPercent = (timeLeft / (question.timeLimit || 20)) * 100;
  const currentRank = player ? getRankTier(player.score) : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Question Header & Player Stats & Lien Quan Rank */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg gap-3">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-600/30 text-purple-300 border border-purple-500/50 rounded-xl font-black text-sm">
            Câu {questionNumber} / {totalQuestions}
          </span>
          {player && currentRank && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r ${currentRank.bgGradient} text-white shadow-md flex items-center gap-1`}>
                <span>{currentRank.icon}</span>
                <span>{currentRank.name}</span>
              </span>
              <span className="text-yellow-400 font-extrabold text-sm">{player.score} PT</span>
              {player.streak > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-black text-xs bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
                  <Flame className="w-3.5 h-3.5" /> {player.streak}
                </span>
              )}
              {player.shieldActive && (
                <span className="flex items-center gap-1 text-cyan-400 font-black text-xs bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/30">
                  <Shield className="w-3.5 h-3.5" /> Khiên
                </span>
              )}
            </div>
          )}
        </div>

        {/* Speed Timer & Live Speed Rating Bar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 animate-pulse">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Đua Tốc Độ Nhanh = Thưởng Điểm Cao!</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-red-400 animate-ping' : 'text-slate-400'}`} />
            <span className={`font-black text-2xl font-mono ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Countdown Timer Progress Bar */}
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-400 via-amber-500 to-pink-500'
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-purple-500/30 shadow-2xl text-center relative overflow-hidden">
        <h2 className="text-2xl md:text-3xl font-black text-white leading-relaxed mb-6">
          <MathRenderer text={question.questionText} />
        </h2>

        {/* 4 Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrectOption = idx === question.correctIndex;
            let cardStateStyle = optionColors[idx % optionColors.length];

            if (isAnswered) {
              if (isCorrectOption) {
                cardStateStyle = 'from-emerald-500 to-green-600 border-emerald-300 ring-4 ring-emerald-400/50 scale-102';
              } else if (isSelected && !isCorrectOption) {
                cardStateStyle = 'from-rose-700 to-red-800 opacity-60 border-red-500';
              } else {
                cardStateStyle = 'from-slate-800 to-slate-900 opacity-40 border-slate-700';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelect(idx)}
                className={`relative flex items-center p-5 rounded-2xl bg-gradient-to-r ${cardStateStyle} border-2 text-white font-extrabold text-left transition-all duration-200 shadow-xl active:scale-95 cursor-pointer disabled:cursor-default`}
              >
                <span className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center font-black text-lg mr-4 border border-white/20 shrink-0">
                  {optionLabels[idx]}
                </span>
                <span className="text-lg md:text-xl flex-1 pr-6">
                  <MathRenderer text={option} />
                </span>

                {isAnswered && isCorrectOption && (
                  <CheckCircle2 className="w-7 h-7 text-white absolute right-4" />
                )}
                {isAnswered && isSelected && !isCorrectOption && (
                  <XCircle className="w-7 h-7 text-red-200 absolute right-4" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Speed Bonus & Instant Result Feedback Banner */}
      {isAnswered && (
        <div className={`p-5 rounded-2xl text-center font-black border space-y-2 animate-bounce ${
          selectedOption === question.correctIndex 
            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
            : 'bg-rose-600/30 border-rose-500 text-rose-300'
        }`}>
          {selectedOption === question.correctIndex ? (
            <div className="space-y-1">
              <span className="text-xl block">🎉 CHÍNH XÁC HOÀN HẢO!</span>
              {lastEarnedScore && (
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/40 text-yellow-300">
                  <span className="flex items-center gap-1 text-amber-400 font-extrabold">
                    <Gauge className="w-4 h-4" /> {lastEarnedScore.speedRating}
                  </span>
                  <span>•</span>
                  <span>Cơ bản: {lastEarnedScore.base}pt</span>
                  <span>+</span>
                  <span>Tốc độ: +{lastEarnedScore.speedBonus}pt</span>
                  {lastEarnedScore.multiplier > 1 && (
                    <>
                      <span>x</span>
                      <span className="text-amber-400 font-extrabold">Chuỗi {lastEarnedScore.multiplier}x</span>
                    </>
                  )}
                  <span>=</span>
                  <span className="text-sm font-black text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-lg border border-yellow-400/50">
                    +{lastEarnedScore.total} Điểm!
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-lg block">❌ CHƯA CHÍNH XÁC! Hãy cố gắng tăng tốc ở câu tiếp theo!</span>
          )}

          {question.explanation && (
            <div className="text-xs font-semibold text-slate-300 pt-1 border-t border-slate-700/50">
              <MathRenderer text={question.explanation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
