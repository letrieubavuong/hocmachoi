import React from 'react';
import { X, ExternalLink, Globe, CheckCircle2, Rocket, Cloud } from 'lucide-react';

interface VercelDeployGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelDeployGuide: React.FC<VercelDeployGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold">
            <Rocket className="w-6 h-6 animate-bounce" />
            <h2 className="text-xl font-black text-white">Hướng Dẫn Triển Khai Lên Vercel (Miễn Phí 100%)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content steps */}
        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 text-sm text-slate-300">
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
            <Globe className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-emerald-300 text-base">Sẵn Sàng Cho Vercel 100%</h3>
              <p className="text-xs text-slate-300 mt-1">
                Dự án đã được tối ưu hóa sẵn cho Vercel với Next.js / Vite SPA configuration. Bạn không cần cấu hình phức tạp!
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-wider block">Bước 1: Đẩy mã nguồn lên GitHub</span>
              <p className="text-xs">Chạy lệnh Git cơ bản trong thư mục dự án:</p>
              <pre className="bg-slate-950 p-3 rounded-xl text-emerald-400 text-xs font-mono select-all overflow-x-auto">
                git init{'\n'}
                git add .{'\n'}
                git commit -m "Initial Chibi Quiz Game"{'\n'}
                git branch -M main{'\n'}
                git remote add origin https://github.com/YOUR_USERNAME/chibi-quiz.git{'\n'}
                git push -u origin main
              </pre>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider block">Bước 2: Tạo dự án trên Vercel.com</span>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Truy cập <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-purple-400 underline font-bold inline-flex items-center gap-1">Vercel Dashboard <ExternalLink className="w-3 h-3" /></a>.</li>
                <li>Bấm <strong>"Import"</strong> từ Kho chứa GitHub vừa push.</li>
                <li>Vercel tự động phát hiện Vite / React. Giữ nguyên mặc định Build Command: <code className="bg-slate-900 px-2 py-0.5 rounded text-yellow-300">npm run build</code>.</li>
                <li>Bấm <strong>"Deploy"</strong> và chờ trong 30 giây!</li>
              </ol>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">Bước 3: Chia sẻ Link cho Học Sinh</span>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Vercel cấp đường dẫn dạng: <code className="text-yellow-300 font-bold">https://chibi-quiz.vercel.app</code>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Học sinh có thể dùng bất kỳ thiết bị di động, iPad hoặc máy tính nào quét QR Code để vào chơi ngay!
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-2xl text-sm shadow-lg"
          >
            Đã Hiểu, Đóng Hướng Dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
