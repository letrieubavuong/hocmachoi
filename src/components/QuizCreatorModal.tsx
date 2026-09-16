import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Question, QuestionType } from '../types';
import { parseExTestTeX } from '../utils/texParser';
import { QuestionEditor, createQuestion, createQuestionId } from './QuestionEditor';
import { Plus, X, BookOpen, Upload, FileCode, Sparkles, Download, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

interface QuizCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuiz: (quiz: Quiz) => void;
}

export interface ImportNotice {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB Limit

const SUBJECT_OPTIONS = ['Vật Lý', 'Toán Học', 'Hóa Học', 'Sinh Học', 'KHTN', 'Khác'];

// Helper: JSON Quiz Import Validator
export function validateQuizImport(content: string): {
  valid: boolean;
  quiz?: Quiz;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, errors: ['File JSON không chứa dữ liệu object hợp lệ.'], warnings: [] };
    }

    if (!parsed.title || typeof parsed.title !== 'string') {
      errors.push('Thiếu hoặc sai kiểu dữ liệu trường tiêu đề (title).');
    }

    if (!Array.isArray(parsed.questions)) {
      errors.push('Thiếu hoặc sai kiểu dữ liệu danh sách câu hỏi (questions).');
      return { valid: false, errors, warnings };
    }

    const validatedQuestions: Question[] = [];
    const usedIds = new Set<string>();

    parsed.questions.forEach((q: any, idx: number) => {
      const qNum = idx + 1;

      if (!q || typeof q !== 'object') {
        warnings.push(`Câu #${qNum}: Dữ liệu không phải là object hợp lệ, đã bị bỏ qua.`);
        return;
      }

      let qId = q.id && typeof q.id === 'string' ? q.id.trim() : createQuestionId();
      if (usedIds.has(qId)) {
        qId = createQuestionId(); // Reassign unique ID if duplicate
        warnings.push(`Câu #${qNum}: Phát hiện trùng ID, đã cấp lại ID mới.`);
      }
      usedIds.add(qId);

      const qType: QuestionType = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'].includes(q.type)
        ? q.type
        : 'MULTIPLE_CHOICE';

      const qText = typeof q.questionText === 'string' ? q.questionText : `Câu hỏi #${qNum}`;
      const timeLimit = typeof q.timeLimit === 'number' && q.timeLimit >= 5 ? q.timeLimit : 20;
      const points = typeof q.points === 'number' && q.points >= 10 ? q.points : 100;
      const explanation = typeof q.explanation === 'string' ? q.explanation : undefined;

      let normalizedQ: Question = {
        id: qId,
        type: qType,
        questionText: qText,
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o || '')) : [],
        timeLimit,
        points,
        explanation,
      };

      if (qType === 'MULTIPLE_CHOICE') {
        while (normalizedQ.options.length < 4) {
          normalizedQ.options.push(`Lựa chọn ${String.fromCharCode(65 + normalizedQ.options.length)}`);
        }
        normalizedQ.options = normalizedQ.options.slice(0, 4);
        normalizedQ.correctIndex = typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0;
      } else if (qType === 'TRUE_FALSE') {
        while (normalizedQ.options.length < 4) {
          normalizedQ.options.push(`Mệnh đề ${String.fromCharCode(97 + normalizedQ.options.length)})`);
        }
        normalizedQ.options = normalizedQ.options.slice(0, 4);
        const tfAnswers = Array.isArray(q.tfAnswers) ? q.tfAnswers.map((b: any) => Boolean(b)) : [true, true, true, true];
        while (tfAnswers.length < 4) tfAnswers.push(true);
        normalizedQ.tfAnswers = tfAnswers.slice(0, 4);
      } else if (qType === 'SHORT_ANSWER') {
        normalizedQ.options = [];
        normalizedQ.shortAnswerText = typeof q.shortAnswerText === 'string' ? q.shortAnswerText : '';
      }

      validatedQuestions.push(normalizedQ);
    });

    if (validatedQuestions.length === 0) {
      errors.push('Không tìm thấy câu hỏi hợp lệ nào trong file JSON.');
      return { valid: false, errors, warnings };
    }

    const quiz: Quiz = {
      id: parsed.id && typeof parsed.id === 'string' ? parsed.id : `quiz-${Date.now()}`,
      title: parsed.title.trim(),
      subject: typeof parsed.subject === 'string' ? parsed.subject : 'Vật Lý',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      questions: validatedQuestions,
      createdAt: parsed.createdAt || Date.now(),
    };

    return { valid: errors.length === 0, quiz, errors, warnings };
  } catch (err: any) {
    return { valid: false, errors: [`Lỗi cú pháp JSON: ${err?.message || 'File hỏng'}`], warnings: [] };
  }
}

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveQuiz,
}) => {
  const [activeMode, setActiveMode] = useState<'tex' | 'manual'>('tex');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Vật Lý');
  const [description, setDescription] = useState('');
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(true);

  // TeX paste / file import state
  const [texRawInput, setTexRawInput] = useState('');
  const [importNotice, setImportNotice] = useState<ImportNotice | null>(null);

  // Question list state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [titleError, setTitleError] = useState('');

  // Dirty state & Confirmation Modals
  const [isDirty, setIsDirty] = useState(false);
  const [showParseConfirmModal, setShowParseConfirmModal] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [pendingTexContent, setPendingTexContent] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSubject('Vật Lý');
      setDescription('');
      setTexRawInput('');
      setImportNotice(null);
      setQuestions([]);
      setExpandedIds(new Set());
      setValidationErrors({});
      setTitleError('');
      setIsDirty(false);
      setIsImportPanelOpen(true);
      setShowParseConfirmModal(false);
      setShowCloseConfirmModal(false);
      setPendingTexContent(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle expand for specific question card
  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all / Collapse all helpers
  const handleExpandAll = () => {
    setExpandedIds(new Set(questions.map((q) => q.id)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // Update a single question cleanly by ID
  const handleUpdateQuestion = (id: string, updater: (prev: Question) => Question) => {
    setIsDirty(true);
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? updater(q) : q))
    );
    // Clear validation error if any
    setValidationErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Remove a question by ID
  const handleRemoveQuestion = (id: string) => {
    setIsDirty(true);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setValidationErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Add new question by type
  const handleAddQuestion = (type: QuestionType = 'MULTIPLE_CHOICE') => {
    setIsDirty(true);
    const newQ = createQuestion(type);
    setQuestions((prev) => [...prev, newQ]);
    setExpandedIds((prev) => new Set([...prev, newQ.id]));
  };

  // Core TeX Processing Execution
  const executeParseTex = (rawTex: string) => {
    if (!rawTex.trim()) {
      setImportNotice({
        type: 'warning',
        message: 'Vui lòng dán hoặc nạp mã LaTeX trước khi phân tích.',
      });
      return;
    }

    const parsed = parseExTestTeX(rawTex);
    if (parsed.length > 0) {
      setQuestions(parsed);
      setExpandedIds(new Set(parsed.slice(0, 3).map((q) => q.id))); // Auto-expand first 3
      setIsDirty(true);
      setIsImportPanelOpen(false); // Collapse import panel to free room for editor

      const mcCount = parsed.filter((q) => (q.type || 'MULTIPLE_CHOICE') === 'MULTIPLE_CHOICE').length;
      const tfCount = parsed.filter((q) => q.type === 'TRUE_FALSE').length;
      const saCount = parsed.filter((q) => q.type === 'SHORT_ANSWER').length;

      setImportNotice({
        type: 'success',
        message: `Phân tích thành công ${parsed.length} câu hỏi từ LaTeX!`,
        details: [
          `• Trắc nghiệm (\\choice): ${mcCount} câu`,
          `• Đúng/Sai (\\choiceTF): ${tfCount} câu`,
          `• Trả lời ngắn (\\shortans): ${saCount} câu`,
        ],
      });
    } else {
      setImportNotice({
        type: 'error',
        message: 'Không tìm thấy khối câu hỏi dạng \\begin{ex}...\\end{ex}, \\choice, \\choiceTF hoặc \\shortans trong mã LaTeX!',
      });
    }
  };

  // Trigger TeX Parse with Protection Confirmation
  const handleTriggerParseTex = (overrideContent?: string) => {
    const targetContent = overrideContent !== undefined ? overrideContent : texRawInput;

    if (questions.length > 0 && isDirty) {
      setPendingTexContent(targetContent);
      setShowParseConfirmModal(true);
    } else {
      executeParseTex(targetContent);
    }
  };

  // Confirm overwrite TeX re-parse
  const handleConfirmParseOverwrite = () => {
    setShowParseConfirmModal(false);
    if (pendingTexContent !== null) {
      executeParseTex(pendingTexContent);
      setPendingTexContent(null);
    }
  };

  // Handle File Upload (.tex, .txt, .json)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImportNotice({
        type: 'error',
        message: `Kích thước file (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn 5 MB.`,
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.json')) {
        const result = validateQuizImport(content);
        if (result.valid && result.quiz) {
          setTitle(result.quiz.title);
          setSubject(result.quiz.subject || 'Vật Lý');
          setDescription(result.quiz.description || '');
          setQuestions(result.quiz.questions);
          setExpandedIds(new Set(result.quiz.questions.slice(0, 3).map((q) => q.id)));
          setIsDirty(true);
          setIsImportPanelOpen(false);

          setImportNotice({
            type: 'success',
            message: `Nhập thành công bộ đề thi JSON "${result.quiz.title}" (${result.quiz.questions.length} câu)!`,
            details: result.warnings,
          });
        } else {
          setImportNotice({
            type: 'error',
            message: 'File JSON không hợp lệ hoặc sai cấu trúc đề thi!',
            details: result.errors.concat(result.warnings),
          });
        }
      } else {
        setTexRawInput(content);
        handleTriggerParseTex(content);
      }
    };

    reader.onerror = () => {
      setImportNotice({
        type: 'error',
        message: 'Không thể đọc nội dung file. Vui lòng kiểm tra lại quyền hoặc định dạng file.',
      });
    };

    reader.readAsText(file, 'UTF-8');
    // Clear input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  // Export JSON with Validation
  const handleExportJSON = () => {
    if (questions.length === 0) {
      setImportNotice({
        type: 'warning',
        message: 'Danh sách câu hỏi đang rỗng, không thể xuất file JSON.',
      });
      return;
    }

    const quizTitle = title.trim() || 'De_Thi_Quiz';
    const quiz: Quiz = {
      id: `quiz-export-${Date.now()}`,
      title: quizTitle,
      subject: subject.trim() || 'Vật Lý',
      description: description.trim() || 'Bộ đề thi biên soạn từ Học Mà Chơi',
      questions,
      createdAt: Date.now(),
    };

    try {
      const dataStr = JSON.stringify(quiz, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const sanitizedFilename = quizTitle.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `${sanitizedFilename}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportNotice({
        type: 'error',
        message: 'Không thể khởi tạo file tải về. Vui lòng thử lại.',
      });
    }
  };

  // Full Quiz Validation before Save
  const validateFullQuiz = (): boolean => {
    let isValid = true;
    const errors: Record<string, string> = {};
    setTitleError('');

    if (!title.trim()) {
      setTitleError('Vui lòng nhập tên bài test / đề thi.');
      isValid = false;
    }

    if (questions.length === 0) {
      setImportNotice({
        type: 'error',
        message: 'Bộ đề thi phải có ít nhất 1 câu hỏi trước khi lưu.',
      });
      return false;
    }

    let firstErrorId: string | null = null;

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const qType = q.type || 'MULTIPLE_CHOICE';

      if (!q.questionText || !q.questionText.trim()) {
        errors[q.id] = `Câu #${qNum}: Vui lòng nhập nội dung câu hỏi.`;
        if (!firstErrorId) firstErrorId = q.id;
        isValid = false;
        return;
      }

      if (qType === 'MULTIPLE_CHOICE') {
        const opts = q.options || [];
        if (opts.length < 4 || opts.some((o) => !o || !o.trim())) {
          errors[q.id] = `Câu #${qNum}: Phải nhập đủ nội dung cho cả 4 phương án A, B, C, D.`;
          if (!firstErrorId) firstErrorId = q.id;
          isValid = false;
        } else if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= 4) {
          errors[q.id] = `Câu #${qNum}: Vui lòng chọn đáp án đúng (A, B, C hoặc D).`;
          if (!firstErrorId) firstErrorId = q.id;
          isValid = false;
        }
      } else if (qType === 'TRUE_FALSE') {
        const stmts = q.options || [];
        if (stmts.length < 4 || stmts.some((s) => !s || !s.trim())) {
          errors[q.id] = `Câu #${qNum}: Phải nhập đủ nội dung cho cả 4 mệnh đề a, b, c, d.`;
          if (!firstErrorId) firstErrorId = q.id;
          isValid = false;
        }
      } else if (qType === 'SHORT_ANSWER') {
        if (!q.shortAnswerText || !q.shortAnswerText.trim()) {
          errors[q.id] = `Câu #${qNum}: Vui lòng nhập đáp án chuẩn cho câu điền số.`;
          if (!firstErrorId) firstErrorId = q.id;
          isValid = false;
        }
      }
    });

    setValidationErrors(errors);

    if (!isValid && firstErrorId) {
      // Expand failing question card and scroll into view
      setExpandedIds((prev) => new Set([...prev, firstErrorId!]));
      setTimeout(() => {
        const el = document.getElementById(`question-card-${firstErrorId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }

    return isValid;
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFullQuiz()) return;

    const quiz: Quiz = {
      id: `quiz-custom-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim() || 'Vật Lý',
      description: description.trim() || 'Bộ đề thi biên soạn bằng ex_test LaTeX',
      questions,
      createdAt: Date.now(),
    };

    onSaveQuiz(quiz);
    setIsDirty(false);
    onClose();
  };

  // Close Request with Dirty Guard
  const handleRequestClose = () => {
    if (isDirty && questions.length > 0) {
      setShowCloseConfirmModal(true);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-lg animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-creator-title"
        className="relative w-full max-w-4xl bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center gap-2 text-purple-400 font-extrabold min-w-0">
            <BookOpen className="w-6 h-6 shrink-0 text-purple-400" />
            <h2 id="quiz-creator-title" className="text-lg sm:text-xl font-black text-white truncate">
              Biên Soạn Đề Thi (Trắc Nghiệm, choiceTF, shortans)
            </h2>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors shrink-0 cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div role="tablist" className="flex bg-slate-950 p-1.5 rounded-2xl gap-2 mb-4 border border-slate-800">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'tex'}
            onClick={() => setActiveMode('tex')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'tex'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>Import LaTeX (.tex / .json)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'manual'}
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Soạn Thảo Thủ Công</span>
          </button>
        </div>

        {/* Main Form & Body Scroll Area */}
        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1.5 custom-scrollbar flex-1">
          {/* Quiz Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tên Bài Test / Đề Thi <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Đề Kiểm Tra Chương 1 Vật Lý 12 - Dao Động Cơ..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDirty(true);
                  if (titleError) setTitleError('');
                }}
                className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-purple-500 ${
                  titleError ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-700'
                }`}
              />
              {titleError && <p className="text-[11px] font-bold text-rose-400 mt-1">{titleError}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Môn Học:</label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode 1: LaTeX & File Import Panel */}
          {activeMode === 'tex' && (
            <div className="p-4 sm:p-5 bg-slate-950/90 rounded-2xl border border-purple-500/40 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div
                  onClick={() => setIsImportPanelOpen(!isImportPanelOpen)}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                  <h3 className="text-sm font-black text-yellow-400">
                    Import Mã LaTeX (.tex ex_test) hoặc File JSON
                  </h3>
                  {isImportPanelOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <label className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shrink-0 transition-colors">
                  <Upload className="w-4 h-4" /> Tải File .tex / .json
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".tex,.txt,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {isImportPanelOpen && (
                <div className="space-y-3 pt-1 animate-fade-in">
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    Hỗ trợ 3 cú pháp ex_test: <code className="text-purple-300 font-bold">\choice&#123;A&#125;&#123;B&#125;</code> (Trắc nghiệm), <code className="text-teal-300 font-bold">\choiceTF&#123;a&#125;&#123;b&#125;</code> (Đúng/Sai), <code className="text-amber-300 font-bold">\shortans&#123;3.5&#125;</code> (Điền kết quả).
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Dán trực tiếp mã LaTeX vào đây:</label>
                    <textarea
                      rows={5}
                      placeholder={`\\begin{ex}\n   Cho véc tơ gia tốc $a = -\\omega^2 x$. Phát biểu nào sau đây đúng?\n   \\choiceTF\n   {\\True a) Gia tốc luôn hướng về vị trí cân bằng}\n   {b) Gia tốc cùng pha với li độ}\n   {\\True c) Gia tốc đạt cực đại tại hai biên}\n   {d) Gia tốc bằng 0 tại vị trí biên}\n\\end{ex}\n\n\\begin{ex}\n   Tần số góc dao động $\\omega = 10\\pi$ rad/s. Chu kỳ dao động là bao nhiêu giây?\n   \\shortans{0.2}\n\\end{ex}`}
                      value={texRawInput}
                      onChange={(e) => setTexRawInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          handleTriggerParseTex();
                        }
                      }}
                      className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        * Mẹo: Nhấn <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl + Enter</kbd> để phân tích nhanh.
                      </span>

                      <button
                        type="button"
                        onClick={() => handleTriggerParseTex()}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> PHÂN TÍCH LATEX
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Notice Banner */}
              {importNotice && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold space-y-1 ${
                    importNotice.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : importNotice.type === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {importNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{importNotice.message}</span>
                  </div>
                  {importNotice.details && importNotice.details.length > 0 && (
                    <div className="pl-6 text-[11px] font-normal space-y-0.5 opacity-90">
                      {importNotice.details.map((dt, idx) => (
                        <div key={idx}>{dt}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Questions Header & Quick Actions */}
          <div className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-yellow-400">
                  Danh Sách Câu Hỏi ({questions.length} câu)
                </h3>

                {questions.length > 0 && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 cursor-pointer"
                    >
                      Mở tất cả
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 cursor-pointer"
                    >
                      Thu gọn tất cả
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Xuất bài thi ra file JSON"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" /> Export JSON
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> +Trắc Nghiệm
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('TRUE_FALSE')}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> +choiceTF (Đ/S)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('SHORT_ANSWER')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> +shortans (Điền số)
                </button>
              </div>
            </div>

            {/* Questions Empty State */}
            {questions.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-3xl border-2 border-dashed border-slate-800 space-y-4">
                <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto text-purple-400">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-white">Chưa có câu hỏi nào trong bài thi</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Bạn có thể nạp file/dán mã LaTeX ở tab trên hoặc bấm các nút bên dưới để tạo từng câu hỏi thủ công.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm Trắc Nghiệm 4 Đáp Án
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('TRUE_FALSE')}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm Trắc Nghiệm Đúng / Sai
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('SHORT_ANSWER')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm Trả Lời Ngắn Điền Số
                  </button>
                </div>
              </div>
            ) : (
              /* Question List Render */
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    index={idx}
                    totalQuestions={questions.length}
                    isExpanded={expandedIds.has(q.id)}
                    onToggleExpand={handleToggleExpand}
                    onUpdateQuestion={handleUpdateQuestion}
                    onRemoveQuestion={handleRemoveQuestion}
                    validationError={validationErrors[q.id]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md pt-4 pb-2 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 font-semibold">
              Tổng số: <strong className="text-yellow-400">{questions.length}</strong> câu hỏi
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black rounded-xl text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
              >
                Lưu Đề Thi & Sử Dụng Ngay ➔
              </button>
            </div>
          </div>
        </form>

        {/* Modal Confirm Overwrite LaTeX Parse */}
        {showParseConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
              <div className="w-14 h-14 bg-amber-500/20 border border-amber-400/50 rounded-full flex items-center justify-center mx-auto text-amber-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Xác Nhận Phân Tích Lại LaTeX</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bạn đang có <strong className="text-yellow-400">{questions.length} câu hỏi</strong> trong danh sách. Phân tích lại mã LaTeX sẽ <strong className="text-rose-400">xóa toàn bộ</strong> danh sách hiện tại để nạp đề mới.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowParseConfirmModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmParseOverwrite}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Xác Nhận Phân Tích Lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirm Close Unsaved Changes */}
        {showCloseConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
              <div className="w-14 h-14 bg-rose-500/20 border border-rose-400/50 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Thay Đổi Chưa Được Lưu</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bạn có những chỉnh sửa chưa lưu trong bộ đề thi này. Bạn có chắc chắn muốn thoát mà không lưu?
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirmModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Tiếp Tục Chỉnh Sửa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirmModal(false);
                    onClose();
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Thoát Không Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
