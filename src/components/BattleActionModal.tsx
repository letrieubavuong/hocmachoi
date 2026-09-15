import React, { useState } from 'react';
import { Player, PowerUpType } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { Swords, ShieldAlert, Zap, Gift, Snowflake, Shield, Repeat, Bomb, Eye, Rocket, Sparkles } from 'lucide-react';
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
  onNextQuestion?: () => void;
}

export const BattleActionModal: React.FC<BattleActionModalProps> = ({
  attacker,
  opponents,
  isOpen,
  powerUpType = 'ATTACK',
  onExecutePowerUp,
  onClose,
  onNextQuestion,
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

  const isSelfOnlyPowerUp = [
    'MYSTERY_BOX',
    'DOUBLE_POINTS',
    'ORACLE_5050',
    'ROCKET_BOOST',
    'REFLECT_SHIELD',
  ].includes(currentPowerType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-center overflow-hidden">
        {/* Decorative Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-2 text-amber-400 font-extrabold uppercase text-xs tracking-wider">
          <PowerIcon type={currentPowerType} />
          <span>Phần Thưởng Chuỗi Combo Đấu Trường</span>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {currentPowerType === 'ATTACK' && '⚔️ THẺ TẤN CÔNG CƯỚP ĐIỂM!'}
          {currentPowerType === 'FREEZE' && '❄️ THẺ ĐÓNG BĂNG MÀN HÌNH!'}
          {currentPowerType === 'SWAP_SCORE' && '🔀 THẺ HOÁN ĐỔI ĐIỂM SỐ!'}
          {currentPowerType === 'BOMB' && '💣 BOM HẸN GIỜ GIẢM THỜI GIAN!'}
          {currentPowerType === 'DOUBLE_POINTS' && '⚡ THẺ NHÂN 2 ĐIỂM SỐ!'}
          {currentPowerType === 'MYSTERY_BOX' && '🎁 RƯƠNG KHO BÁU MAY MẮN!'}
          {currentPowerType === 'ORACLE_5050' && '👁️ MẮT THẦN LOẠI 2 ĐÁP ÁN SAI!'}
          {currentPowerType === 'ROCKET_BOOST' && '🚀 TÊN LỬA THĂNG HẠNG!'}
          {currentPowerType === 'REFLECT_SHIELD' && '👑 KHIÊN PHẢN CẦU SÁT THƯƠNG!'}
          {currentPowerType === 'SHIELD' && '🛡️ KHIÊN BẢO VỆ THẦN THÁNH!'}
        </h2>

        <p className="text-xs text-slate-300 mb-6">
          {currentPowerType === 'ATTACK' && 'Chọn đối thủ để cướp 20% điểm số! (Có thể bị Khiên chặn)'}
          {currentPowerType === 'FREEZE' && 'Chọn 1 đối thủ để đóng băng màn hình trong 6 giây!'}
          {currentPowerType === 'SWAP_SCORE' && 'Đổi trực tiếp toàn bộ điểm số của bạn với 1 đối thủ!'}
          {currentPowerType === 'BOMB' && 'Đặt bom hẹn giờ làm giảm 50% thời gian suy nghĩ của đối thủ!'}
          {currentPowerType === 'DOUBLE_POINTS' && 'Kích hoạt nhân 2 điểm số cho câu hỏi tiếp theo!'}
          {currentPowerType === 'MYSTERY_BOX' && 'Mở rương kho báu để nhận ngẫu nhiên điểm thưởng khủng!'}
          {currentPowerType === 'ORACLE_5050' && 'Kích hoạt mắt thần loại bỏ 2 lựa chọn sai ở câu kế!'}
          {currentPowerType === 'ROCKET_BOOST' && 'Tên lửa tăng tốc nhận ngay +300 điểm thăng hạng!'}
          {currentPowerType === 'REFLECT_SHIELD' && 'Bật khiên phản ngược 100% đòn đánh lại kẻ tấn công!'}
          {currentPowerType === 'SHIELD' && 'Chặn 100% sát thương từ đòn đánh tiếp theo!'}
        </p>

        {/* Result Action Screen */}
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

            {battleResult.type === 'ROCKET_BOOST' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center">
                  <Rocket className="w-9 h-9 text-red-400 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-red-400">TÊN LỬA TĂNG TỐC!</h3>
                <p className="text-sm text-slate-300">
                  Bạn vừa kích hoạt tên lửa và phóng thẳng lên với <strong className="text-yellow-400 font-bold">+300 Điểm Thăng Hạng</strong>!
                </p>
              </div>
            )}

            {battleResult.type === 'SWAP_SCORE' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center">
                  <Repeat className="w-9 h-9 text-purple-400 animate-spin" />
                </div>
                <h3 className="text-xl font-black text-purple-300">HOÁN ĐỔI ĐIỂM THÀNH CÔNG!</h3>
                <p className="text-sm text-slate-300">
                  Bạn và <strong className="text-white">{battleResult.targetName}</strong> đã hoán đổi toàn bộ điểm số cho nhau!
                </p>
              </div>
            )}

            {battleResult.type === 'BOMB' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center">
                  <Bomb className="w-9 h-9 text-orange-400 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-orange-300">ĐÃ ĐẶT BOM GIẢM THỜI GIAN!</h3>
                <p className="text-sm text-slate-300">
                  <strong className="text-white">{battleResult.targetName}</strong> bị đính bom giảm 50% thời gian ở câu hỏi tới!
                </p>
              </div>
            )}

            {battleResult.type === 'ORACLE_5050' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center">
                  <Eye className="w-9 h-9 text-cyan-300 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-cyan-300">BẬT MẮT THẦN 50:50!</h3>
                <p className="text-sm text-slate-300">
                  Ở câu hỏi tiếp theo, 2 lựa chọn sai sẽ tự động bị loại bỏ!
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
              onClick={() => {
                onClose();
              }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              TIẾP TỤC CHƠI & SANG CÂU TIẾP ➔
            </button>
          </div>
        ) : (
          /* Selection / Instant Activation Body */
          <div>
            {isSelfOnlyPowerUp ? (
              <div className="py-6 space-y-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center animate-bounce shadow-2xl">
                  <PowerIcon type={currentPowerType} size="lg" />
                </div>
                <button
                  onClick={() => handleExecute()}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
                >
                  KÍCH HOẠT PHẦN THƯỞNG NÀY NGAY!
                </button>
              </div>
            ) : (
              /* Opponent Target Selector for ATTACK, FREEZE, SWAP_SCORE, BOMB */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {validTargets.length === 0 ? (
                    <div className="col-span-2 py-6 space-y-3">
                      <div className="text-slate-400 font-bold text-sm">
                        Chưa có đối thủ khác trong phòng để nhắm tới!
                      </div>
                      <button
                        onClick={() => {
                          handleExecute(attacker.id);
                        }}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-sm rounded-xl shadow-lg"
                      >
                        KÍCH HOẠT BẢN THÂN & SANG CÂU TIẾP ➔
                      </button>
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
                            <span className="text-xs text-slate-400 font-semibold">Mục tiêu</span>
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
                  <PowerIcon type={currentPowerType} />
                  SỬ DỤNG LÊN NGƯỜI CHƠI NÀY!
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function PowerIcon({ type, size = 'sm' }: { type: PowerUpType; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-12 h-12 text-yellow-400' : 'w-5 h-5 text-amber-400';
  if (type === 'FREEZE') return <Snowflake className={`${s} animate-spin`} />;
  if (type === 'DOUBLE_POINTS') return <Zap className={`${s} animate-bounce`} />;
  if (type === 'MYSTERY_BOX') return <Gift className={`${s} animate-bounce`} />;
  if (type === 'SWAP_SCORE') return <Repeat className={`${s} animate-spin`} />;
  if (type === 'BOMB') return <Bomb className={`${s} animate-pulse`} />;
  if (type === 'ORACLE_5050') return <Eye className={`${s} animate-pulse`} />;
  if (type === 'ROCKET_BOOST') return <Rocket className={`${s} animate-bounce`} />;
  if (type === 'REFLECT_SHIELD') return <Sparkles className={`${s} animate-spin`} />;
  return <Swords className={`${s} animate-bounce`} />;
}
