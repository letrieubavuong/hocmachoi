import React from 'react';
import { StudentInquiryEvent } from '../types';
import { MathRenderer } from './MathRenderer';
import { HelpCircle, CheckCircle, Gift, X, BookOpen, Check, Award } from 'lucide-react';
import { ChibiAvatar } from './ChibiAvatar';

interface TeacherInquiryModalProps {
  isOpen: boolean;
  inquiry: StudentInquiryEvent | null;
  onResolve: (playerId: string) => void;
  onSendReward?: (playerId: string) => void;
  onClose: () => void;
}

export const TeacherInquiryModal: React.FC<TeacherInquiryModalProps> = ({
  isOpen,
  inquiry,
  onResolve,
  onSendReward,
  onClose,
}) => {
  if (!isOpen || !inquiry) return null;

  const { question, questionNumber, studentName, studentCode, playerId } = inquiry;
  const qType = question.type || 'MULTIPLE_CHOICE';

  const optionLabels = ['A', 'B', 'C', 'D'];
  const stmtLabels = ['a)', 'b)', 'c)', 'd)'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md">
              <HelpCircle className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-lg text-xs font-black uppercase tracking-wider">
                  💬 THẮC MẮC CÂU {questionNumber}
                </span>
                {studentCode && (
                  <span className="px-2 py-0.5 bg-purple-950 border border-purple-500/40 text-purple-300 rounded text-xs font-mono font-bold">
                    🆔 {studentCode}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                <span>Học sinh:</span>
                <span className="text-amber-300">{studentName}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Text Body */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-400" /> Nội dung câu hỏi số {questionNumber}:
          </div>
          <div className="text-lg md:text-xl font-extrabold text-white leading-relaxed">
            <MathRenderer text={question.questionText} />
          </div>
        </div>

        {/* Options / Correct Answer List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Các lựa chọn đáp án:
          </div>

          {qType === 'MULTIPLE_CHOICE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.options.map((opt, idx) => {
                const isCorrect = idx === question.correctIndex;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                      isCorrect
                        ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {optionLabels[idx]}
                    </span>
                    <div className="flex-1 text-sm font-bold pt-0.5">
                      <MathRenderer text={opt} />
                    </div>
                    {isCorrect && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[10px] font-black shrink-0 flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-400" /> Đáp án đúng
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {qType === 'TRUE_FALSE' && (
            <div className="space-y-2">
              {question.options.map((stmt, idx) => {
                const isTrue = question.tfAnswers ? question.tfAnswers[idx] : true;
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{stmtLabels[idx]}</span>
                      <MathRenderer text={stmt} />
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                        isTrue
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {isTrue ? 'ĐÚNG' : 'SAI'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {qType === 'SHORT_ANSWER' && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-emerald-300 text-sm font-bold flex items-center gap-2">
              <span>🎯 Đáp án ngắn chính xác:</span>
              <span className="text-base text-white font-mono font-black bg-emerald-900/60 px-3 py-1 rounded-xl border border-emerald-400/50">
                {question.shortAnswerText}
              </span>
            </div>
          )}
        </div>

        {/* Detailed Explanation if Available */}
        {question.explanation && (
          <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl space-y-2">
            <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              💡 Hướng dẫn giải chi tiết cho Giáo viên:
            </div>
            <div className="text-sm font-medium text-slate-200 leading-relaxed">
              <MathRenderer text={question.explanation} />
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {onSendReward && (
            <button
              onClick={() => {
                onClose();
                onSendReward(playerId);
              }}
              className="px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-300 hover:text-slate-950 font-bold text-sm rounded-2xl border border-yellow-500/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>🎁 Tặng quà động viên</span>
            </button>
          )}

          <button
            onClick={() => {
              onResolve(playerId);
              onClose();
            }}
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5 text-white" />
            <span>ĐÃ GIẢI ĐÁP XONG (HOÀN TẤT)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
