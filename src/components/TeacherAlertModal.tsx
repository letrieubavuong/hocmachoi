import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Player, BattleSessionState, BattleMode } from '../types';
import {
  Megaphone,
  X,
  Send,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  Swords,
  Shield,
  Lock,
  Radio,
} from 'lucide-react';
import { realtime } from '../services/realtime';
import { soundManager } from '../services/audio';

export const ALL_TARGET = 'ALL';

export type TeacherAlertType = 'WARNING' | 'SILENCE' | 'FOCUS' | 'CUSTOM' | 'PRAISE';

export interface AlertPreset {
  id: string;
  type: TeacherAlertType;
  icon: string;
  title: string;
  message: string;
  color: string;
}

export const ALERT_PRESETS: readonly AlertPreset[] = [
  {
    id: 'silence',
    type: 'SILENCE',
    icon: '🤫',
    title: 'Cấm nói chuyện',
    message: 'Yêu cầu cả lớp giữ trật tự, tuyệt đối không nói chuyện hay gây ồn!',
    color: 'bg-red-600/20 border-red-500/40 text-red-300 hover:bg-red-600/30',
  },
  {
    id: 'focus',
    type: 'FOCUS',
    icon: '📝',
    title: 'Nghiêm túc làm bài',
    message: 'Nghiêm túc tự làm bài, không xem bài hay trao đổi với bạn xung quanh!',
    color: 'bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30',
  },
  {
    id: 'no-tab',
    type: 'WARNING',
    icon: '⚠️',
    title: 'Cấm mở tab khác',
    message: 'Cảnh báo: Tập trung hoàn toàn vào bài test, tuyệt đối không mở tab khác tra cứu!',
    color: 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30',
  },
  {
    id: 'time',
    type: 'WARNING',
    icon: '⏱️',
    title: 'Nhắc nhở thời gian',
    message: 'Thời gian làm bài sắp hết, các em hãy rà soát lại kỹ các câu trả lời!',
    color: 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30',
  },
  {
    id: 'praise',
    type: 'PRAISE',
    icon: '🌟',
    title: 'Khen ngợi lớp',
    message: 'Các em đang làm bài rất tốt, tiếp tục phát huy tốc độ và độ chính xác nhé!',
    color: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30',
  },
] as const;

interface TeacherAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  players: Record<string, Player>;
  initialTargetId?: string;
  battleSessionState?: BattleSessionState;
}

