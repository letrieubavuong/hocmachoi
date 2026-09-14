import React, { useState } from 'react';
import { Quiz, Question } from '../types';
import { parseExTestTeX } from '../utils/texParser';
import { MathRenderer } from './MathRenderer';
import { Plus, Trash2, X, BookOpen, Clock, CheckCircle, Upload, FileCode, Sparkles } from 'lucide-react';

interface QuizCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuiz: (quiz: Quiz) => void;
}

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveQuiz,
}) => {
  const [activeMode, setActiveMode] = useState<'manual' | 'tex'>('tex');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán Học');
  const [description, setDescription] = useState('');
  
  // TeX paste / file import state
  const [texRawInput, setTexRawInput] = useState('');
  const [importNotice, setImportNotice] = useState('');

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      questionText: 'Phương trình $x^2 - 4x + 3 = 0$ có hai nghiệm là bao nhiêu?',
      options: ['$x_1 = 1, x_2 = 3$', '$x_1 = -1, x_2 = -3$', '$x_1 = 2, x_2 = 4$', '$x_1 = 0, x_2 = 3$'],
      correctIndex: 0,
      timeLimit: 20,
      points: 100,
      explanation: 'Ta có $a + b + c = 1 - 4 + 3 = 0$ nên nghiệm là $x_1 = 1, x_2 = 3$.',
    },
  ]);

  if (!isOpen) return null;

  // Handle uploading a .tex file directly
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTexRawInput(content);
        processTexContent(content);
      }
    };
    reader.readAsText(file);
  };

  const processTexContent = (rawTex: string) => {
    if (!rawTex.trim()) return;
    const parsed = parseExTestTeX(rawTex);
    if (parsed.length > 0) {
      setQuestions(parsed);
      setImportNotice(`🎉 Nhập thành công ${parsed.length} câu hỏi từ gói ex_test LaTeX!`);
    } else {
      setImportNotice('⚠️ Không tìm thấy khối câu hỏi dạng \\begin{ex} ... \\end{ex} hoặc \\choice trong file .tex!');
    }
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      questionText: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      timeLimit: 20,
      points: 100,
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = value;
    updated[qIndex].options = newOptions;
    setQuestions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || questions.length === 0) return;

    const quiz: Quiz = {
      id: `quiz-custom-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim() || 'Toán / KHTN',
      description: description.trim() || 'Bộ đề thi biên soạn bằng ex_test LaTeX',
      questions,
    };

    onSaveQuiz(quiz);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-purple-400 font-extrabold">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-black text-white">Thêm Bộ Đề Thi (Hỗ Trợ LaTeX ex_test)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl gap-2 mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveMode('tex')}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              activeMode === 'tex' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4 text-yellow-400" />
            Nhập Từ File LaTeX (.tex ex_test chuẩn Việt Nam)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              activeMode === 'manual' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            Soạn Thảo Thủ Công
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tên Bài Test / Đề Thi:</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Đề Kiểm Tra Toán 7 - Chương 1..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Môn Học:</label>
              <input
                type="text"
                required
                placeholder="Toán Học, KHTN, Vật Lý, Hóa Học..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Mode 1: LaTeX .tex File & Code Input */}
          {activeMode === 'tex' && (
            <div className="p-5 bg-slate-950/80 rounded-2xl border border-purple-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-yellow-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-400" /> Import File .tex Gói ex_test
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hỗ trợ mã nguồn TeX chuẩn dạng <code className="text-purple-300">\begin&#123;ex&#125; ... \choice&#123;A&#125;&#123;\True B&#125; ... \end&#123;ex&#125;</code>
                  </p>
                </div>

                <label className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shrink-0">
                  <Upload className="w-4 h-4" /> Tải File .tex Từ Máy Tính
                  <input
                    type="file"
                    accept=".tex,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Hoặc dán trực tiếp mã LaTeX TeX vào đây:</label>
                <textarea
                  rows={6}
                  placeholder={`\\begin{ex}\n   Phương trình $x^2 - 4x + 3 = 0$ có nghiệm là\n   \\choice\n   {$x_1 = 1, x_2 = 3$}\n   {\\True $x_1 = 1, x_2 = 3$}\n   {$x_1 = -1, x_2 = -3$}\n   {$x_1 = 2, x_2 = 4$}\n   \\loigiai{Ta có $a+b+c=0$}\n\\end{ex}`}
                  value={texRawInput}
                  onChange={(e) => {
                    setTexRawInput(e.target.value);
                    processTexContent(e.target.value);
                  }}
                  className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              {importNotice && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  importNotice.startsWith('🎉') 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {importNotice}
                </div>
              )}
            </div>
          )}

          {/* Questions Preview List */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-yellow-400">
                Danh Sách Câu Hỏi Đã Trích Xuất ({questions.length} câu)
              </h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Thêm Thủ Công
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={q.id} className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-300 uppercase bg-purple-600/30 px-2.5 py-1 rounded-lg border border-purple-500/40">
                    Câu hỏi #{qIdx + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nội dung câu hỏi (hỗ trợ công thức $...$):</label>
                  <input
                    type="text"
                    required
                    placeholder={`Nhập câu hỏi #${qIdx + 1}...`}
                    value={q.questionText}
                    onChange={(e) => handleQuestionChange(qIdx, 'questionText', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-purple-500"
                  />
                  {q.questionText && (
                    <div className="mt-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-yellow-300">
                      <span className="text-[10px] font-bold text-slate-500 block">Xem trước công thức Toán:</span>
                      <MathRenderer text={q.questionText} />
                    </div>
                  )}
                </div>

                {/* 4 Options Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuestionChange(qIdx, 'correctIndex', optIdx)}
                          className={`p-2 rounded-xl border font-bold text-xs shrink-0 flex items-center gap-1 ${
                            q.correctIndex === optIdx
                              ? 'bg-green-600 text-white border-green-400'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
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
                          onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      {opt && (
                        <div className="pl-14 text-[11px] text-slate-300">
                          <MathRenderer text={opt} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 block uppercase">Lời giải / Giải thích (\loigiai):</span>
                    <MathRenderer text={q.explanation} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold rounded-xl text-sm shadow-lg"
            >
              Lưu & Sử Dụng Ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
