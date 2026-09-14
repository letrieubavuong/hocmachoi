import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}/?pin=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
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

        <h3 className="text-xl font-black text-white mb-4">Quét QR hoặc Nhập Mã Phòng</h3>

        {/* Room Code Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-3 px-6 rounded-2xl mb-6 shadow-lg">
          <span className="text-slate-200 text-xs font-bold block">MÃ PHÒNG (GAME PIN)</span>
          <span className="text-4xl font-black text-white tracking-widest">{roomCode}</span>
        </div>

        {/* QR Code Canvas */}
        <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner mb-6 mx-auto w-fit border-4 border-purple-400">
          <QRCodeSVG
            value={joinUrl}
            size={220}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopy}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Đã sao chép đường dẫn!' : 'Sao chép Link Tham Gia'}</span>
        </button>
      </div>
    </div>
  );
};
