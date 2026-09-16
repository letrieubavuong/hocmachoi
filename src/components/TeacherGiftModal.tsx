import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Player, PowerUpType } from '../types';
import { Gift, Zap, Shield, Eye, Rocket, Sparkles, Send, Users, Search, X, AlertCircle } from 'lucide-react';
import { ChibiAvatar } from './ChibiAvatar';

export const ALL_PLAYERS_TARGET = 'ALL';

export interface TeacherRewardOption {
  type: PowerUpType;
  name: string;
  shortName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
}

export const TEACHER_REWARD_OPTIONS: TeacherRewardOption[] = [
  {
    type: 'DOUBLE_POINTS',
    name: '⚡ Nhân 2 điểm số',
    shortName: 'Nhân 2 điểm',
    description: 'Nhân đôi điểm số cho câu trả lời tiếp theo!',
    icon: Zap,
    badgeColor: 'border-amber-500/50 bg-amber-500/10 hover:border-amber-400 text-amber-400',
  },
  {
    type: 'SHIELD',
    name: '🛡️ Khiên bảo vệ',
    shortName: 'Khiên bảo vệ',
    description: 'Bảo vệ học sinh khỏi 1 đòn tấn công cướp điểm!',
    icon: Shield,
    badgeColor: 'border-cyan-500/50 bg-cyan-500/10 hover:border-cyan-400 text-cyan-400',
  },
  {
    type: 'ORACLE_5050',
    name: '👁️ Mắt thần 50:50',
    shortName: 'Mắt thần 50:50',
    description: 'Loại bỏ ngay 2 lựa chọn sai ở câu tiếp theo!',
    icon: Eye,
    badgeColor: 'border-emerald-500/50 bg-emerald-500/10 hover:border-emerald-400 text-emerald-400',
  },
  {
    type: 'MYSTERY_BOX',
    name: '🎁 Rương kho báu (+300 điểm)',
    shortName: 'Rương kho báu',
    description: 'Cộng trực tiếp +300 điểm thưởng may mắn!',
    icon: Gift,
    badgeColor: 'border-yellow-500/50 bg-yellow-500/10 hover:border-yellow-400 text-yellow-400',
  },
  {
    type: 'ROCKET_BOOST',
    name: '🚀 Tên lửa tăng tốc (+300 điểm)',
    shortName: 'Tên lửa tăng tốc',
    description: 'Tăng tốc bứt phá vị trí trên Bảng Xếp Hạng!',
    icon: Rocket,
    badgeColor: 'border-pink-500/50 bg-pink-500/10 hover:border-pink-400 text-pink-400',
  },
  {
    type: 'REFLECT_SHIELD',
    name: '👑 Khiên phản đòn',
    shortName: 'Khiên phản đòn',
    description: 'Phản lại đòn đánh sát thương của đối thủ!',
    icon: Sparkles,
    badgeColor: 'border-purple-500/50 bg-purple-500/10 hover:border-purple-400 text-purple-400',
  },
];

interface TeacherGiftModalProps {
  isOpen: boolean;
  players: Player[];
  onSendGift: (targetId: string, powerUpType: PowerUpType, giftTitle: string) => void;
  onClose: () => void;
  initialTargetId?: string;
}

