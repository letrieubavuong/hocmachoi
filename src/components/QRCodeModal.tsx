import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, AlertCircle } from 'lucide-react';

interface QRCodeModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

// Helper: Safely construct the join URL using Web URL API
export function buildJoinUrl(rawBaseUrl: string, rawRoomCode: string, customHostInput: string): {
  url: string;
  isValid: boolean;
  error?: string;
} {
  const cleanCode = (rawRoomCode || '').trim();
  if (!cleanCode) {
    return { url: '', isValid: false, error: 'Chưa có mã phòng.' };
  }

  let base = (rawBaseUrl || '').trim();
  const custom = customHostInput.trim();

  if (custom) {
    base = custom.startsWith('http://') || custom.startsWith('https://')
      ? custom
      : `https://${custom}`;
  }

  try {
    const parsedUrl = new URL(base);
    parsedUrl.searchParams.set('pin', cleanCode);
    return { url: parsedUrl.toString(), isValid: true };
  } catch {
    return { url: '', isValid: false, error: 'Đường dẫn website không hợp lệ.' };
  }
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [customHost, setCustomHost] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanRoomCode = (roomCode || '').trim();

  // Reset copied state & focus when modal opens or code changes
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setCopyError(null);
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, roomCode, customHost, onClose]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const isLocalhost = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }, []);

  const currentOrigin = useMemo(() => {
    if (typeof window === 'undefined') return 'https://localhost';
    return window.location.origin;
  }, []);

  const { url: joinUrl, isValid: isUrlValid, error: urlError } = useMemo(() => {
    return buildJoinUrl(currentOrigin, cleanRoomCode, customHost);
  }, [currentOrigin, cleanRoomCode, customHost]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!joinUrl || !isUrlValid) return;

    setCopyError(null);

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(joinUrl);
        setCopied(true);
      } else {
        // Fallback for non-HTTPS or unsupported browsers
        setCopyError('Không thể sao chép tự động. Hãy chọn và sao chép thủ công bên dưới.');
      }
    } catch (err) {
      setCopyError('Không thể sao chép tự động. Hãy chọn và sao chép thủ công bên dưới.');
    }

    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2500);
  };

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
        aria-labelledby="qr-modal-title"
        className="relative w-full max-w-md bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-center max-h-[92dvh] overflow-y-auto"
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Đóng mã QR"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-2 text-purple-400 font-extrabold uppercase text-xs tracking-wider">
          <QrCode className="w-4 h-4 shrink-0 text-purple-400" />
          <span>Mã QR Tham Gia Trực Tiếp</span>
        </div>

        <h3 id="qr-modal-title" className="text-xl font-black text-white mb-3">
          Quét QR hoặc Nhập Mã Phòng
        </h3>

        {/* Room Code Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 py-3.5 px-6 rounded-2xl mb-4 shadow-lg">
          <span className="text-slate-200 text-[10px] font-bold block uppercase tracking-widest">
            MÃ PHÒNG (GAME PIN)
          </span>
          <span className="text-3xl sm:text-4xl font-black text-white tracking-widest select-all">
            {cleanRoomCode || '---'}
          </span>
        </div>

        {/* Localhost Warning Notice */}
        {isLocalhost && !customHost && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left text-xs text-amber-300 space-y-1 mb-4">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Lưu ý khi chạy trên máy tính (localhost):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Thiết bị khác (điện thoại/iPad) <strong>không thể mở địa chỉ "localhost"</strong> của máy tính.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-300">
              👉 Hãy <strong>triển khai Vercel</strong> (domain dạng <code className="text-yellow-400 font-bold">.vercel.app</code>) hoặc nhập IP LAN / domain bên dưới:
            </p>
          </div>
        )}

        {/* Optional Custom Host Field */}
        <div className="mb-4 text-left">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Đường dẫn website / domain (tùy chọn):
          </label>
          <input
            type="text"
            placeholder="vd: hocmachoi.vercel.app hoặc 192.168.1.10:5173..."
            value={customHost}
            onChange={(e) => {
              setCustomHost(e.target.value);
              setCopied(false);
            }}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 font-mono"
          />
          {customHost.trim() && !isUrlValid && (
            <p className="text-[11px] font-bold text-rose-400 mt-1">{urlError}</p>
          )}
        </div>

        {/* QR Code Canvas */}
        <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner mb-4 mx-auto w-fit border-4 border-purple-400">
          {isUrlValid ? (
            <QRCodeSVG
              value={joinUrl}
              size={180}
              level="H"
              includeMargin={true}
            />
          ) : (
            <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-400 font-bold text-xs text-center p-2">
              {urlError || 'Chưa có dữ liệu QR'}
            </div>
          )}
        </div>

        {/* Join URL Display & Copy Link Button */}
        {isUrlValid && (
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-left">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Link tham gia:</span>
              <span className="text-xs text-yellow-300 font-mono break-all select-all block mt-0.5">
                {joinUrl}
              </span>
            </div>

            <button
              type="button"
              disabled={!isUrlValid}
              onClick={handleCopy}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs cursor-pointer min-h-[44px]"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
              <span>{copied ? 'Đã sao chép link tham gia!' : 'Sao chép đường dẫn tham gia'}</span>
            </button>

            {copyError && (
              <p className="text-[11px] font-bold text-rose-400 bg-rose-950/60 p-2 rounded-lg border border-rose-500/40">
                {copyError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
