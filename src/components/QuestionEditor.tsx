import React from 'react';
import { Question, QuestionType } from '../types';
import { MathRenderer } from './MathRenderer';
import { Trash2, CheckCircle, ChevronDown, ChevronUp, AlertCircle, HelpCircle } from 'lucide-react';

export function createQuestionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function createQuestion(type: QuestionType = 'MULTIPLE_CHOICE'): Question {
  const id = createQuestionId();

  switch (type) {
    case 'TRUE_FALSE':
      return {
        id,
        type: 'TRUE_FALSE',
        questionText: '',
        options: ['Mệnh đề a)', 'Mệnh đề b)', 'Mệnh đề c)', 'Mệnh đề d)'],
        tfAnswers: [true, true, true, true],
        timeLimit: 30,
        points: 100,
      };
    case 'SHORT_ANSWER':
      return {
        id,
        type: 'SHORT_ANSWER',
        questionText: '',
        options: [],
        shortAnswerText: '',
        timeLimit: 20,
        points: 100,
      };
    case 'MULTIPLE_CHOICE':
    default:
      return {
        id,
        type: 'MULTIPLE_CHOICE',
        questionText: '',
        options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
      };
  }
}

export function convertQuestionType(question: Question, nextType: QuestionType): Question {
  if (question.type === nextType) return question;

  const base: Question = {
    ...question,
    type: nextType,
  };

  switch (nextType) {
    case 'MULTIPLE_CHOICE': {
      const existingOpts = Array.isArray(question.options) ? [...question.options] : [];
      while (existingOpts.length < 4) {
        existingOpts.push(`Lựa chọn ${String.fromCharCode(65 + existingOpts.length)}`);
      }
      const validOpts = existingOpts.slice(0, 4).map((opt, idx) => opt || `Lựa chọn ${String.fromCharCode(65 + idx)}`);

      let correctIdx = typeof question.correctIndex === 'number' && question.correctIndex >= 0 && question.correctIndex < 4
        ? question.correctIndex
        : 0;

      return {
        ...base,
        options: validOpts,
        correctIndex: correctIdx,
        tfAnswers: undefined,
        shortAnswerText: undefined,
      };
    }

    case 'TRUE_FALSE': {
      const existingOpts = Array.isArray(question.options) ? [...question.options] : [];
      while (existingOpts.length < 4) {
        existingOpts.push(`Mệnh đề ${String.fromCharCode(97 + existingOpts.length)})`);
      }
      const validOpts = existingOpts.slice(0, 4).map((opt, idx) => opt || `Mệnh đề ${String.fromCharCode(97 + idx)})`);

      const existingTF = Array.isArray(question.tfAnswers) ? [...question.tfAnswers] : [];
      while (existingTF.length < 4) {
        existingTF.push(true);
      }
      const validTF = existingTF.slice(0, 4).map((val) => typeof val === 'boolean' ? val : true);

      return {
        ...base,
        options: validOpts,
        tfAnswers: validTF,
        correctIndex: undefined,
        shortAnswerText: undefined,
      };
    }

    case 'SHORT_ANSWER': {
      return {
        ...base,
        options: [],
        shortAnswerText: question.shortAnswerText || '',
        correctIndex: undefined,
        tfAnswers: undefined,
      };
    }

    default:
      return base;
  }
}

