import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, Globe, CheckCircle2, Rocket } from 'lucide-react';

interface VercelDeployGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelDeployGuide: React.FC<VercelDeployGuideProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management & ESC key close
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vercel-guide-title"
        className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold min-w-0">
            <Rocket className="w-6 h-6 shrink-0 text-emerald-400" />
            <h2 id="vercel-guide-title" className="text-lg sm:text-xl font-black text-white truncate">
              Hướng Dẫn Triển Khai Lên Vercel
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Đóng hướng dẫn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content steps */}
        <div className="space-y-4 overflow-y-auto pr-1.5 custom-scrollbar flex-1 text-sm text-slate-300">
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
            <Globe className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-emerald-300 text-sm sm:text-base">Dự Án Vite + React SPA Sẵn Sàng Triển Khai</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Ứng dụng được xây dựng bằng Vite SPA với file cấu hình <code className="text-yellow-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">vercel.json</code> đã thiết lập sẵn quy tắc rewrite đường dẫn.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Step 1 */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-wider block">
                Bước 1: Kiểm Tra Build Tại Máy Local
              </span>
              <p className="text-xs text-slate-300">
                Chạy lệnh kiểm tra cú pháp và build thử để đảm bảo dự án không có lỗi TypeScript:
              </p>
              <pre className="bg-slate-950 p-3 rounded-xl text-emerald-400 text-xs font-mono select-all overflow-x-auto border border-slate-800">
                npm run build
              </pre>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">
                Bước 2: Đẩy Mã Nguồn Lên Repository GitHub
              </span>
              <p className="text-xs text-slate-300">
                Nếu dự án chưa kết nối repository GitHub, thực hiện các lệnh sau:
              </p>
              <pre className="bg-slate-950 p-3 rounded-xl text-emerald-400 text-xs font-mono select-all overflow-x-auto border border-slate-800 leading-relaxed">
                git add .{'\n'}
                git commit -m "Prepare deployment for Vercel"{'\n'}
                git branch -M main{'\n'}
                git remote add origin https://github.com/&lt;USERNAME&gt;/&lt;REPOSITORY_NAME&gt;.git{'\n'}
                git push -u origin main
              </pre>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider block">
                Bước 3: Import Dự Án Vào Vercel.com
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                <li>Truy cập <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline font-bold inline-flex items-center gap-1">Vercel Dashboard <ExternalLink className="w-3 h-3" /></a>.</li>
                <li>Bấm <strong>"Import"</strong> từ Repository GitHub của bạn.</li>
                <li>Vercel tự động phát hiện Framework Preset: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-yellow-300 border border-slate-800">Vite</code>.</li>
                <li>Build Command: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-yellow-300 border border-slate-800">npm run build</code> | Output Directory: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-yellow-300 border border-slate-800">dist</code>.</li>
                <li>Bấm <strong>"Deploy"</strong> và chờ Vercel hoàn tất quá trình biên dịch.</li>
              </ol>
            </div>

            {/* Step 4 */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                Bước 4: Chia Sẻ Đường Dẫn Triển Khai
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Vercel sẽ cấp đường dẫn triển khai chính thức (ví dụ: <code className="text-yellow-300 font-bold">your-project-name.vercel.app</code>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Học sinh và giáo viên có thể mở đường dẫn trực tiếp trên điện thoại, iPad hoặc máy tính để tham gia bài thi.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold rounded-2xl text-sm shadow-lg cursor-pointer transition-all active:scale-95"
          >
            Đã Hiểu, Đóng Hướng Dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
