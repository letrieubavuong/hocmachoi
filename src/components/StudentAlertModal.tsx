import React, { useEffect, useState, useRef, useMemo } from 'react';
import { TeacherAlertEvent, TeacherGiftEvent, PowerUpType } from '../types';
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

// Helper: Strict Target validation (Requirement 10)
const isEventForPlayer = (targetId?: string | null, currentPlayerId?: string): boolean => {
  if (!targetId || typeof targetId !== 'string' || targetId.trim() === '') return false;
  const cleanTarget = targetId.trim();
  if (cleanTarget === 'ALL') return true;
  if (!currentPlayerId) return false;
  return cleanTarget === String(currentPlayerId).trim();
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

const DISMISSED_STORAGE_KEY = 'dismissed_student_notifications_v1';

const getDismissedIdsFromStorage = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const markNotificationDismissedInStorage = (id: string) => {
  try {
    const set = getDismissedIdsFromStorage();
    set.add(id);
    const items = Array.from(set).slice(-100);
    sessionStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(items));
  } catch {}
};

export const StudentAlertModal: React.FC<StudentAlertModalProps> = React.memo(({
  alertEvent,
  giftEvent,
  currentPlayerId,
}) => {
  const [queue, setQueue] = useState<StudentNotification[]>([]);
  const processedIdsRef = useRef<Set<string>>(getDismissedIdsFromStorage());
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync props to internal notification queue safely
  useEffect(() => {
    const newNotifications: StudentNotification[] = [];
    const dismissedIds = getDismissedIdsFromStorage();

    if (alertEvent && isEventForPlayer(alertEvent.targetId, currentPlayerId)) {
      if (!processedIdsRef.current.has(alertEvent.id) && !dismissedIds.has(alertEvent.id)) {
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
      if (!processedIdsRef.current.has(giftEvent.id) && !dismissedIds.has(giftEvent.id)) {
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
    if (queue.length > 0) {
      const currentId = queue[0].id;
      markNotificationDismissedInStorage(currentId);
      processedIdsRef.current.add(currentId);
    }
    setQueue((prev) => prev.slice(1));
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in"
      onClick={(e) => e.stopPropagation()} // Prevent backdrop click propagation
    >
      {current.kind === 'GIFT' ? (
        <StudentGiftCard
          notification={current}
          totalInQueue={totalInQueue}
          onDismiss={handleDismissCurrent}
          buttonRef={buttonRef}
          currentPlayerId={currentPlayerId}
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

// Metadata dictionary for Random Teacher Rewards
const REWARD_METADATA: Record<PowerUpType, {
  name: string;
  icon: string;
  description: string;
  badgeBg: string;
  badgeText: string;
}> = {
  DOUBLE_POINTS: {
    name: '⚡ NHÂN 2 ĐIỂM SỐ',
    icon: '⚡',
    description: 'Nhân đôi điểm số cho câu trả lời đúng tiếp theo của bạn!',
    badgeBg: 'bg-amber-500/20 border-amber-400/50',
    badgeText: 'text-amber-300',
  },
  SHIELD: {
    name: '🛡️ KHIÊN BẢO VỆ +1',
    icon: '🛡️',
    description: 'Nhận 1 Khiên bảo vệ bạn an toàn khỏi đòn cướp điểm!',
    badgeBg: 'bg-cyan-500/20 border-cyan-400/50',
    badgeText: 'text-cyan-300',
  },
  MYSTERY_BOX: {
    name: '🎁 RƯƠNG KHO BÁU (+300 ĐIỂM)',
    icon: '🎁',
    description: 'Cộng trực tiếp +300 điểm may mắn vào tổng điểm của bạn!',
    badgeBg: 'bg-yellow-500/20 border-yellow-400/50',
    badgeText: 'text-yellow-300',
  },
  ORACLE_5050: {
    name: '👁️ MẮT THẦN 50:50',
    icon: '👁️',
    description: 'Tự động bôi đen loại bỏ 2 phương án sai ở câu hỏi tới!',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/50',
    badgeText: 'text-emerald-300',
  },
  ROCKET_BOOST: {
    name: '🚀 TÊN LỬA TĂNG TỐC (+200 ĐIỂM)',
    icon: '🚀',
    description: 'Tăng 200 điểm thưởng tốc độ khi trả lời đúng nhanh < 5s!',
    badgeBg: 'bg-pink-500/20 border-pink-400/50',
    badgeText: 'text-pink-300',
  },
  STREAK_GUARD: {
    name: '🔥 BẢO TOÀN CHUỖI THẮNG',
    icon: '🔥',
    description: 'Giữ nguyên chuỗi đúng nếu lỡ trả lời sai ở câu tiếp theo!',
    badgeBg: 'bg-rose-500/20 border-rose-400/50',
    badgeText: 'text-rose-300',
  },
  REFLECT_SHIELD: {
    name: '👑 KHIÊN PHẢN ĐÒN',
    icon: '👑',
    description: 'Tự động phản đòn và bật ngược sát thương lại kẻ tấn công!',
    badgeBg: 'bg-purple-500/20 border-purple-400/50',
    badgeText: 'text-purple-300',
  },
  FREEZE: {
    name: '❄️ ĐÓNG BĂNG ĐỐI THỦ',
    icon: '❄️',
    description: 'Đóng băng đối thủ trong 5 giây!',
    badgeBg: 'bg-blue-500/20 border-blue-400/50',
    badgeText: 'text-blue-300',
  },
  BOMB: {
    name: '💣 BOM HẸN GIỜ',
    icon: '💣',
    description: 'Đặt bom cướp điểm đối thủ!',
    badgeBg: 'bg-rose-500/20 border-rose-400/50',
    badgeText: 'text-rose-300',
  },
  ATTACK: {
    name: '⚔️ TẤN CÔNG ĐỐI THỦ',
    icon: '⚔️',
    description: 'Tấn công đối thủ!',
    badgeBg: 'bg-purple-500/20 border-purple-400/50',
    badgeText: 'text-purple-300',
  },
};

// Presentation Component: Gift Card with Mystery Chest Opening Animation
interface StudentGiftCardProps {
  notification: Extract<StudentNotification, { kind: 'GIFT' }>;
  totalInQueue: number;
  onDismiss: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  currentPlayerId?: string;
}

const StudentGiftCard: React.FC<StudentGiftCardProps> = ({
  notification,
  totalInQueue,
  onDismiss,
  buttonRef,
  currentPlayerId,
}) => {
  const { event } = notification;
  const isForClass = event.targetId === 'ALL';
  const [chestState, setChestState] = useState<'CLOSED' | 'OPENING' | 'REVEALED'>('CLOSED');

  // Determine the rolled reward assigned for THIS student
  const rolledType: PowerUpType = useMemo(() => {
    if (event.rewardMap && currentPlayerId && event.rewardMap[currentPlayerId]) {
      return event.rewardMap[currentPlayerId];
    }
    return event.powerUpType || 'MYSTERY_BOX';
  }, [event, currentPlayerId]);

  const rewardMeta = REWARD_METADATA[rolledType] || REWARD_METADATA.MYSTERY_BOX;

  const handleOpenChest = () => {
    if (chestState !== 'CLOSED') return;
    setChestState('OPENING');

    try {
      soundManager.playShield();
    } catch {
      // Audio playback catch
    }

    setTimeout(() => {
      setChestState('REVEALED');
      try {
        soundManager.playCorrect();
      } catch {
        // Audio playback catch
      }
    }, 1300);
  };

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
        <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
        <span>🎉 GIÁO VIÊN VỪA TẶNG RƯƠNG THƯỞNG!</span>
      </div>

      {chestState === 'CLOSED' && (
        <div className="space-y-5 py-2 animate-fade-in">
          {/* Closed Mystery Chest Visual */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-2xl animate-pulse" />
            <div className="w-24 h-24 bg-gradient-to-tr from-yellow-500/30 via-amber-400/20 to-purple-500/30 border-2 border-yellow-400 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-yellow-500/30 relative">
              <span className="animate-bounce">🎁</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3
              id="student-gift-title"
              className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-pink-300 leading-snug tracking-wide"
            >
              {event.giftTitle || '🎁 Rương Thưởng May Mắn'}
            </h3>
            <p id="student-gift-desc" className="text-sm text-slate-200 font-medium px-2 leading-relaxed">
              Giáo viên vừa tặng 1 Rương Thưởng May Mắn cho <strong className="text-yellow-300">{isForClass ? 'cả lớp' : 'bạn'}</strong>. Hãy bấm mở để khám phá quà tặng!
            </p>
          </div>

          <button
            onClick={handleOpenChest}
            className="w-full min-h-[52px] py-3.5 px-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-pink-500 hover:from-yellow-300 hover:to-pink-400 text-slate-950 font-black text-lg sm:text-xl rounded-2xl shadow-2xl shadow-yellow-500/40 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer ring-4 ring-yellow-400/30 animate-pulse"
          >
            <Sparkles className="w-6 h-6 text-slate-950 flex-shrink-0" />
            <span>✨ MỞ RƯƠNG THƯỞNG MAY MẮN ✨</span>
          </button>
        </div>
      )}

      {chestState === 'OPENING' && (
        <div className="py-6 space-y-4 text-center animate-fade-in">
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-yellow-400/40 rounded-full blur-2xl animate-ping" />
            <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 via-amber-500 to-pink-500 border-4 border-yellow-200 rounded-3xl flex items-center justify-center text-5xl shadow-2xl animate-bounce">
              🧰
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-black text-yellow-300 tracking-wider animate-pulse">
              ⚡ ĐANG GIẢI MÃ RƯƠNG THƯỞNG...
            </h4>
            <p className="text-xs text-slate-300">Chúc bạn nhận được phần thưởng siêu phẩm!</p>
          </div>
        </div>
      )}

      {chestState === 'REVEALED' && (
        <div className="space-y-5 py-1 animate-scale-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-md bg-emerald-500/20 text-emerald-300 border-emerald-400/50 mx-auto">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>🎉 BẠN ĐÃ MỞ RƯƠNG THÀNH CÔNG!</span>
          </div>

          <div className={`w-24 h-24 border-2 rounded-full flex items-center justify-center text-5xl mx-auto shadow-2xl animate-bounce ${rewardMeta.badgeBg}`}>
            {rewardMeta.icon}
          </div>

          <div className="space-y-2">
            <h3
              id="student-gift-title"
              className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-emerald-300 leading-snug tracking-wide"
            >
              {rewardMeta.name}
            </h3>
            <p id="student-gift-desc" className="text-sm text-slate-200 font-medium px-4 leading-relaxed">
              {rewardMeta.description}
            </p>
          </div>

          <button
            ref={buttonRef}
            onClick={onDismiss}
            className="w-full min-h-[48px] py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
          >
            <CheckCircle className="w-5 h-5 text-slate-950 flex-shrink-0" />
            <span>ĐÃ NHẬN • TIẾP TỤC LÀM BÀI</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Presentation Component: Alert Card
interface StudentAlertCardProps {
  notification: Extract<StudentNotification, { kind: 'ALERT' }>;
  totalInQueue: number;
  onDismiss: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
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