interface QuestionEditorProps {
  question: Question;
  index: number;
  totalQuestions: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onUpdateQuestion: (id: string, updater: (prev: Question) => Question) => void;
  onRemoveQuestion: (id: string) => void;
  validationError?: string;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = React.memo(({
  question,
  index,
  totalQuestions,
  isExpanded,
  onToggleExpand,
  onUpdateQuestion,
  onRemoveQuestion,
  validationError,
}) => {
  const currentQType = question.type || 'MULTIPLE_CHOICE';

  const handleTypeChange = (newType: QuestionType) => {
    onUpdateQuestion(question.id, (prev) => convertQuestionType(prev, newType));
  };

  const handleTextChange = (text: string) => {
    onUpdateQuestion(question.id, (prev) => ({ ...prev, questionText: text }));
  };

  const handleOptionChange = (optIndex: number, val: string) => {
    onUpdateQuestion(question.id, (prev) => {
      const newOpts = [...(prev.options || ['', '', '', ''])];
      newOpts[optIndex] = val;
      return { ...prev, options: newOpts };
    });
  };

  const handleCorrectIndexChange = (optIndex: number) => {
    onUpdateQuestion(question.id, (prev) => ({ ...prev, correctIndex: optIndex }));
  };

  const handleTFValueChange = (stmtIndex: number, val: boolean) => {
    onUpdateQuestion(question.id, (prev) => {
      const newTF = [...(prev.tfAnswers || [true, false, true, false])];
      newTF[stmtIndex] = val;
      return { ...prev, tfAnswers: newTF };
    });
  };

  const handleShortAnswerChange = (val: string) => {
    onUpdateQuestion(question.id, (prev) => ({ ...prev, shortAnswerText: val }));
  };

  const handleExplanationChange = (val: string) => {
    onUpdateQuestion(question.id, (prev) => ({ ...prev, explanation: val }));
  };

  const handleTimeLimitChange = (val: number) => {
    onUpdateQuestion(question.id, (prev) => ({ ...prev, timeLimit: Math.max(5, Math.min(300, val)) }));
  };

  const handlePointsChange = (val: number) => {
    onUpdateQuestion(question.id, (prev) => ({ ...prev, points: Math.max(10, Math.min(1000, val)) }));
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'TRUE_FALSE':
        return { label: 'Đúng / Sai (\\choiceTF)', color: 'bg-teal-600/30 text-teal-300 border-teal-500/40' };
      case 'SHORT_ANSWER':
        return { label: 'Điền Số (\\shortans)', color: 'bg-amber-600/30 text-amber-300 border-amber-500/40' };
      case 'MULTIPLE_CHOICE':
      default:
        return { label: 'Trắc Nghiệm (\\choice)', color: 'bg-purple-600/30 text-purple-300 border-purple-500/40' };
    }
  };

  const typeMeta = getTypeLabel(currentQType);

  return (
    <div
      id={`question-card-${question.id}`}
      className={`p-4 bg-slate-800/90 rounded-2xl border transition-all ${
        validationError
          ? 'border-rose-500/80 shadow-lg shadow-rose-500/10'
          : isExpanded
          ? 'border-purple-500/70 shadow-md'
          : 'border-slate-700/80 hover:border-slate-600'
      }`}
    >
      {/* Header Bar (Collapsible Toggle) */}
      <div className="flex items-center justify-between gap-3 select-none">
        <div
          onClick={() => onToggleExpand(question.id)}
          className="flex-1 flex items-center gap-2.5 cursor-pointer min-w-0"
        >
          <span className="text-xs font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 shrink-0">
            Câu #{index + 1}
          </span>

          <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${typeMeta.color}`}>
            {typeMeta.label}
          </span>

          {/* Truncated Summary Text */}
          <span className="text-xs font-semibold text-slate-300 truncate max-w-xs sm:max-w-md">
            {question.questionText ? question.questionText : <em className="text-slate-500 font-normal">Chưa nhập nội dung...</em>}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {validationError && (
            <span className="text-[11px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-500/40 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Lỗi
            </span>
          )}

          <button
            type="button"
            onClick={() => onToggleExpand(question.id)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onRemoveQuestion(question.id)}
            className="p-1.5 text-rose-400 hover:text-rose-200 bg-slate-900/80 hover:bg-rose-900/50 rounded-lg transition-colors cursor-pointer"
            title="Xóa câu hỏi"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-2 text-xs font-bold text-rose-300 bg-rose-950/60 p-2 rounded-xl border border-rose-500/40 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Expanded Editor Body */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-4 animate-fade-in">
          {/* Question Type Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-300 shrink-0">Loại câu hỏi:</label>
              <select
                value={currentQType}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="bg-slate-950 border border-slate-700 text-yellow-300 font-extrabold text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="MULTIPLE_CHOICE">Trắc Nghiệm 4 Đáp Án (\choice)</option>
                <option value="TRUE_FALSE">Trắc Nghiệm Đúng / Sai (\choiceTF)</option>
                <option value="SHORT_ANSWER">Trả Lời Ngắn Điền Số (\shortans)</option>
              </select>
            </div>

            {/* Time & Points Inputs */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Thời gian:</span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={question.timeLimit || 20}
                  onChange={(e) => handleTimeLimitChange(parseInt(e.target.value, 10) || 20)}
                  className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-xs text-center"
                />
                <span className="text-[10px] text-slate-400">giây</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Điểm:</span>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  step={10}
                  value={question.points || 100}
                  onChange={(e) => handlePointsChange(parseInt(e.target.value, 10) || 100)}
                  className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-xs text-center"
                />
              </div>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Nội dung câu hỏi (hỗ trợ công thức $...$):
            </label>
            <textarea
              rows={2}
              required
              placeholder={`Nhập nội dung câu hỏi #${index + 1}...`}
              value={question.questionText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-purple-500 leading-relaxed"
            />
            {question.questionText && (
              <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-yellow-300">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Xem trước công thức LaTeX:</span>
                <MathRenderer text={question.questionText} />
              </div>
            )}
          </div>

          {/* QTYPE 1: MULTIPLE CHOICE */}
          {currentQType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase block">
                4 Lựa chọn Trắc nghiệm (Bấm tích xanh để chọn đáp án đúng \True):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(question.options || ['', '', '', '']).map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleCorrectIndexChange(optIdx)}
                      className={`p-2 rounded-lg border font-black text-xs shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                        question.correctIndex === optIdx
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                      title="Đánh dấu đáp án đúng (\True)"
                    >
                      <CheckCircle className="w-4 h-4" /> {['A', 'B', 'C', 'D'][optIdx]}
                    </button>
                    <input
                      type="text"
                      required
                      placeholder={`Lựa chọn ${['A', 'B', 'C', 'D'][optIdx]}...`}
                      value={opt}
                      onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QTYPE 2: TRUE / FALSE (\choiceTF) */}
          {currentQType === 'TRUE_FALSE' && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-teal-400 uppercase block">4 Mệnh đề Đúng / Sai (\choiceTF):</span>
              {(question.options || ['Mệnh đề a', 'Mệnh đề b', 'Mệnh đề c', 'Mệnh đề d']).map((stmt, stmtIdx) => {
                const isTrueVal = (question.tfAnswers || [true, true, true, true])[stmtIdx] !== false;
                return (
                  <div key={stmtIdx} className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-xs font-black text-purple-300 w-6 shrink-0">
                      {['a)', 'b)', 'c)', 'd)'][stmtIdx]}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={`Nội dung mệnh đề ${['a)', 'b)', 'c)', 'd)'][stmtIdx]}...`}
                      value={stmt}
                      onChange={(e) => handleOptionChange(stmtIdx, e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTFValueChange(stmtIdx, true)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isTrueVal ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        \True (ĐÚNG)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTFValueChange(stmtIdx, false)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          !isTrueVal ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        SAI
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* QTYPE 3: SHORT ANSWER (\shortans) */}
          {currentQType === 'SHORT_ANSWER' && (
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-2">
              <label className="block text-[10px] font-bold text-amber-400 uppercase">
                Đáp án chuẩn điền kết quả (\shortans):
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: 3.5 hoặc 12 hoặc -2 hoặc 2e-3..."
                value={question.shortAnswerText || ''}
                onChange={(e) => handleShortAnswerChange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-yellow-400 font-extrabold text-sm focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 italic">
                * Giữ nguyên định dạng số hoặc chuỗi kết quả theo đáp án thầy đề ra.
              </p>
            </div>
          )}

          {/* Explanation Field (\loigiai) */}
          <div className="pt-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Lời giải / Giải thích chi tiết (\loigiai) - Không bắt buộc:
            </label>
            <textarea
              rows={2}
              placeholder="Nhập lời giải hoặc hướng dẫn làm bài (hỗ trợ công thức $...$)..."
              value={question.explanation || ''}
              onChange={(e) => handleExplanationChange(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-purple-500"
            />
            {question.explanation && (
              <div className="mt-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Xem trước lời giải:</span>
                <MathRenderer text={question.explanation} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

QuestionEditor.displayName = 'QuestionEditor';
