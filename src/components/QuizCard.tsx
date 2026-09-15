import React, { useState, useEffect } from 'react';
import { Question, Player } from '../types';
import { soundManager } from '../services/audio';
import { MathRenderer } from './MathRenderer';
import { getRankTier } from '../data/rankAssets';
import { Flame, Shield, Clock, CheckCircle2, XCircle, Zap, Gauge, Check, X, Send } from 'lucide-react';

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  player?: Player;
  onAnswerSubmit: (selectedIndex: number, isCorrect: boolean, timeSpentSec: number) => void;
  onAutoNext?: () => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  player,
  onAnswerSubmit,
  onAutoNext,
}) => {
  const [timeSpent, setTimeSpent] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  // 1. Multiple Choice state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // 2. True / False state (for 4 statements a, b, c, d)
  const [tfUserSelections, setTfUserSelections] = useState<Record<number, boolean>>({});

  // 3. Short Answer state
  const [shortInput, setShortInput] = useState('');

  const [lastEarnedScore, setLastEarnedScore] = useState<{
    base: number;
    speedBonus: number;
    multiplier: number;
    total: number;
    speedRating: string;
  } | null>(null);

  const qType = question.type || 'MULTIPLE_CHOICE';

  useEffect(() => {
    setTimeSpent(0);
    setSelectedOption(null);
    setTfUserSelections({});
    setShortInput('');
    setIsAnswered(false);
    setLastEarnedScore(null);
  }, [question]);

  useEffect(() => {
    if (isAnswered) return;

    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered]);

  const triggerAutoNext = () => {
    if (onAutoNext) {
      setTimeout(() => {
        onAutoNext();
      }, 1400);
    }
  };

  // Submit Multiple Choice Answer -> Auto-advance after 1.4s!
  const handleSelectMC = (index: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(index);

    const isCorrect = index === question.correctIndex;
    evaluateAndSubmit(isCorrect, index);
    triggerAutoNext();
  };

  // Submit True / False (ChoiceTF) Answer -> Auto-advance after 1.4s!
  const handleToggleTF = (stmtIdx: number, val: boolean) => {
    if (isAnswered) return;
    setTfUserSelections((prev) => ({ ...prev, [stmtIdx]: val }));
  };

  const handleSubmitTF = () => {
    if (isAnswered) return;
    setIsAnswered(true);

    const targetTF = question.tfAnswers || [true, false, true, false];
    let correctCount = 0;
    question.options.forEach((_, idx) => {
      if (tfUserSelections[idx] === targetTF[idx]) {
        correctCount++;
      }
    });

    const isCorrect = correctCount === question.options.length;
    evaluateAndSubmit(isCorrect, 0);
    triggerAutoNext();
  };

  // Submit Short Answer (\shortans) -> Auto-advance after 1.4s!
  const handleSubmitShort = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswered || !shortInput.trim()) return;
    setIsAnswered(true);

    const userClean = shortInput.trim().toLowerCase().replace(/\s+/g, '');
    const targetClean = (question.shortAnswerText || '').trim().toLowerCase().replace(/\s+/g, '');
    const isCorrect = userClean === targetClean || (parseFloat(userClean) === parseFloat(targetClean));

    evaluateAndSubmit(isCorrect, 0);
    triggerAutoNext();
  };

  const evaluateAndSubmit = (isCorrect: boolean, selectedIdx: number) => {
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

    onAnswerSubmit(selectedIdx, isCorrect, timeSpent);
  };

  const formatTimeSpent = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const optionColors = [
    'from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border-red-400',
    'from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border-blue-400',
    'from-amber-600 to-yellow-700 hover:from-amber-500 hover:to-yellow-600 border-yellow-400',
    'from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 border-green-400',
  ];

  const optionLabels = ['A', 'B', 'C', 'D'];
  const stmtLabels = ['a)', 'b)', 'c)', 'd)'];
  const currentRank = player ? getRankTier(player.score) : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Question Header & Player Stats */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg gap-3">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-600/30 text-purple-300 border border-purple-500/50 rounded-xl font-black text-sm">
            Câu {questionNumber} / {totalQuestions}
          </span>
          <span className="px-2.5 py-0.5 bg-slate-800 text-yellow-400 border border-slate-700 rounded-lg text-xs font-bold">
            {qType === 'MULTIPLE_CHOICE' && 'Trắc Nghiệm 4 Lựa Chọn'}
            {qType === 'TRUE_FALSE' && 'Trắc Nghiệm Đúng / Sai (choiceTF)'}
            {qType === 'SHORT_ANSWER' && 'Trả Lời Ngắn (shortans)'}
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

        {/* Elapsed Stopwatch Timer */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="font-extrabold text-sm text-slate-200 font-mono">
            Thời gian: <span className="text-yellow-400">{formatTimeSpent(timeSpent)}</span>
          </span>
        </div>
      </div>

      {/* Quiz Overall Progress Bar */}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Main Question Body */}
      <div className="bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-purple-500/30 shadow-2xl text-center relative overflow-hidden space-y-6">
        <h2 className="text-2xl md:text-3xl font-black text-white leading-relaxed">
          <MathRenderer text={question.questionText} />
        </h2>

        {/* TYPE 1: MULTIPLE CHOICE (4 choices A, B, C, D) */}
        {qType === 'MULTIPLE_CHOICE' && (
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
                  onClick={() => handleSelectMC(idx)}
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
        )}

        {/* TYPE 2: TRUE / FALSE STATEMENTS (\choiceTF) */}
        {qType === 'TRUE_FALSE' && (
          <div className="space-y-4 text-left">
            <div className="space-y-3">
              {question.options.map((stmt, idx) => {
                const userVal = tfUserSelections[idx];
                const targetTF = question.tfAnswers || [true, false, true, false];
                const targetVal = targetTF[idx];

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2.5 py-1 bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-black shrink-0">
                        {stmtLabels[idx]}
                      </span>
                      <span className="text-sm font-bold text-white">
                        <MathRenderer text={stmt} />
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={isAnswered}
                        onClick={() => handleToggleTF(idx, true)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all ${
                          userVal === true
                            ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                      >
                        <Check className="w-4 h-4" /> ĐÚNG
                      </button>
                      <button
                        disabled={isAnswered}
                        onClick={() => handleToggleTF(idx, false)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all ${
                          userVal === false
                            ? 'bg-rose-600 text-white border-2 border-rose-400 shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                      >
                        <X className="w-4 h-4" /> SAI
                      </button>

                      {isAnswered && (
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                          userVal === targetVal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {targetVal ? 'Đáp án: ĐÚNG' : 'Đáp án: SAI'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!isAnswered && (
              <button
                disabled={Object.keys(tfUserSelections).length < question.options.length}
                onClick={handleSubmitTF}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-40 text-white font-black text-lg rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Send className="w-5 h-5" /> GỬI KẾT QUẢ ĐÚNG / SAI ➔
              </button>
            )}
          </div>
        )}

        {/* TYPE 3: SHORT ANSWER (\shortans) */}
        {qType === 'SHORT_ANSWER' && (
          <form onSubmit={handleSubmitShort} className="space-y-4 max-w-xl mx-auto">
            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-2 uppercase tracking-wider">
                Nhập kết quả / câu trả lời ngắn của bạn:
              </label>
              <input
                type="text"
                disabled={isAnswered}
                placeholder="Nhập con số hoặc đáp án (VD: 3.5)..."
                value={shortInput}
                onChange={(e) => setShortInput(e.target.value)}
                className="w-full px-6 py-4 bg-slate-950 border-2 border-purple-500/60 rounded-2xl text-center text-yellow-400 font-black text-2xl focus:outline-none focus:border-yellow-400 transition-all placeholder:text-sm placeholder:font-normal placeholder:text-slate-600"
              />
            </div>

            {!isAnswered ? (
              <button
                type="submit"
                disabled={!shortInput.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-black text-lg rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Send className="w-5 h-5" /> GỬI CÂU TRẢ LỜI NGẮN ➔
              </button>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-yellow-300">
                Đáp án chuẩn: <span className="text-white text-sm">{question.shortAnswerText}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Speed Bonus & Instant Result Feedback Banner */}
      {isAnswered && (
        <div className={`p-5 rounded-2xl text-center font-black border space-y-2 animate-bounce ${
          lastEarnedScore 
            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
            : 'bg-rose-600/30 border-rose-500 text-rose-300'
        }`}>
          {lastEarnedScore ? (
            <div className="space-y-1">
              <span className="text-xl block">🎉 CHÍNH XÁC HOÀN HẢO!</span>
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
              <span className="text-[11px] text-slate-400 block pt-1">⚡ Đang tự động chuyển sang câu tiếp theo...</span>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-lg block">❌ CHƯA CHÍNH XÁC!</span>
              <span className="text-[11px] text-slate-400 block">⚡ Đang tự động chuyển sang câu tiếp theo...</span>
            </div>
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
