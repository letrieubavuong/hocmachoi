import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, AlertCircle, Sparkles } from 'lucide-react';

interface QRCodeModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [customHost, setCustomHost] = useState('');
  if (!isOpen) return null;

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Build join URL: Uses current origin or custom host if provided
  let baseUrl = window.location.origin;
  if (customHost.trim()) {
    baseUrl = customHost.startsWith('http') ? customHost.trim() : `https://${customHost.trim()}`;
  }

  const joinUrl = `${baseUrl}/?pin=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-2 text-purple-400 font-extrabold uppercase text-xs tracking-wider">
          <QrCode className="w-4 h-4" />
          <span>Mã QR Tham Gia Trực Tiếp</span>
        </div>

        <h3 className="text-xl font-black text-white mb-3">Quét QR hoặc Nhập Mã Phòng</h3>

        {/* Room Code Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-3 px-6 rounded-2xl mb-4 shadow-lg">
          <span className="text-slate-200 text-[10px] font-bold block uppercase tracking-widest">MÃ PHÒNG (GAME PIN)</span>
          <span className="text-4xl font-black text-white tracking-widest">{roomCode}</span>
        </div>

        {/* Localhost warning notice */}
        {isLocalhost && !customHost && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left text-xs text-amber-300 space-y-1 mb-4">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Lưu ý khi chạy trên máy tính (localhost):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Điện thoại <strong>không thể mở được địa chỉ "localhost"</strong> từ máy tính.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-300">
              👉 Vui lòng <strong>Deploy Vercel</strong> (đường dẫn online <code className="text-yellow-400 font-bold">.vercel.app</code>) hoặc nhập link Vercel của bạn bên dưới:
            </p>
          </div>
        )}

        {/* Optional Custom Vercel URL override for testing */}
        <div className="mb-4 text-left">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Đường dẫn Vercel / Domain của bạn (tùy chọn):
          </label>
          <input
            type="text"
            placeholder="vd: hocmachoi.vercel.app..."
            value={customHost}
            onChange={(e) => setCustomHost(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600"
          />
        </div>

        {/* QR Code Canvas */}
        <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner mb-4 mx-auto w-fit border-4 border-purple-400">
          <QRCodeSVG
            value={joinUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopy}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Đã sao chép link!' : `Sao chép Link: ${joinUrl}`}</span>
        </button>
      </div>
    </div>
  );
};
