import React, { useEffect, useState, useRef } from 'react';
import { TeacherAlertEvent, TeacherGiftEvent } from '../types';
import { CheckCircle, Sparkles } from 'lucide-react';
import { soundManager } from '../services/audio';

export interface StudentAlertModalProps {
  alertEvent?: TeacherAlertEvent;
  giftEvent?: TeacherGiftEvent;
  currentPlayerId?: string;
}

export type StudentNotification =
  | {
      id: string;
      kind: 'GIFT';
      event: TeacherGiftEvent;
      timestamp: number;
    }
  | {
      id: string;
      kind: 'ALERT';
      event: TeacherAlertEvent;
      timestamp: number;
    };

interface AlertStyle {
  bg: string;
  border: string;
  badgeBg: string;
  icon: string;
  title: string;
  role: 'alertdialog' | 'dialog';
}

const ALERT_STYLE_CONFIG: Record<TeacherAlertEvent['alertType'], AlertStyle> = {
  SILENCE: {
    bg: 'from-red-950 via-slate-900 to-red-950',
    border: 'border-red-500/80',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/50',
    icon: '🤫',
    title: 'CẢNH BÁO TRẬT TỰ TỪ GIÁO VIÊN',
    role: 'alertdialog',
  },
  FOCUS: {
    bg: 'from-amber-950 via-slate-900 to-amber-950',
    border: 'border-amber-500/80',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    icon: '📝',
    title: 'NHẮC NHỞ NGHIÊM TÚC LÀM BÀI',
    role: 'alertdialog',
  },
  PRAISE: {
    bg: 'from-emerald-950 via-slate-900 to-emerald-950',
    border: 'border-emerald-500/80',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    icon: '🌟',
    title: 'KHEN NGỢI TỪ GIÁO VIÊN',
    role: 'dialog',
  },
  WARNING: {
    bg: 'from-rose-950 via-slate-900 to-rose-950',
    border: 'border-rose-500/80',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    icon: '⚠️',
    title: 'CẢNH BÁO TỪ GIÁO VIÊN',
    role: 'alertdialog',
  },
  CUSTOM: {
    bg: 'from-purple-950 via-slate-900 to-indigo-950',
    border: 'border-purple-500/80',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    icon: '📢',
    title: 'THÔNG BÁO TRỰC TIẾP TỪ GIÁO VIÊN',
    role: 'dialog',
  },
};

const DEFAULT_ALERT_STYLE: AlertStyle = ALERT_STYLE_CONFIG.CUSTOM;

// Helper: Target validation
const isEventForPlayer = (targetId: string, currentPlayerId?: string): boolean => {
  if (targetId === 'ALL') return true;
  if (!currentPlayerId) return false;
  return targetId === currentPlayerId;
};

// Helper: Safe date formatting
const formatTimestamp = (ts: number): string => {
  if (!ts || isNaN(ts)) return 'Vừa gửi';
  try {
    return new Date(ts).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Vừa gửi';
  }
};

// Helper: Safe notification sound player with error catch
const playNotificationSound = (kind: 'GIFT' | 'ALERT', alertType?: TeacherAlertEvent['alertType']) => {
  try {
    if (kind === 'GIFT') {
      soundManager.playCorrect();
    } else {
      switch (alertType) {
        case 'PRAISE':
          soundManager.playCorrect();
          break;
        case 'WARNING':
        case 'SILENCE':
          soundManager.playWrong();
          break;
        case 'FOCUS':
          soundManager.playShield();
          break;
        default:
          soundManager.playCorrect();
          break;
      }
    }
  } catch (err) {
    console.warn('[StudentAlertModal] Audio playback blocked or unavailable:', err);
  }
};

