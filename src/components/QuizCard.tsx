import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Question, Player } from '../types';
import { soundManager } from '../services/audio';
import { MathRenderer } from './MathRenderer';
import { getRankTier } from '../data/rankAssets';
import { calculateAnswerScore, evaluateShortAnswer, ScoreResult } from '../utils/scoring';
import { PowerUpEngine } from '../services/powerUpEngine';
import { Flame, Shield, Clock, CheckCircle2, XCircle, Zap, Send, Eye, Snowflake, Sparkles, Bomb, HelpCircle, AlertTriangle, Rocket } from 'lucide-react';

const AUTO_NEXT_DELAY_MS = 1500;

import { BattleSessionState } from '../types';

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  player?: Player;
  battleSessionState?: BattleSessionState;
  onAnswerSubmit: (selectedIndex: number, isCorrect: boolean, timeSpentSec: number) => { scoreEarned?: number; coinsEarned?: number } | void;
  onAutoNext?: () => void;
  onUnfreeze?: () => void;
  onSendInquiry?: (questionNumber: number, question: Question) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  player,
  battleSessionState,
  onAnswerSubmit,
  onAutoNext,
  onUnfreeze,
  onSendInquiry,
}) => {
  const [isAnswered, setIsAnswered] = useState(false);
  const [hasSentInquiry, setHasSentInquiry] = useState(false);
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [freezeSeconds, setFreezeSeconds] = useState(10);

  // Input states
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [tfUserSelections, setTfUserSelections] = useState<Record<number, boolean>>({});
  const [shortInput, setShortInput] = useState('');
  const [lastEarnedScore, setLastEarnedScore] = useState<ScoreResult | null>(null);
  const [lastEarnedCoins, setLastEarnedCoins] = useState<number | null>(null);

  // Refs for precise timing & double-submit locks
  const startTimeRef = useRef<number>(performance.now());
  const submitLockRef = useRef<boolean>(false);
  const autoNextFiredRef = useRef<boolean>(false);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unfreezeFiredRef = useRef<boolean>(false);

  const qType = question.type || 'MULTIPLE_CHOICE';

  // 1. Data Validation: Check if question data is valid before allowing answers
  const isQuestionDataValid = useMemo(() => {
    if (!question || !question.questionText) return false;

    if (qType === 'MULTIPLE_CHOICE') {
      return (
        Array.isArray(question.options) &&
        question.options.length >= 2 &&
        typeof question.correctIndex === 'number' &&
        question.correctIndex >= 0 &&
        question.correctIndex < question.options.length
      );
    } else if (qType === 'TRUE_FALSE') {
      return (
        Array.isArray(question.options) &&
        question.options.length >= 1
      );
    } else if (qType === 'SHORT_ANSWER') {
      return typeof question.shortAnswerText === 'string' && question.shortAnswerText.trim().length > 0;
    }
    return true;
  }, [question, qType]);

  // 2. 50:50 Oracle power-up: compute 2 wrong indices to hide deterministically
  const disabled5050Indices = useMemo(() => {
    if (!player?.oracle5050Active || qType !== 'MULTIPLE_CHOICE' || question.correctIndex === undefined) {
      return [];
    }
    return PowerUpEngine.getDeterministic5050Indices(question.id, player?.id || 'guest', question.correctIndex);
  }, [player?.oracle5050Active, player?.id, question.id, question.correctIndex, qType]);

  // Reset states strictly when question.id or questionNumber changes
  useEffect(() => {
    startTimeRef.current = performance.now();
    submitLockRef.current = false;
    autoNextFiredRef.current = false;
    unfreezeFiredRef.current = false;

    setSelectedOption(null);
    setTfUserSelections({});
    setShortInput('');
    setIsAnswered(false);
    setLastEarnedScore(null);
    setHasSentInquiry(false);
    setIsSendingInquiry(false);

    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  }, [question.id, questionNumber]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  // Timestamp-based Freeze timer handling (F5 resilient)
  useEffect(() => {
    if (!player?.isFrozen) {
      setFreezeSeconds(10);
      unfreezeFiredRef.current = false;
      return;
    }

    const calcRemaining = () => {
      if (player.freezeUntil) {
        return Math.max(0, Math.ceil((player.freezeUntil - Date.now()) / 1000));
      }
      return 10;
    };

    setFreezeSeconds(calcRemaining());
    const interval = setInterval(() => {
      const rem = calcRemaining();
      setFreezeSeconds(rem);
      if (rem <= 0) {
        clearInterval(interval);
        if (onUnfreeze && !unfreezeFiredRef.current) {
          unfreezeFiredRef.current = true;
          onUnfreeze();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.isFrozen, player?.freezeUntil, onUnfreeze]);

  // Auto Next Trigger
  const triggerAutoNext = () => {
    if (onAutoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => {
        if (!autoNextFiredRef.current) {
          autoNextFiredRef.current = true;
          onAutoNext();
        }
      }, AUTO_NEXT_DELAY_MS);
    }
  };

  const handleManualNext = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    if (!autoNextFiredRef.current && onAutoNext) {
      autoNextFiredRef.current = true;
      onAutoNext();
    }
  };

  // Core Evaluation & Submission
  const processSubmission = (isCorrect: boolean, selectedIdx: number) => {
    // Calculate exact elapsed seconds from high-precision timestamp
    const elapsedSecs = Math.max(1, Math.round((performance.now() - startTimeRef.current) / 1000));

    const scoreResult = calculateAnswerScore({
      basePoints: question.points || 100,
      timeSpentSec: elapsedSecs,
      isCorrect,
      streak: player?.streak || 0,
      doublePointsActive: player?.doublePointsActive,
    });

    if (isCorrect) {
      soundManager.playCorrect();
      setLastEarnedScore(scoreResult);
    } else {
      soundManager.playWrong();
      setLastEarnedScore(null);
      setLastEarnedCoins(null);
    }

    const res = onAnswerSubmit(selectedIdx, isCorrect, elapsedSecs);
    if (res && typeof res.coinsEarned === 'number') {
      setLastEarnedCoins(res.coinsEarned);
    } else {
      setLastEarnedCoins(null);
    }

    triggerAutoNext();
  };

  // Submit Multiple Choice Answer
  const handleSelectMC = (index: number) => {
    if (isAnswered || player?.isFrozen || submitLockRef.current || !isQuestionDataValid) return;
    submitLockRef.current = true;
    setIsAnswered(true);
    setSelectedOption(index);

    const isCorrect = index === question.correctIndex;
    processSubmission(isCorrect, index);
  };

  const submitTFAnswers = (selectionsToUse: Record<number, boolean>) => {
    if (isAnswered || player?.isFrozen || submitLockRef.current || !isQuestionDataValid) return;

    submitLockRef.current = true;
    setIsAnswered(true);

    const targetTF =
      Array.isArray(question.tfAnswers) && question.tfAnswers.length === question.options.length
        ? question.tfAnswers
        : question.options.map(() => true);

    let correctCount = 0;
    question.options.forEach((_, idx) => {
      if (selectionsToUse[idx] === targetTF[idx]) {
        correctCount++;
      }
    });

    const isCorrect = correctCount === question.options.length;
    processSubmission(isCorrect, 0);
  };

  // Toggle True/False Selection
  const handleToggleTF = (stmtIdx: number, val: boolean) => {
    if (isAnswered || player?.isFrozen || submitLockRef.current) return;
    const nextSelections = { ...tfUserSelections, [stmtIdx]: val };
    setTfUserSelections(nextSelections);

    // AUTO-SUBMIT: When student has selected True/False for all statements in this question!
    const totalCount = question.options?.length || 4;
    const answeredCount = question.options.filter((_, idx) => typeof nextSelections[idx] === 'boolean').length;

    if (answeredCount === totalCount && !isAnswered && !submitLockRef.current && isQuestionDataValid) {
      submitTFAnswers(nextSelections);
    }
  };

  // Submit True / False Answer (Manual button click)
  const handleSubmitTF = () => {
    submitTFAnswers(tfUserSelections);
  };

  // Submit Short Answer
  const handleSubmitShort = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswered || player?.isFrozen || submitLockRef.current || !shortInput.trim() || !isQuestionDataValid) return;

    submitLockRef.current = true;
    setIsAnswered(true);

    const isCorrect = evaluateShortAnswer(shortInput, question.shortAnswerText || '');
    processSubmission(isCorrect, 0);
  };

  // Inquiry handler
  const handleSendInquiryClick = () => {
    if (!onSendInquiry || hasSentInquiry || isSendingInquiry) return;
    setIsSendingInquiry(true);
    try {
      onSendInquiry(questionNumber, question);
      setHasSentInquiry(true);
    } catch (err) {
      console.error('[QuizCard] Failed to send inquiry:', err);
    } finally {
      setIsSendingInquiry(false);
    }
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
  const progressPct = totalQuestions > 0 ? Math.min(100, Math.max(0, (questionNumber / totalQuestions) * 100)) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* Question Header & Player Stats */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-lg gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="px-3 py-1 bg-purple-600/30 text-purple-300 border border-purple-500/50 rounded-xl font-black text-xs sm:text-sm shrink-0">
            Câu {questionNumber} / {totalQuestions}
          </span>
          <span className="px-2.5 py-1 bg-slate-800 text-yellow-400 border border-slate-700 rounded-lg text-xs font-bold shrink-0">
            {qType === 'MULTIPLE_CHOICE' && 'Trắc Nghiệm (\\choice)'}
            {qType === 'TRUE_FALSE' && 'Đúng / Sai (\\choiceTF)'}
            {qType === 'SHORT_ANSWER' && 'Trả Lời Ngắn (\\shortans)'}
          </span>
          {player && currentRank && (
            <div className="flex items-center gap-2 flex-wrap">
              {player.studentCode && (
                <span className="px-2.5 py-1 bg-purple-950/80 border border-purple-500/50 text-purple-300 rounded-xl text-xs font-mono font-bold shadow-sm">
                  🆔 {player.studentCode}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r ${currentRank.bgGradient} text-white shadow-md flex items-center gap-1`}>
                <span>{currentRank.icon}</span>
                <span>{currentRank.name}</span>
              </span>
              <span className="text-yellow-400 font-extrabold text-xs sm:text-sm">{player.score.toLocaleString()} PT</span>
              {player.streak > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-black text-xs bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {player.streak}
                </span>
              )}
              {player.shieldActive && (
                <span className="flex items-center gap-1 text-cyan-400 font-black text-xs bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" /> Khiên
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stopwatch Timer & Question Inquiry Button */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {onSendInquiry && (
            <button
              type="button"
              disabled={hasSentInquiry || isSendingInquiry}
              onClick={handleSendInquiryClick}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                hasSentInquiry
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 cursor-default'
                  : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-yellow-300 border-amber-400/40 hover:border-amber-400 active:scale-95'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>{hasSentInquiry ? '💬 Đã gửi thắc mắc' : '❓ Thắc mắc câu này'}</span>
            </button>
          )}

          <ElapsedTimer isAnswered={isAnswered} startTimeRef={startTimeRef} />
        </div>
      </div>

      {/* Quiz Progress Bar */}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Controlled Battle Phase Status Ribbon */}
      <ControlledBattleBanner battleSessionState={battleSessionState} />

      {/* Active Power-Up Ribbon */}
      <PowerUpRibbon player={player} qType={qType} />

      {/* Main Question Body */}
      <div className="bg-slate-800/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border-2 border-purple-500/30 shadow-2xl text-center relative overflow-hidden space-y-6">
        {/* Freeze Effect Overlay */}
        {player?.isFrozen && (
          <div className="absolute inset-0 z-40 bg-cyan-950/95 backdrop-blur-md rounded-3xl border-4 border-cyan-400 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-fade-in">
            <Snowflake className="w-14 h-14 text-cyan-300 animate-spin" />
            <h3 className="text-xl sm:text-2xl font-black text-white">❄️ MÀN HÌNH BỊ ĐÓNG BẰNG!</h3>
            <div className="text-2xl sm:text-3xl font-black text-cyan-300 bg-cyan-900/60 px-6 py-2 rounded-2xl border border-cyan-400/50 my-2 shadow-lg">
              Tự động tan băng sau: <span className="text-yellow-300 font-mono">{freezeSeconds}s</span>
            </div>
            <p className="text-xs text-cyan-200 max-w-md font-semibold bg-cyan-950/70 p-3 rounded-xl border border-cyan-500/30 shadow">
              {player?.freezeReason || 'Bạn bị đóng băng. Hãy kiên nhẫn đợi tan băng để tiếp tục thao tác!'}
            </p>
          </div>
        )}

        {/* Data Validation Failure Notice */}
        {!isQuestionDataValid ? (
          <div className="p-6 bg-rose-950/80 border-2 border-rose-500/80 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-black text-white">Dữ Liệu Câu Hỏi Không Hợp Lệ</h3>
            <p className="text-xs text-rose-200 max-w-md mx-auto">
              {qType === 'TRUE_FALSE' && 'Câu hỏi Đúng/Sai này chưa có đáp án chuẩn (tfAnswers). Vui lòng thông báo cho Giáo viên để cập nhật đề thi.'}
              {qType === 'MULTIPLE_CHOICE' && 'Câu hỏi Trắc nghiệm này chưa có đáp án đúng (correctIndex). Vui lòng thông báo cho Giáo viên để cập nhật đề thi.'}
              {qType === 'SHORT_ANSWER' && 'Câu hỏi Điền số này chưa có đáp án chuẩn (shortAnswerText). Vui lòng thông báo cho Giáo viên để cập nhật đề thi.'}
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-relaxed overflow-x-auto text-wrap break-words">
              <MathRenderer text={question.questionText} />
            </h2>

            {/* QTYPE 1: MULTIPLE CHOICE */}
            {qType === 'MULTIPLE_CHOICE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mt-4 sm:mt-5">
                {question.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectOption = idx === question.correctIndex;
                  const isDisabledBy5050 = disabled5050Indices.includes(idx);
                  let cardStateStyle = optionColors[idx % optionColors.length];

                  if (isDisabledBy5050) {
                    cardStateStyle = 'from-slate-900 to-slate-950 opacity-20 border-slate-800 pointer-events-none line-through';
                  } else if (isAnswered) {
                    if (isCorrectOption) {
                      cardStateStyle = 'from-emerald-500 to-green-600 border-emerald-300 ring-4 ring-emerald-400/50 scale-[1.01]';
                    } else if (isSelected && !isCorrectOption) {
                      cardStateStyle = 'from-rose-700 to-red-800 opacity-60 border-red-500';
                    } else {
                      cardStateStyle = 'from-slate-800 to-slate-900 opacity-40 border-slate-700';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={isAnswered || isDisabledBy5050 || player?.isFrozen}
                      onClick={() => handleSelectMC(idx)}
                      className={`relative flex items-center min-h-[52px] sm:min-h-[56px] px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r ${cardStateStyle} border-2 text-white font-bold text-left transition-all duration-150 shadow-md active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed h-auto w-full`}
                    >
                      <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/25 flex items-center justify-center font-black text-sm sm:text-base mr-2.5 sm:mr-3 border border-white/20 shrink-0">
                        {optionLabels[idx]}
                      </span>
                      <span className="text-sm sm:text-base md:text-lg font-bold leading-snug flex-1 min-w-0 pr-7 overflow-x-auto text-wrap break-words text-left">
                        <MathRenderer text={option} />
                      </span>

                      {isAnswered && isCorrectOption && (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white absolute right-2.5 sm:right-3 shrink-0" />
                      )}
                      {isAnswered && isSelected && !isCorrectOption && (
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-200 absolute right-2.5 sm:right-3 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* QTYPE 2: TRUE / FALSE (\choiceTF) */}
            {qType === 'TRUE_FALSE' && (
              <div className="space-y-4 text-left">
                <div className="space-y-3">
                  {question.options.map((stmt, idx) => {
                    const userVal = tfUserSelections[idx];
                    const targetTF = question.tfAnswers || [true, true, true, true];
                    const targetVal = targetTF[idx];

                    return (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 bg-slate-900/90 rounded-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="px-2.5 py-1 bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-black shrink-0 mt-0.5">
                            {stmtLabels[idx]}
                          </span>
                          <span className="text-sm font-bold text-white leading-relaxed overflow-x-auto text-wrap break-words">
                            <MathRenderer text={stmt} />
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            aria-label={`Mệnh đề ${stmtLabels[idx]} Đúng`}
                            disabled={isAnswered || player?.isFrozen}
                            onClick={() => handleToggleTF(idx, true)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed ${
                              userVal === true
                                ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-md'
                                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                            }`}
                          >
                            ĐÚNG
                          </button>
                          <button
                            type="button"
                            aria-label={`Mệnh đề ${stmtLabels[idx]} Sai`}
                            disabled={isAnswered || player?.isFrozen}
                            onClick={() => handleToggleTF(idx, false)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed ${
                              userVal === false
                                ? 'bg-rose-600 text-white border-2 border-rose-400 shadow-md'
                                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                            }`}
                          >
                            SAI
                          </button>

                          {isAnswered && (
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
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
                    type="button"
                    disabled={
                      player?.isFrozen ||
                      question.options.some((_, index) => typeof tfUserSelections[index] !== 'boolean')
                    }
                    onClick={handleSubmitTF}
                    className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-40 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 shrink-0" /> GỬI KẾT QUẢ ĐÚNG / SAI ➔
                  </button>
                )}
              </div>
            )}

            {/* QTYPE 3: SHORT ANSWER (\shortans) */}
            {qType === 'SHORT_ANSWER' && (
              <form onSubmit={handleSubmitShort} className="space-y-4 max-w-xl mx-auto">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-2 uppercase tracking-wider">
                    Nhập kết quả / câu trả lời ngắn của bạn:
                  </label>
                  <input
                    type="text"
                    disabled={isAnswered || player?.isFrozen}
                    placeholder="Nhập kết quả (VD: 3.5 hoặc -2)..."
                    value={shortInput}
                    onChange={(e) => setShortInput(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-950 border-2 border-purple-500/60 rounded-2xl text-center text-yellow-400 font-black text-xl sm:text-2xl focus:outline-none focus:border-yellow-400 transition-all placeholder:text-sm placeholder:font-normal placeholder:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                {!isAnswered ? (
                  <button
                    type="submit"
                    disabled={!shortInput.trim() || player?.isFrozen}
                    className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 shrink-0" /> GỬI CÂU TRẢ LỜI NGẮN ➔
                  </button>
                ) : (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-yellow-300">
                    Đáp án chuẩn: <span className="text-white text-sm">{question.shortAnswerText}</span>
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </div>

      {/* Speed Bonus & Instant Result Feedback Banner */}
      {isAnswered && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 sm:p-5 rounded-2xl text-center font-black border space-y-3 animate-fade-in ${
            lastEarnedScore
              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
              : 'bg-rose-600/30 border-rose-500 text-rose-300'
          }`}
        >
          {lastEarnedScore ? (
            <div className="space-y-2">
              <span className="text-lg sm:text-xl block">🎉 CHÍNH XÁC HOÀN HẢO!</span>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs bg-slate-950/70 p-3 rounded-xl border border-emerald-500/40 text-yellow-300">
                <span className="font-extrabold text-amber-400">{lastEarnedScore.speedRating}</span>
                <span>•</span>
                <span>Cơ bản: {lastEarnedScore.basePoints}pt</span>
                <span>+</span>
                <span>Tốc độ: +{lastEarnedScore.speedBonus}pt</span>

                {lastEarnedScore.effectiveMultiplier > 1 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-extrabold">
                      Hệ số ({lastEarnedScore.streakMultiplier > 1 ? `Chuỗi ${lastEarnedScore.streakMultiplier}x` : ''}
                      {lastEarnedScore.streakMultiplier > 1 && lastEarnedScore.doublePointsMultiplier > 1 ? ' + ' : ''}
                      {lastEarnedScore.doublePointsMultiplier > 1 ? 'X2 Điểm' : ''}): {lastEarnedScore.effectiveMultiplier}x
                    </span>
                  </>
                )}
                <span>=</span>
                <span className="text-sm font-black text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-lg border border-yellow-400/50">
                  +{lastEarnedScore.totalEarned} Điểm!
                </span>
                {typeof lastEarnedCoins === 'number' && lastEarnedCoins > 0 && (
                  <span className="text-sm font-black text-yellow-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-400/50 flex items-center gap-1 shadow-sm">
                    🪙 +{lastEarnedCoins} Xu
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-lg block">❌ CHƯA CHÍNH XÁC!</span>
            </div>
          )}

          {onAutoNext && (
            <div className="pt-1 flex items-center justify-center gap-3">
              <span className="text-[11px] text-slate-300 font-medium">Tự động chuyển câu tiếp theo sau 1.5s</span>
              <button
                type="button"
                onClick={handleManualNext}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                CÂU TIẾP THEO ➔
              </button>
            </div>
          )}

          {question.explanation && (
            <div className="text-xs font-semibold text-slate-300 pt-2 border-t border-slate-700/50 text-left">
              <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Lời giải / Giải thích:</span>
              <MathRenderer text={question.explanation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Sub-component: Elapsed Timer (Isolated to avoid re-rendering entire question text every second)
const ElapsedTimer: React.FC<{ isAnswered: boolean; startTimeRef: React.RefObject<number> }> = React.memo(({ isAnswered, startTimeRef }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isAnswered) return;

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.max(0, Math.floor((now - (startTimeRef.current || now)) / 1000));
      setSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnswered, startTimeRef]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
      <Clock className="w-4 h-4 text-purple-400 shrink-0" />
      <span className="font-extrabold text-xs sm:text-sm text-slate-200 font-mono">
        Thời gian: <span className="text-yellow-400">{formatTime(seconds)}</span>
      </span>
    </div>
  );
});

ElapsedTimer.displayName = 'ElapsedTimer';

// Sub-component: Power-Up Ribbon Display
const PowerUpRibbon: React.FC<{ player?: Player; qType: string }> = React.memo(({ player, qType }) => {
  if (
    !player?.doublePointsActive &&
    !player?.oracle5050Active &&
    !player?.reflectShieldActive &&
    !player?.rocketBoostActive &&
    !player?.streakGuardActive &&
    !player?.isBombed
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {player?.doublePointsActive && (
        <div className="px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>⚡ THẺ NHÂN 2 ĐIỂM (X2 PT CÂU NÀY)!</span>
        </div>
      )}
      {player?.oracle5050Active && qType === 'MULTIPLE_CHOICE' && (
        <div className="px-3.5 py-1.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
          <Eye className="w-4 h-4 text-cyan-300 shrink-0" />
          <span>👁️ MẮT THẦN 50:50 ĐÃ LOẠI BỎ 2 ĐÁP ÁN SAI!</span>
        </div>
      )}
      {player?.rocketBoostActive && (
        <div className="px-3.5 py-1.5 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
          <Rocket className="w-4 h-4 text-purple-300 shrink-0" />
          <span>🚀 TĂNG TỐC TÊN LỬA (ĐÚNG &lt;5S NHẬN +200Đ)!</span>
        </div>
      )}
      {player?.streakGuardActive && (
        <div className="px-3.5 py-1.5 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
          <Flame className="w-4 h-4 text-rose-400 shrink-0" />
          <span>🔥 BẢO TOÀN CHUỖI THẮNG ĐANG KÍCH HOẠT!</span>
        </div>
      )}
      {player?.reflectShieldActive && (
        <div className="px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>👑 KHIÊN PHẢN ĐÒN ĐANG BẢO VỆ BẠN!</span>
        </div>
      )}
      {player?.isBombed && (
        <div className="px-3.5 py-1.5 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
          <Bomb className="w-4 h-4 text-orange-400 shrink-0 animate-bounce" />
          <span>💣 BỊ DÍNH BOM! ĐÚNG = PHÁ BOM (+50Đ) | SAI = NỔ (-150Đ)</span>
        </div>
      )}
    </div>
  );
});

/* Controlled Battle Status Banner */
const ControlledBattleBanner: React.FC<{ battleSessionState?: BattleSessionState }> = ({
  battleSessionState,
}) => {
  if (!battleSessionState) return null;

  if (battleSessionState.focusModeActive) {
    return (
      <div className="w-full py-2 px-4 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg animate-fade-in">
        <span>📚 CHẾ ĐỘ TẬP TRUNG: Giáo viên đã khóa lượt tấn công PvP. Tập trung làm bài!</span>
      </div>
    );
  }

  if (battleSessionState.currentPhase === 'BATTLE') {
    const endTs = battleSessionState.battleEndTimestamp || Date.now() + 10000;
    const remainingSec = Math.max(0, Math.ceil((endTs - Date.now()) / 1000));

    return (
      <div className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-rose-600 text-white font-black text-xs sm:text-sm flex items-center justify-between gap-2 shadow-lg animate-pulse border border-amber-300/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-300" />
          <span>⚔️ BATTLE TIME ĐANG MỞ!</span>
        </div>
        <span className="bg-black/30 px-3 py-0.5 rounded-lg text-yellow-300 font-mono text-sm border border-yellow-300/30">
          ⏱️ {remainingSec}s
        </span>
      </div>
    );
  }

  return (
    <div className="w-full py-1.5 px-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span>📚 CHẾ ĐỘ LÀM BÀI</span>
      </div>
      <span className="text-[11px] text-slate-400 font-medium">
        (Battle Time tiếp theo sau {battleSessionState.questionsUntilBattle || 5} câu)
      </span>
    </div>
  );
};

PowerUpRibbon.displayName = 'PowerUpRibbon';