export const TeacherAlertModal: React.FC<TeacherAlertModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  players,
  initialTargetId = ALL_TARGET,
  battleSessionState,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>(initialTargetId);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedAlertType, setSelectedAlertType] = useState<TeacherAlertType>('WARNING');
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sendAlertLockRef = useRef<boolean>(false);

  const playersList = useMemo(() => Object.values(players), [players]);

  const handleToggleFocusMode = useCallback(() => {
    if (!roomCode) return;
    const isFocusActive = !!battleSessionState?.focusModeActive;
    const newFocusState = !isFocusActive;

    realtime.setFocusMode(roomCode, newFocusState);

    if (newFocusState) {
      setSentNotice('🔒 Đã bật Chế độ Tập trung & Khóa toàn bộ Battle!');
    } else {
      setSentNotice('🟢 Đã mở lại Chế độ Trận đấu!');
    }
  }, [roomCode, battleSessionState?.focusModeActive]);

  const handleChangeBattleMode = useCallback(
    (newMode: BattleMode) => {
      if (!roomCode) return;
      realtime.setBattleMode(roomCode, newMode);
      setSentNotice(`⚙️ Đã cập nhật chế độ Battle: ${newMode}`);
    },
    [roomCode]
  );

  // Reset state on modal open or initialTargetId change
  useEffect(() => {
    if (isOpen) {
      const isValidTarget =
        initialTargetId === ALL_TARGET || !!players[initialTargetId];

      setSelectedTarget(isValidTarget ? initialTargetId : ALL_TARGET);
      setCustomMessage('');
      setSelectedPreset(null);
      setSelectedAlertType('WARNING');
      setIsSending(false);
      setShowConfirmModal(false);
      setSentNotice(null);
      setErrorMessage(null);
    }
  }, [isOpen, initialTargetId, players]);

  // Reset stale target if selected student leaves room
  useEffect(() => {
    if (selectedTarget !== ALL_TARGET && !players[selectedTarget]) {
      setSelectedTarget(ALL_TARGET);
    }
  }, [players, selectedTarget]);

  // Timer cleanup for sentNotice
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const currentTargetPlayer = useMemo(
    () => (selectedTarget !== ALL_TARGET ? players[selectedTarget] : null),
    [players, selectedTarget]
  );

  const handleSelectPreset = useCallback((preset: AlertPreset) => {
    setSelectedPreset(preset.id);
    setSelectedAlertType(preset.type);
    setCustomMessage(preset.message);
  }, []);

  const handleInitiateSend = () => {
    if (isSending) return;
    setErrorMessage(null);

    const finalMsg = customMessage.trim();
    if (!finalMsg) {
      setErrorMessage('Vui lòng chọn mẫu hoặc nhập nội dung cảnh báo!');
      return;
    }

    if (!roomCode.trim()) {
      setErrorMessage('Mã phòng không hợp lệ!');
      return;
    }

    if (playersList.length === 0) {
      setErrorMessage('Chưa có học sinh nào trong phòng.');
      return;
    }

    if (selectedTarget === ALL_TARGET) {
      setShowConfirmModal(true);
    } else {
      executeSend();
    }
  };

  const executeSend = async () => {
    if (isSending || sendAlertLockRef.current) return;
    sendAlertLockRef.current = true;
    setIsSending(true);

    try {
      const finalMsg = customMessage.trim();
      const resRoom = realtime.sendTeacherAlert(
        roomCode,
        selectedTarget,
        finalMsg,
        selectedAlertType
      );

      if (resRoom) {
        soundManager.playCorrect();
        const targetText =
          selectedTarget === ALL_TARGET
            ? `toàn bộ ${playersList.length} học sinh`
            : currentTargetPlayer?.name || 'học sinh';

        setSentNotice(`✅ Đã phát thông báo tới ${targetText}!`);
        setShowConfirmModal(false);
        setCustomMessage('');
        setSelectedPreset(null);

        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => {
          setSentNotice(null);
        }, 3500);
      } else {
        setErrorMessage('Không thể phát thông báo. Vui lòng thử lại!');
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra khi phát thông báo.');
    } finally {
      sendAlertLockRef.current = false;
      setIsSending(false);
    }
  };

  // Keyboard Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSending) {
        if (showConfirmModal) {
          setShowConfirmModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSending, showConfirmModal, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-alert-title"
      onClick={() => {
        if (!isSending && !showConfirmModal) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-white relative"
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 border border-purple-500/40 rounded-2xl text-purple-300 shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="teacher-alert-title"
                className="text-lg sm:text-xl font-black text-white"
              >
                GỬI CẢNH BÁO & NHẮC NHỞ HỌC SINH
              </h3>
              <p className="text-xs text-slate-400">
                Phát thông báo nhắc nhở trực tiếp lên màn hình học sinh
              </p>
            </div>
          </div>
          <button
            disabled={isSending}
            aria-label="Đóng cửa sổ cảnh báo"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Host Battle Control Panel */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-3 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                BATTLE CONTROL & CHẾ ĐỘ TẬP TRUNG
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                battleSessionState?.focusModeActive
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {battleSessionState?.focusModeActive ? '🔴 Đã Khóa (Focus Mode)' : '🟢 Battle Mở'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Emergency Focus Mode Button */}
            <button
              onClick={handleToggleFocusMode}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                battleSessionState?.focusModeActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-lg'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg animate-pulse'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>
                {battleSessionState?.focusModeActive
                  ? '🟢 MỞ LẠI BATTLE TIME'
                  : '📚 BẬT CHẾ ĐỘ TẬP TRUNG (KHÓA BATTLE)'}
              </span>
            </button>

            {/* Battle Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Mode:</span>
              <select
                value={battleSessionState?.battleMode || 'ROUND'}
                onChange={(e) => handleChangeBattleMode(e.target.value as BattleMode)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-extrabold text-xs focus:outline-none cursor-pointer"
              >
                <option value="ROUND">⚔️ Battle theo Vòng (5 câu / 10s)</option>
                <option value="RANDOM_TARGET_ONLY">🎯 Target Ngẫu Nhiên (Lớp Học)</option>
                <option value="PER_QUESTION">⚡ Battle Mỗi Câu</option>
                <option value="DISABLED">🔴 Tắt PvP Hoàn Toàn</option>
              </select>
            </div>
          </div>
        </div>
        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 relative z-10"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-0.5 text-rose-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Notification Feedback Toast */}
        {sentNotice && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 bg-emerald-600/30 border border-emerald-500/50 rounded-xl text-emerald-300 font-extrabold text-xs text-center animate-fade-in relative z-10"
          >
            {sentNotice}
          </div>
        )}

        {/* Target Student Selector */}
        <div className="space-y-2 relative z-10">
          <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
            1. Chọn Đối Tượng Nhận Cảnh Báo:
          </label>
          <select
            disabled={isSending}
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-yellow-300 font-extrabold text-xs sm:text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value={ALL_TARGET}>
              📢 Gửi Cho TẤT CẢ Học Sinh Trong Lớp ({playersList.length} HS)
            </option>
            {playersList.map((p) => {
              const switchText =
                (p.tabSwitchCount || 0) > 0
                  ? ` (⚠️ ${p.tabSwitchCount} lần rời tab)`
                  : '';
              const statusText = p.isTabActive === false ? ' [🔴 Đang rời tab]' : '';
              return (
                <option key={p.id} value={p.id}>
                  🎯 Chỉ gửi riêng cho: {p.name}
                  {statusText}
                  {switchText}
                </option>
              );
            })}
          </select>
        </div>

        {/* Mẫu cảnh báo nhanh (Quick Presets) */}
        <div className="space-y-2 relative z-10">
          <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
            2. Các Mẫu Cảnh Báo Nhanh (Bấm để chọn mẫu):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALERT_PRESETS.map((p) => (
              <AlertPresetCard
                key={p.id}
                preset={p}
                isSelected={selectedPreset === p.id}
                isDisabled={isSending}
                onSelect={() => handleSelectPreset(p)}
              />
            ))}
          </div>
        </div>

        {/* Nhập thông điệp tùy chỉnh */}
        <div className="space-y-2 pt-2 border-t border-slate-800 relative z-10">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
              3. Xem / Sửa Nội Dung Cảnh Báo:
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {customMessage.length} / 250
            </span>
          </div>

          <textarea
            disabled={isSending}
            rows={2}
            maxLength={250}
            placeholder="Nhập nội dung nhắc nhở tùy chỉnh (VD: Em Nam trật tự làm bài)..."
            value={customMessage}
            onChange={(e) => {
              setCustomMessage(e.target.value);
              setSelectedPreset(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleInitiateSend();
              }
            }}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Send Summary Box */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs relative z-10 flex-wrap gap-2">
          <div>
            <span className="text-slate-400 font-bold block">NGƯỜI NHẬN:</span>
            <span className="text-white font-black text-xs sm:text-sm">
              {selectedTarget === ALL_TARGET
                ? `📢 Toàn bộ lớp • ${playersList.length} học sinh`
                : currentTargetPlayer
                ? `🎯 ${currentTargetPlayer.name}${
                    currentTargetPlayer.isTabActive === false ? ' [🔴 Đang rời tab]' : ''
                  }`
                : 'Chưa chọn'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-400 font-bold block">LOẠI THÔNG BÁO:</span>
            <span className="text-yellow-400 font-black text-xs sm:text-sm">
              {selectedAlertType === 'SILENCE' && '🤫 Cấm nói chuyện'}
              {selectedAlertType === 'FOCUS' && '📝 Nghiêm túc làm bài'}
              {selectedAlertType === 'WARNING' && '⚠️ Cảnh báo'}
              {selectedAlertType === 'PRAISE' && '🌟 Khen ngợi'}
              {selectedAlertType === 'CUSTOM' && '📢 Tùy chỉnh'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1 relative z-10">
          <button
            disabled={isSending || !customMessage.trim() || playersList.length === 0}
            onClick={handleInitiateSend}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer min-h-[48px]"
          >
            <Send className="w-5 h-5 text-white" />
            <span>
              {isSending
                ? 'ĐANG PHÁT THÔNG BÁO...'
                : selectedTarget === ALL_TARGET
                ? `📢 PHÁT CẢNH BÁO CHO ${playersList.length} HỌC SINH ➔`
                : '🎯 PHÁT CẢNH BÁO CHO HỌC SINH NÀY ➔'}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Sending to ALL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center relative overflow-hidden">
            <button
              disabled={isSending}
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300">
              <Megaphone className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Xác Nhận Phát Cảnh Báo Cả Lớp</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bạn sắp phát thông báo này tới toàn bộ <strong className="text-white">{playersList.length} học sinh</strong> trong phòng.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isSending}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Hủy Bỏ
              </button>
              <button
                disabled={isSending}
                onClick={executeSend}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                Xác Nhận Phát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Sub-component: AlertPresetCard */
const AlertPresetCard: React.FC<{
  preset: AlertPreset;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}> = React.memo(({ preset, isSelected, isDisabled, onSelect }) => {
  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 cursor-pointer ${
        preset.color
      } ${
        isSelected
          ? 'ring-2 ring-purple-400 border-purple-400 bg-purple-600/30 scale-[1.01]'
          : 'opacity-90'
      }`}
    >
      <span className="text-lg shrink-0 mt-0.5">{preset.icon}</span>
      <div className="min-w-0">
        <span className="font-extrabold text-xs block text-white truncate">
          {preset.title}
        </span>
        <span className="text-[11px] opacity-80 leading-tight block line-clamp-2">
          {preset.message}
        </span>
      </div>
    </button>
  );
});

AlertPresetCard.displayName = 'AlertPresetCard';
