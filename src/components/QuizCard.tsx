import React, { useState, useEffect } from 'react';
import { Question, Player } from '../types';
import { soundManager } from '../services/audio';
import { Flame, Shield, Clock, CheckCircle2, XCircle } from 'lucide-react';

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
  const [timeLeft, setTimeLeft] = useState(question.timeLimit);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    setTimeLeft(question.timeLimit);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [question]);

  useEffect(() => {
    if (isAnswered) return;
    if (timeLeft <= 0) {
      handleSelect(-1); // Time out
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
    const timeSpent = question.timeLimit - timeLeft;

    if (isCorrect) {
      soundManager.playCorrect();
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

  const timerPercent = (timeLeft / question.timeLimit) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Question Header & Player Stats */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-600/30 text-purple-300 border border-purple-500/50 rounded-xl font-black text-sm">
            Câu {questionNumber} / {totalQuestions}
          </span>
          {player && (
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 font-extrabold text-base">{player.score} Điểm</span>
              {player.streak > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-black text-xs bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  <Flame className="w-3.5 h-3.5" /> {player.streak} Chuỗi
                </span>
              )}
              {player.shieldActive && (
                <span className="flex items-center gap-1 text-cyan-400 font-black text-xs bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  <Shield className="w-3.5 h-3.5" /> Có Khiên
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timer Bar & Badge */}
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-red-400 animate-ping' : 'text-slate-400'}`} />
          <span className={`font-black text-2xl font-mono ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Countdown Timer Progress Bar */}
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-purple-500/30 shadow-2xl text-center relative overflow-hidden">
        <h2 className="text-2xl md:text-3xl font-black text-white leading-relaxed mb-6">
          {question.questionText}
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
                <span className="text-lg md:text-xl flex-1 pr-6">{option}</span>

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

      {/* Instant Result Feedback Banner */}
      {isAnswered && (
        <div className={`p-4 rounded-2xl text-center font-black text-lg border animate-bounce ${
          selectedOption === question.correctIndex 
            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
            : 'bg-rose-600/30 border-rose-500 text-rose-300'
        }`}>
          {selectedOption === question.correctIndex ? (
            <span>🎉 CHÍNH XÁC! Bạn nhận được điểm thưởng + Chuỗi!</span>
          ) : (
            <span>❌ CHƯA CHÍNH XÁC! Hãy cố gắng ở câu tiếp theo!</span>
          )}
          {question.explanation && (
            <p className="text-xs font-semibold text-slate-300 mt-1">{question.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
};
