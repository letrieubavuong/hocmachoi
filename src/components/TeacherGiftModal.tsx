import React, { useState } from 'react';
import { Player, PowerUpType } from '../types';
import { Gift, Zap, Shield, Eye, Rocket, Sparkles, Send, Users, Trophy } from 'lucide-react';
import { ChibiAvatar } from './ChibiAvatar';

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
  initialTargetId = 'ALL',
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId);
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType>('DOUBLE_POINTS');

  if (!isOpen) return null;

  const rewardOptions: {
    type: PowerUpType;
    name: string;
    description: string;
    icon: React.ReactNode;
    badgeColor: string;
  }[] = [
    {
      type: 'DOUBLE_POINTS',
      name: '⚡ Nhân 2 Điểm Số',
      description: 'Nhân đôi điểm số cho câu trả lời tiếp theo!',
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      badgeColor: 'border-amber-500/50 bg-amber-500/10 hover:border-amber-400',
    },
    {
      type: 'SHIELD',
      name: '🛡️ Khiên Bảo Vệ',
      description: 'Bảo vệ học sinh khỏi 1 đòn tấn công cướp điểm!',
      icon: <Shield className="w-6 h-6 text-cyan-400" />,
      badgeColor: 'border-cyan-500/50 bg-cyan-500/10 hover:border-cyan-400',
    },
    {
      type: 'ORACLE_5050',
      name: '👁️ Mắt Thần 50:50',
      description: 'Loại bỏ ngay 2 lựa chọn sai ở câu tiếp theo!',
      icon: <Eye className="w-6 h-6 text-emerald-400" />,
      badgeColor: 'border-emerald-500/50 bg-emerald-500/10 hover:border-emerald-400',
    },
    {
      type: 'MYSTERY_BOX',
      name: '🎁 Rương Kho Báu (+300 PT)',
      description: 'Cộng trực tiếp +300 điểm thưởng may mắn!',
      icon: <Gift className="w-6 h-6 text-yellow-400 animate-bounce" />,
      badgeColor: 'border-yellow-500/50 bg-yellow-500/10 hover:border-yellow-400',
    },
    {
      type: 'ROCKET_BOOST',
      name: '🚀 Tên Lửa Tăng Tốc (+300 PT)',
      description: 'Tăng tốc bứt phá vị trí trên Bảng Xếp Hạng!',
      icon: <Rocket className="w-6 h-6 text-pink-400" />,
      badgeColor: 'border-pink-500/50 bg-pink-500/10 hover:border-pink-400',
    },
    {
      type: 'REFLECT_SHIELD',
      name: '👑 Khiên Phản Đòn',
      description: 'Phản lại đòn đánh sát thương của đối thủ!',
      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
      badgeColor: 'border-purple-500/50 bg-purple-500/10 hover:border-purple-400',
    },
  ];

  const handleSend = () => {
    const selectedOpt = rewardOptions.find((r) => r.type === selectedPowerUp);
    const title = selectedOpt ? selectedOpt.name : 'Phần thưởng từ Giáo viên';
    onSendGift(selectedTargetId, selectedPowerUp, title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-yellow-500/50 rounded-3xl p-6 shadow-2xl space-y-6 text-white overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-2xl text-yellow-400">
              <Gift className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-pink-400">
                TẶNG PHẦN THƯỞNG CHO HỌC SINH
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Cấp vật phẩm/điểm thưởng cho Toàn bộ lớp học hoặc Học sinh cụ thể
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Choose Target */}
        <div className="space-y-3 relative z-10">
          <label className="block text-xs font-black text-amber-400 uppercase tracking-wider">
            1. CHỌN NƠI GỬI QUÀ:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            <button
              onClick={() => setSelectedTargetId('ALL')}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedTargetId === 'ALL'
                  ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-yellow-400 ring-2 ring-yellow-400/50 scale-101'
                  : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="p-2.5 bg-yellow-400/20 border border-yellow-400/40 rounded-xl text-yellow-300">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-black text-white text-sm block">🌐 TOÀN BỘ LỚP HỌC</span>
                <span className="text-xs text-yellow-400 font-semibold">Tặng cho tất cả học sinh</span>
              </div>
            </button>

            {players.map((p) => {
              const isSelected = selectedTargetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-yellow-400 ring-2 ring-yellow-400/50 scale-101'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <ChibiAvatar customization={p.chibi} size="sm" isBouncing={false} />
                  <div className="text-left">
                    <span className="font-extrabold text-white text-sm block flex items-center gap-1.5">
                      {p.name}
                      {p.studentCode && (
                        <span className="text-[10px] text-purple-300 font-mono bg-purple-950 px-1.5 py-0.5 rounded border border-purple-500/40">
                          {p.studentCode}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-yellow-400 font-bold">{p.score} điểm</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Choose Power-Up Reward */}
        <div className="space-y-3 relative z-10">
          <label className="block text-xs font-black text-amber-400 uppercase tracking-wider">
            2. CHỌN VẬT PHẨM / PHẦN THƯỞNG:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewardOptions.map((opt) => {
              const isSelected = selectedPowerUp === opt.type;
              return (
                <button
                  key={opt.type}
                  onClick={() => setSelectedPowerUp(opt.type)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    opt.badgeColor
                  } ${
                    isSelected
                      ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-yellow-400/20 scale-101'
                      : ''
                  }`}
                >
                  <div className="p-2 bg-slate-900/80 border border-slate-700 rounded-xl shrink-0 mt-0.5">
                    {opt.icon}
                  </div>
                  <div>
                    <span className="font-black text-white text-sm block">{opt.name}</span>
                    <span className="text-xs text-slate-300 font-medium block mt-0.5">
                      {opt.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 relative z-10">
          <button
            onClick={handleSend}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-pink-500 hover:from-yellow-400 hover:to-pink-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-5 h-5 text-slate-950" />
            🚀 TẶNG PHẦN THƯỞNG NGAY CHO HỌC SINH!
          </button>
        </div>
      </div>
    </div>
  );
};