export const StudentAlertModal: React.FC<StudentAlertModalProps> = React.memo(({
  alertEvent,
  giftEvent,
  currentPlayerId,
}) => {
  const [queue, setQueue] = useState<StudentNotification[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync props to internal notification queue safely
  useEffect(() => {
    const newNotifications: StudentNotification[] = [];

    if (alertEvent && isEventForPlayer(alertEvent.targetId, currentPlayerId)) {
      if (!processedIdsRef.current.has(alertEvent.id)) {
        processedIdsRef.current.add(alertEvent.id);
        newNotifications.push({
          id: alertEvent.id,
          kind: 'ALERT',
          event: alertEvent,
          timestamp: alertEvent.timestamp || Date.now(),
        });
        playNotificationSound('ALERT', alertEvent.alertType);
      }
    }

    if (giftEvent && isEventForPlayer(giftEvent.targetId, currentPlayerId)) {
      if (!processedIdsRef.current.has(giftEvent.id)) {
        processedIdsRef.current.add(giftEvent.id);
        newNotifications.push({
          id: giftEvent.id,
          kind: 'GIFT',
          event: giftEvent,
          timestamp: giftEvent.timestamp || Date.now(),
        });
        playNotificationSound('GIFT');
      }
    }

    if (newNotifications.length > 0) {
      setQueue((prev) => [...prev, ...newNotifications]);
    }

    // Keep processed memory clean if it exceeds 200 items
    if (processedIdsRef.current.size > 200) {
      processedIdsRef.current.clear();
    }
  }, [alertEvent, giftEvent, currentPlayerId]);

  // Focus primary action button when a modal item is displayed
  useEffect(() => {
    if (queue.length > 0) {
      const timer = setTimeout(() => {
        buttonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [queue.length]);

  if (queue.length === 0) return null;

  const current = queue[0];
  const totalInQueue = queue.length;

  const handleDismissCurrent = () => {
    setQueue((prev) => prev.slice(1));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in"
      onClick={(e) => e.stopPropagation()} // Prevent backdrop click propagation
    >
      {current.kind === 'GIFT' ? (
        <StudentGiftCard
          notification={current}
          totalInQueue={totalInQueue}
          onDismiss={handleDismissCurrent}
          buttonRef={buttonRef}
        />
      ) : (
        <StudentAlertCard
          notification={current}
          totalInQueue={totalInQueue}
          onDismiss={handleDismissCurrent}
          buttonRef={buttonRef}
        />
      )}
    </div>
  );
});

StudentAlertModal.displayName = 'StudentAlertModal';

// Presentation Component: Gift Card
interface StudentGiftCardProps {
  notification: Extract<StudentNotification, { kind: 'GIFT' }>;
  totalInQueue: number;
  onDismiss: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

const StudentGiftCard: React.FC<StudentGiftCardProps> = ({
  notification,
  totalInQueue,
  onDismiss,
  buttonRef,
}) => {
  const { event } = notification;
  const isForClass = event.targetId === 'ALL';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-gift-title"
      aria-describedby="student-gift-desc"
      className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-gradient-to-b from-yellow-950 via-slate-900 to-purple-950 border-2 border-yellow-400/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-center relative overflow-hidden motion-reduce:animate-none"
    >
      {/* Queue Counter Badge */}
      {totalInQueue > 1 && (
        <div className="absolute top-3 right-4 px-2.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-[10px] font-black text-yellow-300">
          Thông báo 1 / {totalInQueue}
        </div>
      )}

      {/* Top Tag Header */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-md bg-yellow-500/20 text-yellow-300 border-yellow-400/50 mx-auto mt-1">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <span>🎉 GIÁO VIÊN VỪA TẶNG QUÀ</span>
      </div>

      {/* Icon & Title */}
      <div className="space-y-3 py-1">
        <div className="w-20 h-20 bg-yellow-500/20 border-2 border-yellow-400/80 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg shadow-yellow-500/20">
          🎁
        </div>
        <h3
          id="student-gift-title"
          className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-pink-300 leading-snug tracking-wide break-words text-wrap"
        >
          {event.giftTitle}
        </h3>
        <p id="student-gift-desc" className="text-sm text-slate-200 font-medium px-2 leading-relaxed">
          Giáo viên vừa tặng phần thưởng cho <strong className="text-yellow-300">{isForClass ? 'cả lớp' : 'bạn'}</strong>.
        </p>
      </div>

      {/* Primary Action Button */}
      <button
        ref={buttonRef}
        onClick={onDismiss}
        className="w-full min-h-[48px] py-3.5 px-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-pink-500 hover:from-yellow-400 hover:to-pink-400 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400/50"
      >
        <CheckCircle className="w-5 h-5 text-slate-950 flex-shrink-0" />
        <span>ĐÃ HIỂU • TIẾP TỤC LÀM BÀI</span>
      </button>
    </div>
  );
};

// Presentation Component: Alert Card
interface StudentAlertCardProps {
  notification: Extract<StudentNotification, { kind: 'ALERT' }>;
  totalInQueue: number;
  onDismiss: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

const StudentAlertCard: React.FC<StudentAlertCardProps> = ({
  notification,
  totalInQueue,
  onDismiss,
  buttonRef,
}) => {
  const { event } = notification;
  const style = ALERT_STYLE_CONFIG[event.alertType] || DEFAULT_ALERT_STYLE;
  const isForClass = event.targetId === 'ALL';

  return (
    <div
      role={style.role}
      aria-modal="true"
      aria-labelledby="student-alert-title"
      aria-describedby="student-alert-desc"
      className={`w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-gradient-to-b ${style.bg} border-2 ${style.border} rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-center relative overflow-hidden motion-reduce:animate-none`}
    >
      {/* Queue Counter Badge */}
      {totalInQueue > 1 && (
        <div className="absolute top-3 right-4 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-black text-slate-300">
          Thông báo 1 / {totalInQueue}
        </div>
      )}

      {/* Top Header Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-md mx-auto mt-1 ${style.badgeBg}`}>
        <span className="text-base">{style.icon}</span>
        <span>{style.title}</span>
      </div>

      {/* Message Content */}
      <div className="space-y-3 py-1">
        <h3
          id="student-alert-title"
          className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-snug tracking-wide drop-shadow-md break-words text-wrap px-2"
        >
          {event.message}
        </h3>
        <p id="student-alert-desc" className="text-xs text-slate-300 font-medium">
          Gửi lúc {formatTimestamp(event.timestamp)} tới <strong className="text-white">{isForClass ? 'cả lớp' : 'bạn'}</strong>
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        ref={buttonRef}
        onClick={onDismiss}
        className="w-full min-h-[48px] py-3.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-400/50"
      >
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <span>ĐÃ HIỂU • TIẾP TỤC LÀM BÀI</span>
      </button>
    </div>
  );
};