export const TeacherGiftModal: React.FC<TeacherGiftModalProps> = ({
  isOpen,
  players,
  onSendGift,
  onClose,
  initialTargetId = ALL_PLAYERS_TARGET,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId);
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType>('DOUBLE_POINTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state on modal open or initialTargetId change
  useEffect(() => {
    if (isOpen) {
      const isValidTarget =
        initialTargetId === ALL_PLAYERS_TARGET ||
        players.some((p) => p.id === initialTargetId);

      setSelectedTargetId(isValidTarget ? initialTargetId : ALL_PLAYERS_TARGET);
      setSelectedPowerUp('DOUBLE_POINTS');
      setIsSending(false);
      setShowConfirmModal(false);
      setSearchQuery('');
      setErrorMessage(null);
    }
  }, [isOpen, initialTargetId, players]);

  // Handle stale target: if target player disappears from active players list
  useEffect(() => {
    if (
      selectedTargetId !== ALL_PLAYERS_TARGET &&
      !players.some((p) => p.id === selectedTargetId)
    ) {
      setSelectedTargetId(ALL_PLAYERS_TARGET);
    }
  }, [players, selectedTargetId]);

  // Filtered players for target selection
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.trim().toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.studentCode && p.studentCode.toLowerCase().includes(q))
    );
  }, [players, searchQuery]);

  // Selected Option Metadata
  const currentRewardOpt = useMemo(
    () =>
      TEACHER_REWARD_OPTIONS.find((r) => r.type === selectedPowerUp) ||
      TEACHER_REWARD_OPTIONS[0],
    [selectedPowerUp]
  );

  // Selected Target Metadata
  const currentTargetPlayer = useMemo(
    () => players.find((p) => p.id === selectedTargetId),
    [players, selectedTargetId]
  );

  const handleInitiateSend = () => {
    if (isSending) return;
    setErrorMessage(null);

    if (players.length === 0) {
      setErrorMessage('Chưa có học sinh nào trong phòng thi đấu.');
      return;
    }

    if (selectedTargetId !== ALL_PLAYERS_TARGET && !currentTargetPlayer) {
      setErrorMessage('Học sinh được chọn không còn trong phòng thi.');
      return;
    }

    if (selectedTargetId === ALL_PLAYERS_TARGET) {
      setShowConfirmModal(true);
    } else {
      executeSend();
    }
  };

  const executeSend = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const title = currentRewardOpt.name;
      await Promise.resolve(onSendGift(selectedTargetId, selectedPowerUp, title));
      setShowConfirmModal(false);
      onClose();
    } catch (err) {
      setErrorMessage('Có lỗi xảy ra khi gửi phần thưởng. Vui lòng thử lại!');
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard Esc Listener
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
      aria-labelledby="teacher-gift-title"
      onClick={() => {
        if (!isSending && !showConfirmModal) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-slate-900 border-2 border-yellow-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-white"
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/20 border border-yellow-400/50 rounded-2xl text-yellow-400 shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="teacher-gift-title"
                className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-pink-400"
              >
                TẶNG PHẦN THƯỞNG GIÁO VIÊN
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Cấp vật phẩm/điểm thưởng cho Toàn bộ lớp học hoặc Học sinh cụ thể
              </p>
            </div>
          </div>

          <button
            disabled={isSending}
            aria-label="Đóng cửa sổ tặng phần thưởng"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
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

        {/* Section 1: Choose Target */}
        <div className="space-y-2.5 relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-black text-amber-400 uppercase tracking-wider">
              1. CHỌN NƠI GỬI QUÀ:
            </label>
            {players.length > 6 && (
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm học sinh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
            {/* Target option: ALL */}
            <button
              disabled={isSending || players.length === 0}
              onClick={() => setSelectedTargetId(ALL_PLAYERS_TARGET)}
              className={`flex items-center gap-2.5 p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                selectedTargetId === ALL_PLAYERS_TARGET
                  ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-yellow-400 ring-2 ring-yellow-400/50 scale-[1.01]'
                  : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
              } ${players.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="p-2 bg-yellow-400/20 border border-yellow-400/40 rounded-xl text-yellow-300 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-white text-xs sm:text-sm block truncate">
                  🌐 TOÀN BỘ LỚP HỌC
                </span>
                <span className="text-[11px] text-yellow-400 font-semibold block">
                  Tặng cho {players.length} học sinh
                </span>
              </div>
            </button>

            {/* Target options: Individual Players */}
            {filteredPlayers.map((p) => (
              <PlayerTargetCard
                key={p.id}
                player={p}
                isSelected={selectedTargetId === p.id}
                isDisabled={isSending}
                onSelect={() => setSelectedTargetId(p.id)}
              />
            ))}
          </div>
        </div>

        {/* Section 2: Choose Power-Up Reward */}
        <div className="space-y-2.5 relative z-10">
          <label className="block text-xs font-black text-amber-400 uppercase tracking-wider">
            2. CHỌN VẬT PHẨM / PHẦN THƯỞNG:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TEACHER_REWARD_OPTIONS.map((opt) => (
              <TeacherRewardCard
                key={opt.type}
                option={opt}
                isSelected={selectedPowerUp === opt.type}
                isDisabled={isSending}
                onSelect={() => setSelectedPowerUp(opt.type)}
              />
            ))}
          </div>
        </div>

        {/* Send Summary Box */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs relative z-10 flex-wrap gap-2">
          <div>
            <span className="text-slate-400 font-bold block">NGƯỜI NHẬN:</span>
            <span className="text-white font-black text-sm">
              {selectedTargetId === ALL_PLAYERS_TARGET
                ? `🌐 Toàn bộ lớp • ${players.length} học sinh`
                : currentTargetPlayer
                ? `👤 ${currentTargetPlayer.name}${
                    currentTargetPlayer.studentCode
                      ? ` (${currentTargetPlayer.studentCode})`
                      : ''
                  }`
                : 'Chưa chọn'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-400 font-bold block">PHẦN THƯỞNG:</span>
            <span className="text-yellow-400 font-black text-sm">
              {currentRewardOpt.name}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1 relative z-10">
          <button
            disabled={isSending || players.length === 0}
            onClick={handleInitiateSend}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-pink-500 hover:from-yellow-400 hover:to-pink-400 disabled:opacity-50 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer min-h-[48px]"
          >
            <Send className="w-5 h-5 text-slate-950" />
            <span>
              {isSending ? 'ĐANG GỬI PHẦN THƯỞNG...' : '🚀 TẶNG PHẦN THƯỞNG NGAY!'}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Sending to ALL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-yellow-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center relative overflow-hidden">
            <button
              disabled={isSending}
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-yellow-500/20 border border-yellow-400/50 flex items-center justify-center text-yellow-400">
              <Users className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Xác Nhận Tặng Cả Lớp</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bạn sắp tặng <strong className="text-yellow-400">{currentRewardOpt.name}</strong> cho toàn bộ <strong className="text-white">{players.length} học sinh</strong> trong phòng.
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
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-yellow-500/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                Xác Nhận Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Sub-component: PlayerTargetCard */
const PlayerTargetCard: React.FC<{
  player: Player;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}> = React.memo(({ player, isSelected, isDisabled, onSelect }) => {
  return (
    <button
      disabled={isDisabled}
      onClick={onSelect}
      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
        isSelected
          ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-yellow-400 ring-2 ring-yellow-400/50 scale-[1.01]'
          : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
      }`}
    >
      <ChibiAvatar customization={player.chibi} size="sm" isBouncing={false} />
      <div className="min-w-0">
        <span className="font-extrabold text-white text-xs sm:text-sm block truncate">
          {player.name}
          {player.studentCode && (
            <span className="ml-1 text-[9px] text-purple-300 font-mono bg-purple-950 px-1 py-0.2 rounded border border-purple-500/40">
              {player.studentCode}
            </span>
          )}
        </span>
        <span className="text-[11px] text-yellow-400 font-bold block">
          {player.score} điểm
        </span>
      </div>
    </button>
  );
});

PlayerTargetCard.displayName = 'PlayerTargetCard';

/* Sub-component: TeacherRewardCard */
const TeacherRewardCard: React.FC<{
  option: TeacherRewardOption;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}> = React.memo(({ option, isSelected, isDisabled, onSelect }) => {
  const IconComp = option.icon;

  return (
    <button
      disabled={isDisabled}
      onClick={onSelect}
      className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
        option.badgeColor
      } ${
        isSelected
          ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-yellow-400/20 scale-[1.01]'
          : ''
      }`}
    >
      <div className="p-2 bg-slate-900/80 border border-slate-700 rounded-xl shrink-0 mt-0.5">
        <IconComp className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <span className="font-black text-white text-xs sm:text-sm block truncate">
          {option.name}
        </span>
        <span className="text-[11px] text-slate-300 font-medium block mt-0.5 leading-snug">
          {option.description}
        </span>
      </div>
    </button>
  );
});

TeacherRewardCard.displayName = 'TeacherRewardCard';
