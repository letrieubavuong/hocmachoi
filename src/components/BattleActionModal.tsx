import React, { useState } from 'react';
import { Player, PowerUpType } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { Swords, ShieldAlert, Zap, Gift, Snowflake, Shield } from 'lucide-react';
import { soundManager } from '../services/audio';

interface BattleActionModalProps {
  attacker: Player;
  opponents: Player[];
  isOpen: boolean;
  powerUpType?: PowerUpType | null;
  onExecutePowerUp: (targetId: string, powerUpType: PowerUpType) => {
    success: boolean;
    blocked: boolean;
    stolenPoints: number;
    mysteryBonus?: number;
  } | null;
  onClose: () => void;
}

export const BattleActionModal: React.FC<BattleActionModalProps> = ({
  attacker,
  opponents,
  isOpen,
  powerUpType = 'ATTACK',
  onExecutePowerUp,
  onClose,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{
    blocked: boolean;
    stolenPoints: number;
    mysteryBonus?: number;
    targetName: string;
    type: PowerUpType;
  } | null>(null);

  if (!isOpen) return null;

  const currentPowerType: PowerUpType = powerUpType || 'ATTACK';
  const validTargets = opponents.filter((p) => p.id !== attacker.id);

  const handleExecute = (overrideTargetId?: string) => {
    const targetIdToUse = overrideTargetId || selectedTargetId || attacker.id;
    const target = opponents.find((p) => p.id === targetIdToUse) || attacker;

    const res = onExecutePowerUp(targetIdToUse, currentPowerType);
    if (res) {
      if (res.blocked) {
        soundManager.playShieldBlock();
      } else {
        soundManager.playAttack();
      }

      setBattleResult({
        blocked: res.blocked,
        stolenPoints: res.stolenPoints,
        mysteryBonus: res.mysteryBonus,
        targetName: target.name,
        type: currentPowerType,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-center overflow-hidden">
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-2 text-amber-400 font-extrabold uppercase text-xs tracking-wider">
          <SparklesIcon type={currentPowerType} />
          <span>Thưởng Chuỗi Trả Lời Đúng</span>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {currentPowerType === 'ATTACK' && '⚔️ MỞ KHÓA THẺ TẤN CÔNG!'}
          {currentPowerType === 'FREEZE' && '❄️ MỞ KHÓA THẺ ĐÓNG BĂNG!'}
          {currentPowerType === 'DOUBLE_POINTS' && '⚡ MỞ KHÓA VÒNG THƯỞNG X2 ĐIỂM!'}
          {currentPowerType === 'MYSTERY_BOX' && '🎁 RƯƠNG KHO BÁU MAY MẮN!'}
        </h2>

        <p className="text-xs text-slate-300 mb-6">
          {currentPowerType === 'ATTACK' && 'Chọn đối thủ để cướp 20% điểm số! (Có thể bị Khiên chặn)'}
          {currentPowerType === 'FREEZE' && 'Chọn 1 đối thủ để đóng băng màn hình trong 6 giây!'}
          {currentPowerType === 'DOUBLE_POINTS' && 'Kích hoạt nhân 2 điểm số cho câu hỏi tiếp theo!'}
          {currentPowerType === 'MYSTERY_BOX' && 'Mở rương kho báu để nhận ngẫu nhiên điểm thưởng khủng!'}
        </p>

        {/* Result Banner */}
        {battleResult ? (
          <div className="py-6 px-4 space-y-4 bg-slate-800/90 rounded-2xl border border-slate-700">
            {battleResult.type === 'MYSTERY_BOX' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center">
                  <Gift className="w-9 h-9 text-yellow-400 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-yellow-300">TRÚNG RƯƠNG KHO BÁU!</h3>
                <p className="text-sm text-slate-300">
                  Bạn nhận được <strong className="text-yellow-400 text-xl">+{battleResult.mysteryBonus} Điểm Thưởng</strong> ngẫu nhiên!
                </p>
              </div>
            )}

            {battleResult.type === 'DOUBLE_POINTS' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
                  <Zap className="w-9 h-9 text-amber-400 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-amber-300">ĐÃ KÍCH HOẠT X2 ĐIỂM!</h3>
                <p className="text-sm text-slate-300">
                  Câu hỏi tiếp theo trả lời đúng sẽ nhận <strong className="text-amber-400 font-bold">GẤP ĐÔI ĐIỂM SỐ</strong>!
                </p>
              </div>
            )}

            {battleResult.type === 'FREEZE' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center">
                  <Snowflake className="w-9 h-9 text-cyan-300 animate-spin" />
                </div>
                <h3 className="text-xl font-black text-cyan-300">ĐÃ ĐÓNG BĂNG ĐỐI THỦ!</h3>
                <p className="text-sm text-slate-300">
                  <strong className="text-white">{battleResult.targetName}</strong> đã bị đóng băng màn hình trong 6 giây!
                </p>
              </div>
            )}

            {battleResult.type === 'ATTACK' && (
              battleResult.blocked ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center">
                    <ShieldAlert className="w-9 h-9 text-cyan-300 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-cyan-300">ĐỐI THỦ CÓ KHIÊN BẢO VỆ!</h3>
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">{battleResult.targetName}</strong> đã dùng khiên chặn thành công đòn đánh của bạn! Tấm khiên đã bị vỡ!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
                    <Zap className="w-9 h-9 text-amber-400 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-black text-amber-400">TẤN CÔNG THÀNH CÔNG!</h3>
                  <p className="text-sm text-slate-300">
                    Bạn đã cướp thành công <strong className="text-yellow-400 text-lg">+{battleResult.stolenPoints} điểm</strong> từ <strong className="text-white">{battleResult.targetName}</strong>!
                  </p>
                </div>
              )
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Tiếp Tục Chơi
            </button>
          </div>
        ) : (
          /* Selection / Instant Activation Body */
          <div>
            {currentPowerType === 'MYSTERY_BOX' || currentPowerType === 'DOUBLE_POINTS' ? (
              <div className="py-6 space-y-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center animate-bounce shadow-2xl">
                  {currentPowerType === 'MYSTERY_BOX' ? (
                    <Gift className="w-12 h-12 text-yellow-400" />
                  ) : (
                    <Zap className="w-12 h-12 text-amber-400" />
                  )}
                </div>
                <button
                  onClick={() => handleExecute()}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
                >
                  {currentPowerType === 'MYSTERY_BOX' ? '🎁 MỞ RƯƠNG KHO BÁU NGAY!' : '⚡ KÍCH HOẠT NHÂN 2 ĐIỂM!'}
                </button>
              </div>
            ) : (
              /* Opponent Target Selector for ATTACK or FREEZE */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {validTargets.length === 0 ? (
                    <div className="col-span-2 py-8 text-slate-400 font-bold text-sm">
                      Chưa có đối thủ khác trong phòng!
                    </div>
                  ) : (
                    validTargets.map((opp) => {
                      const isSelected = selectedTargetId === opp.id;
                      return (
                        <button
                          key={opp.id}
                          onClick={() => setSelectedTargetId(opp.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 scale-102'
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <ChibiAvatar customization={opp.chibi} size="sm" isBouncing={false} />
                            <div className="text-left">
                              <span className="font-extrabold text-white text-sm block">{opp.name}</span>
                              <span className="text-xs text-yellow-400 font-bold">{opp.score} điểm</span>
                            </div>
                          </div>

                          {opp.shieldActive ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 rounded-lg text-xs font-black">
                              <Shield className="w-3.5 h-3.5" /> Khiên
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Dễ trúng</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <button
                  disabled={!selectedTargetId}
                  onClick={() => handleExecute()}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 disabled:opacity-40 text-white font-black text-xl rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
                >
                  {currentPowerType === 'FREEZE' ? <Snowflake className="w-6 h-6" /> : <Swords className="w-6 h-6" />}
                  {currentPowerType === 'FREEZE' ? '❄️ ĐÓNG BĂNG NGƯỜI CHƠI NÀY!' : '⚔️ TẤN CÔNG NGƯỜI CHƠI NÀY!'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function SparklesIcon({ type }: { type: PowerUpType }) {
  if (type === 'FREEZE') return <Snowflake className="w-5 h-5 text-cyan-300 animate-spin" />;
  if (type === 'DOUBLE_POINTS') return <Zap className="w-5 h-5 text-amber-400 animate-bounce" />;
  if (type === 'MYSTERY_BOX') return <Gift className="w-5 h-5 text-yellow-400 animate-bounce" />;
  return <Swords className="w-5 h-5 text-amber-400 animate-bounce" />;
}
