import React from 'react';
import { AlertTriangle, UserX, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  playerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  playerName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <UserX className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">Xác Nhận Xóa Học Sinh</h3>
          <p className="text-sm text-slate-300">
            Bạn có chắc chắn muốn xóa <strong className="text-yellow-400">{playerName}</strong> khỏi phòng thi đấu không?
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <UserX className="w-4 h-4" />
            Xóa Khỏi Phòng
          </button>
        </div>
      </div>
    </div>
  );
};
