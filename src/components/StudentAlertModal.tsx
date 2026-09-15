import React, { useEffect, useState } from 'react';
import { TeacherAlertEvent } from '../types';
import { Megaphone, CheckCircle, Volume2, ShieldAlert } from 'lucide-react';
import { soundManager } from '../services/audio';

interface StudentAlertModalProps {
  alertEvent?: TeacherAlertEvent;
  currentPlayerId?: string;
}

export const StudentAlertModal: React.FC<StudentAlertModalProps> = ({
  alertEvent,
  currentPlayerId,
}) => {
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);

  useEffect(() => {
    if (alertEvent && alertEvent.id !== dismissedAlertId) {
      if (alertEvent.targetId === 'ALL' || alertEvent.targetId === currentPlayerId) {
        soundManager.playCorrect();
      }
    }
  }, [alertEvent, currentPlayerId, dismissedAlertId]);

  if (!alertEvent) return null;
  if (dismissedAlertId === alertEvent.id) return null;
  if (alertEvent.targetId !== 'ALL' && alertEvent.targetId !== currentPlayerId) return null;

  const getAlertStyle = () => {
    switch (alertEvent.alertType) {
      case 'SILENCE':
        return {
          bg: 'from-red-950 via-slate-900 to-red-950',
          border: 'border-red-500',
          badgeBg: 'bg-red-600/30 text-red-300 border-red-500/50',
          icon: '🤫',
          title: 'CẢNH BÁO TRẬT TỰ TỪ GIÁO VIÊN',
        };
      case 'FOCUS':
        return {
          bg: 'from-amber-950 via-slate-900 to-amber-950',
          border: 'border-amber-500',
          badgeBg: 'bg-amber-600/30 text-amber-300 border-amber-500/50',
          icon: '📝',
          title: 'NHẮC NHỞ NGHIÊM TÚC LÀM BÀI',
        };
      case 'PRAISE':
        return {
          bg: 'from-emerald-950 via-slate-900 to-emerald-950',
          border: 'border-emerald-500',
          badgeBg: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
          icon: '🌟',
          title: 'KHEN NGỢI TỪ GIÁO VIÊN',
        };
      default:
        return {
          bg: 'from-purple-950 via-slate-900 to-indigo-950',
          border: 'border-purple-500',
          badgeBg: 'bg-purple-600/30 text-purple-300 border-purple-500/50',
          icon: '📢',
          title: 'THÔNG BÁO TRỰC TIẾP TỪ GIÁO VIÊN',
        };
    }
  };

  const style = getAlertStyle();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-lg bg-gradient-to-b ${style.bg} border-2 ${style.border} rounded-3xl p-6 shadow-2xl space-y-6 text-center relative overflow-hidden animate-bounce-slow`}>
        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-md mx-auto ${style.badgeBg}">
          <span className="text-lg">{style.icon}</span>
          <span>{style.title}</span>
        </div>

        {/* Message Content */}
        <div className="space-y-3 py-2">
          <h3 className="text-2xl md:text-3xl font-black text-white leading-relaxed tracking-wide drop-shadow-md">
            "{alertEvent.message}"
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Thông báo gửi lúc {new Date(alertEvent.timestamp).toLocaleTimeString('vi-VN')} tới {alertEvent.targetId === 'ALL' ? 'cả lớp' : 'bạn'}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setDismissedAlertId(alertEvent.id)}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <CheckCircle className="w-5 h-5" />
          ĐÃ HIỂU & TIẾP TỤC LÀM BÀI
        </button>
      </div>
    </div>
  );
};
