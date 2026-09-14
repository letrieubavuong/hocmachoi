import React, { useState } from 'react';
import { Quiz, Question } from '../types';
import { Plus, Trash2, X, BookOpen, Clock, CheckCircle } from 'lucide-react';

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
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán Học');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      questionText: 'Số nguyên tố nhỏ nhất là bao nhiêu?',
      options: ['2', '1', '3', '0'],
      correctIndex: 0,
      timeLimit: 20,
      points: 100,
      explanation: 'Số 2 là số nguyên tố nhỏ nhất và là số nguyên tố chẵn duy nhất.',
    },
  ]);

  if (!isOpen) return null;

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
      subject: subject.trim() || 'Tự Tạo',
      description: description.trim() || 'Bộ câu hỏi tự biên soạn',
      questions,
    };

    onSaveQuiz(quiz);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-purple-400 font-extrabold">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-black text-white">Tạo Bộ Câu Hỏi Quiz Mới</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full"
          >
            <X className="w-5 h-5" />
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
                placeholder="Ví dụ: Ôn Tập Giữa Kỳ 1 KHTN 7..."
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
                placeholder="Toán Học, KHTN, Tiếng Anh..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Mô Tả Ngắn:</label>
            <input
              type="text"
              placeholder="Bộ câu hỏi ôn tập vui nhộn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Questions List */}
          <div className="space-y-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-yellow-400">Danh Sách Câu Hỏi ({questions.length})</h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Thêm Câu Hỏi
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

                <input
                  type="text"
                  required
                  placeholder={`Nhập nội dung câu hỏi #${qIdx + 1}...`}
                  value={q.questionText}
                  onChange={(e) => handleQuestionChange(qIdx, 'questionText', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-purple-500"
                />

                {/* 4 Options Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuestionChange(qIdx, 'correctIndex', optIdx)}
                        className={`p-2 rounded-xl border font-bold text-xs shrink-0 flex items-center gap-1 ${
                          q.correctIndex === optIdx
                            ? 'bg-green-600 text-white border-green-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                        title="Đánh dấu đây là đáp án đúng"
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
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Thời gian trả lời:</span>
                    <select
                      value={q.timeLimit}
                      onChange={(e) => handleQuestionChange(qIdx, 'timeLimit', Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold"
                    >
                      <option value={10}>10 giây</option>
                      <option value={15}>15 giây</option>
                      <option value={20}>20 giây</option>
                      <option value={30}>30 giây</option>
                    </select>
                  </div>
                </div>
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
