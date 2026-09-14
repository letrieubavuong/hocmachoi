import React, { useState } from 'react';
import { Quiz, Question, QuestionType } from '../types';
import { parseExTestTeX } from '../utils/texParser';
import { MathRenderer } from './MathRenderer';
import { Plus, Trash2, X, BookOpen, Clock, CheckCircle, Upload, FileCode, Sparkles, Download, Check, HelpCircle } from 'lucide-react';

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
      type: 'MULTIPLE_CHOICE',
      questionText: 'Phương trình $x^2 - 4x + 3 = 0$ có hai nghiệm là bao nhiêu?',
      options: ['$x_1 = 1, x_2 = 3$', '$x_1 = -1, x_2 = -3$', '$x_1 = 2, x_2 = 4$', '$x_1 = 0, x_2 = 3$'],
      correctIndex: 0,
      timeLimit: 20,
      points: 100,
      explanation: 'Ta có $a + b + c = 1 - 4 + 3 = 0$ nên nghiệm là $x_1 = 1, x_2 = 3$.',
    },
  ]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content) as Quiz;
          if (parsed.title && Array.isArray(parsed.questions)) {
            setTitle(parsed.title);
            setSubject(parsed.subject || 'Đề Thi');
            setDescription(parsed.description || '');
            setQuestions(parsed.questions);
            setImportNotice(`🎉 Nhập thành công bộ đề thi JSON "${parsed.title}" (${parsed.questions.length} câu)!`);
          }
        } catch (err) {
          setImportNotice('⚠️ File JSON không hợp lệ!');
        }
      } else {
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
      setImportNotice(`🎉 Nhập thành công ${parsed.length} câu hỏi (gồm Trắc nghiệm, choiceTF Đúng/Sai, shortans Trả lời ngắn) từ LaTeX!`);
    } else {
      setImportNotice('⚠️ Không tìm thấy khối câu hỏi dạng \\begin{ex} ... \\end{ex}, \\choice, \\choiceTF hoặc \\shortans!');
    }
  };

  const handleExportJSON = () => {
    const quiz: Quiz = {
      id: `quiz-export-${Date.now()}`,
      title: title.trim() || 'De_Thi_Quiz',
      subject: subject.trim() || 'Toán',
      description: description.trim() || 'Bộ đề thi xuất từ Học Mà Chơi',
      questions,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(quiz, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${title.trim() || 'de_thi'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleAddQuestion = (type: QuestionType = 'MULTIPLE_CHOICE') => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      type,
      questionText: '',
      options: type === 'SHORT_ANSWER' ? [] : ['Mệnh đề a)', 'Mệnh đề b)', 'Mệnh đề c)', 'Mệnh đề d)'],
      correctIndex: 0,
      tfAnswers: type === 'TRUE_FALSE' ? [true, false, true, false] : undefined,
      shortAnswerText: type === 'SHORT_ANSWER' ? '' : undefined,
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

  const handleTFValueChange = (qIndex: number, stmtIndex: number, value: boolean) => {
    const updated = [...questions];
    const currentTF = [...(updated[qIndex].tfAnswers || [true, false, true, false])];
    currentTF[stmtIndex] = value;
    updated[qIndex].tfAnswers = currentTF;
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
            <h2 className="text-xl font-black text-white">Thêm & Biên Soạn Đề Thi (Trắc Nghiệm, choiceTF, shortans)</h2>
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
            Nhập Từ File LaTeX (.tex ex_test: \choice, \choiceTF, \shortans)
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
                placeholder="Ví dụ: Đề Thi Mẫu Mới Bộ GD - Toán 12..."
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
                    <Sparkles className="w-4 h-4 text-yellow-400" /> Import File .tex Đủ 3 Dạng Của ex_test
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hỗ trợ: <code className="text-purple-300">\choice&#123;A&#125;&#123;B&#125;</code> (4 đáp án), <code className="text-cyan-300">\choiceTF&#123;a&#125;&#123;b&#125;</code> (Đúng/Sai), <code className="text-amber-300">\shortans&#123;3.5&#125;</code> (Điền kết quả)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shrink-0">
                    <Upload className="w-4 h-4" /> Tải File .tex / .json
                    <input
                      type="file"
                      accept=".tex,.txt,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Hoặc dán trực tiếp mã LaTeX TeX vào đây:</label>
                <textarea
                  rows={6}
                  placeholder={`\\begin{ex}\n   Cho hàm số $y=x^2$. Phát biểu nào đúng?\n   \\choiceTF\n   {\\True a) Hàm số có đỉnh tại $(0,0)$}\n   {b) Hàm số đồng biến trên $\\mathbb{R}$}\n   {\\True c) Đồ thị quay bề lõm lên trên}\n   {d) Đồ thị đi qua điểm $(1,2)$}\n\\end{ex}\n\n\\begin{ex}\n   Nghiệm của phương trình $x + 5 = 12$ là\n   \\shortans{7}\n\\end{ex}`}
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

          {/* Questions Preview & Editor List */}
          <div className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-black text-yellow-400">
                Danh Sách Câu Hỏi ({questions.length} câu)
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" /> Export JSON
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> +Trắc Nghiệm
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('TRUE_FALSE')}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> +choiceTF (Đúng/Sai)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('SHORT_ANSWER')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> +shortans (Điền số)
                </button>
              </div>
            </div>

            {questions.map((q, qIdx) => {
              const currentQType = q.type || 'MULTIPLE_CHOICE';

              return (
                <div key={q.id} className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-300 uppercase bg-purple-600/30 px-2.5 py-1 rounded-lg border border-purple-500/40">
                        Câu #{qIdx + 1}
                      </span>
                      <select
                        value={currentQType}
                        onChange={(e) => handleQuestionChange(qIdx, 'type', e.target.value as QuestionType)}
                        className="bg-slate-900 border border-slate-700 text-yellow-300 font-extrabold text-xs rounded-lg px-2.5 py-1"
                      >
                        <option value="MULTIPLE_CHOICE">Trắc Nghiệm 4 Đáp Án (\choice)</option>
                        <option value="TRUE_FALSE">Trắc Nghiệm Đúng / Sai (\choiceTF)</option>
                        <option value="SHORT_ANSWER">Trả Lời Ngắn Điền Số (\shortans)</option>
                      </select>
                    </div>

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

                  {/* QTYPE 1: MULTIPLE CHOICE */}
                  {currentQType === 'MULTIPLE_CHOICE' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(q.options || ['', '', '', '']).map((opt, optIdx) => (
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
                        </div>
                      ))}
                    </div>
                  )}

                  {/* QTYPE 2: TRUE / FALSE (\choiceTF) */}
                  {currentQType === 'TRUE_FALSE' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-teal-400 uppercase block">4 Mệnh đề Đúng/Sai (\choiceTF):</span>
                      {(q.options || ['Mệnh đề a', 'Mệnh đề b', 'Mệnh đề c', 'Mệnh đề d']).map((stmt, stmtIdx) => {
                        const isTrueVal = (q.tfAnswers || [true, false, true, false])[stmtIdx];
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
                              onChange={(e) => handleOptionChange(qIdx, stmtIdx, e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTFValueChange(qIdx, stmtIdx, true)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  isTrueVal ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                \True (ĐÚNG)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTFValueChange(qIdx, stmtIdx, false)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  !isTrueVal ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
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
                      <label className="block text-[10px] font-bold text-amber-400 uppercase">Đáp án chuẩn cho câu trả lời ngắn (\shortans):</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 3.5 hoặc 12 hoặc x=5..."
                        value={q.shortAnswerText || ''}
                        onChange={(e) => handleQuestionChange(qIdx, 'shortAnswerText', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-yellow-400 font-extrabold text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
              Lưu Vào Máy & Sử Dụng Ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
