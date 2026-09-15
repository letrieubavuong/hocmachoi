import React, { useEffect, useState } from 'react';
import { TeacherAlertEvent, TeacherGiftEvent } from '../types';
import { Megaphone, CheckCircle, Gift, Zap, Shield, Eye, Rocket, Sparkles } from 'lucide-react';
import { soundManager } from '../services/audio';

interface StudentAlertModalProps {
  alertEvent?: TeacherAlertEvent;
  giftEvent?: TeacherGiftEvent;
  currentPlayerId?: string;
}

export const StudentAlertModal: React.FC<StudentAlertModalProps> = ({
  alertEvent,
  giftEvent,
  currentPlayerId,
}) => {
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [dismissedGiftId, setDismissedGiftId] = useState<string | null>(null);

  useEffect(() => {
    if (alertEvent && alertEvent.id !== dismissedAlertId) {
      if (alertEvent.targetId === 'ALL' || alertEvent.targetId === currentPlayerId) {
        soundManager.playCorrect();
      }
    }
  }, [alertEvent, currentPlayerId, dismissedAlertId]);

  useEffect(() => {
    if (giftEvent && giftEvent.id !== dismissedGiftId) {
      if (giftEvent.targetId === 'ALL' || giftEvent.targetId === currentPlayerId) {
        soundManager.playCorrect();
      }
    }
  }, [giftEvent, currentPlayerId, dismissedGiftId]);

  // Priority 1: Render Teacher Gift Modal if active for this student
  if (giftEvent && dismissedGiftId !== giftEvent.id && (giftEvent.targetId === 'ALL' || giftEvent.targetId === currentPlayerId)) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in font-sans">
        <div className="w-full max-w-lg bg-gradient-to-b from-yellow-950 via-slate-900 to-purple-950 border-2 border-yellow-400 rounded-3xl p-6 shadow-2xl space-y-6 text-center relative overflow-hidden animate-bounce-slow">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-md bg-yellow-500/20 text-yellow-300 border-yellow-400/50">
            <Gift className="w-5 h-5 text-yellow-400 animate-bounce" />
            <span>🎉 GIÁO VIÊN VỪA TẶNG QUÀ</span>
          </div>

          <div className="space-y-3 py-2">
            <div className="w-20 h-20 bg-yellow-500/20 border-2 border-yellow-400 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg shadow-yellow-500/20">
              🎁
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-pink-300 leading-relaxed tracking-wide">
              {giftEvent.giftTitle}
            </h3>
            <p className="text-sm text-slate-200 font-semibold">
              Giáo viên đã gửi tặng <strong className="text-yellow-300">{giftEvent.giftTitle}</strong> cho {giftEvent.targetId === 'ALL' ? 'cả lớp' : 'bạn'}!
            </p>
          </div>

          <button
            onClick={() => setDismissedGiftId(giftEvent.id)}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-pink-500 hover:from-yellow-400 hover:to-pink-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5 text-slate-950" />
            NHẬN QUÀ & TIẾP TỤC LÀM BÀI ➔
          </button>
        </div>
      </div>
    );
  }

  // Priority 2: Render Teacher Alert Modal if active
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
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-md mx-auto ${style.badgeBg}`}>
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
