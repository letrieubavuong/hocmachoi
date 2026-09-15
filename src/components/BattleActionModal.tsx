import React, { useState, useEffect } from 'react';
import { Player, PowerUpType } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { Swords, ShieldAlert, Zap, Gift, Snowflake, Shield, Bomb, Eye, Rocket, Sparkles, ChevronRight } from 'lucide-react';
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
  powerUpType,
  onExecutePowerUp,
  onClose,
  onNextQuestion,
}) => {
  // If specific gift was sent by teacher, use it; otherwise student gets to choose from 4 rewards!
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{
    blocked: boolean;
    stolenPoints: number;
    mysteryBonus?: number;
    targetName: string;
    type: PowerUpType;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBattleResult(null);
      setSelectedTargetId(null);
      // If powerUpType is passed and not ATTACK/MYSTERY_BOX/SHIELD/ORACLE_5050 (e.g. Teacher gift), set active directly
      if (powerUpType && ['FREEZE', 'BOMB', 'DOUBLE_POINTS', 'ROCKET_BOOST', 'REFLECT_SHIELD'].includes(powerUpType)) {
        setActivePowerUp(powerUpType);
      } else {
        setActivePowerUp(null); // Show choice selection menu
      }
    }
  }, [isOpen, powerUpType]);

  if (!isOpen) return null;

  const validTargets = opponents.filter((p) => p.id !== attacker.id);

  // Execute power-up action
  const handleExecute = (chosenType: PowerUpType, targetIdOverride?: string) => {
    const targetIdToUse = targetIdOverride || selectedTargetId || attacker.id;
    const target = opponents.find((p) => p.id === targetIdToUse) || attacker;

    const res = onExecutePowerUp(targetIdToUse, chosenType);
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
        type: chosenType,
      });
    }
  };

  const handleSelectRewardCard = (type: PowerUpType) => {
    setActivePowerUp(type);
    if (type === 'ATTACK') {
      // Switch to target selector
      if (validTargets.length === 0) {
        // No opponents, execute on self / fallback
        handleExecute('ATTACK', attacker.id);
      }
    } else {
      // Instant execution for SHIELD, ORACLE_5050, MYSTERY_BOX
      handleExecute(type, attacker.id);
    }
  };

  const handleFinishAndNext = () => {
    setBattleResult(null);
    setSelectedTargetId(null);
    setActivePowerUp(null);
    onClose();
    if (onNextQuestion) {
      onNextQuestion();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-center overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* STEP 1: RESULT DISPLAY SCREEN */}
        {battleResult ? (
          <div className="py-4 space-y-6 animate-fade-in relative z-10">
            {battleResult.type === 'MYSTERY_BOX' && (
              <div className="space-y-4 py-2">
                <div className="w-24 h-24 mx-auto rounded-full bg-yellow-500/20 border-4 border-yellow-400 flex items-center justify-center animate-bounce shadow-2xl shadow-yellow-500/30">
                  <Gift className="w-12 h-12 text-yellow-400" />
                </div>
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200">
                  MỞ RƯƠNG KHO BÁU THÀNH CÔNG!
                </h3>
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-yellow-500/40 inline-block px-8">
                  <span className="text-xs text-slate-400 font-bold uppercase block">ĐIỂM THƯỞNG NGẪU NHIÊN RECEIVE:</span>
                  <span className="text-4xl font-black text-yellow-400 mt-1 block">
                    +{battleResult.mysteryBonus} ĐIỂM
                  </span>
                </div>
              </div>
            )}

            {battleResult.type === 'SHIELD' && (
              <div className="space-y-4 py-2">
                <div className="w-24 h-24 mx-auto rounded-full bg-cyan-500/20 border-4 border-cyan-400 flex items-center justify-center animate-pulse shadow-2xl shadow-cyan-500/30">
                  <Shield className="w-12 h-12 text-cyan-300" />
                </div>
                <h3 className="text-3xl font-black text-cyan-300">
                  ĐÃ KÍCH HOẠT KHIÊN BẢO VỆ!
                </h3>
                <p className="text-sm text-slate-300 font-semibold max-w-md mx-auto">
                  Tấm khiên thần thánh sẽ chặn 100% sát thương từ đòn đánh tiếp theo của đối thủ!
                </p>
              </div>
            )}

            {battleResult.type === 'ORACLE_5050' && (
              <div className="space-y-4 py-2">
                <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center animate-pulse shadow-2xl shadow-emerald-500/30">
                  <Eye className="w-12 h-12 text-emerald-300" />
                </div>
                <h3 className="text-3xl font-black text-emerald-300">
                  ĐÃ BẬT MẮT THẦN 50:50!
                </h3>
                <p className="text-sm text-slate-300 font-semibold max-w-md mx-auto">
                  Ở câu hỏi tiếp theo, 2 lựa chọn phương án sai sẽ tự động bị gạch bỏ!
                </p>
              </div>
            )}

            {battleResult.type === 'ATTACK' && (
              battleResult.blocked ? (
                <div className="space-y-4 py-2">
                  <div className="w-24 h-24 mx-auto rounded-full bg-cyan-500/20 border-4 border-cyan-400 flex items-center justify-center animate-pulse">
                    <ShieldAlert className="w-12 h-12 text-cyan-300" />
                  </div>
                  <h3 className="text-2xl font-black text-cyan-300">ĐỐI THỦ CÓ KHIÊN BẢO VỆ!</h3>
                  <p className="text-sm text-slate-300 font-semibold">
                    <strong className="text-white">{battleResult.targetName}</strong> đã dùng khiên chặn thành công đòn đánh của bạn!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="w-24 h-24 mx-auto rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center animate-bounce">
                    <Swords className="w-12 h-12 text-amber-400" />
                  </div>
                  <h3 className="text-3xl font-black text-amber-400">TẤN CÔNG THÀNH CÔNG!</h3>
                  <p className="text-base text-slate-200">
                    Bạn đã cướp thành công <strong className="text-yellow-400 text-2xl font-black">+{battleResult.stolenPoints} điểm</strong> từ <strong className="text-white">{battleResult.targetName}</strong>!
                  </p>
                </div>
              )
            )}

            <button
              onClick={handleFinishAndNext}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              TIẾP TỤC CHƠI & SANG CÂU TIẾP ➔
            </button>
          </div>
        ) : activePowerUp === 'ATTACK' ? (
          /* STEP 2: OPPONENT SELECTION FOR ATTACK */
          <div className="space-y-5 animate-fade-in relative z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setActivePowerUp(null)}
                className="text-xs text-amber-400 font-extrabold flex items-center gap-1 hover:underline"
              >
                ➔ Quay lại chọn phần thưởng khác
              </button>
              <span className="text-xs font-black text-amber-400 uppercase">⚔️ THẺ TẤN CÔNG CƯỚP ĐIỂM</span>
            </div>

            <h3 className="text-xl font-black text-white">CHỌN 1 ĐỐI THỦ ĐỂ CƯỚP 20% ĐIỂM SỐ:</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {validTargets.length === 0 ? (
                <div className="col-span-2 py-6 space-y-3">
                  <div className="text-slate-400 font-bold text-sm">
                    Chưa có đối thủ khác trong phòng để nhắm tới!
                  </div>
                  <button
                    onClick={() => handleExecute('ATTACK', attacker.id)}
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
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 scale-102'
                          : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ChibiAvatar customization={opp.chibi} size="sm" isBouncing={false} />
                        <div className="text-left">
                          <span className="font-extrabold text-white text-sm block flex items-center gap-1.5">
                            {opp.name}
                            {opp.studentCode && (
                              <span className="text-[10px] text-purple-300 font-mono bg-purple-950 px-1.5 py-0.5 rounded border border-purple-500/40">
                                {opp.studentCode}
                              </span>
                            )}
                          </span>
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
              onClick={() => handleExecute('ATTACK')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 disabled:opacity-40 text-white font-black text-xl rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
              <Swords className="w-6 h-6 text-yellow-300" />
              CƯỚP ĐIỂM NGƯỜI CHƠI NÀY!
            </button>
          </div>
        ) : (
          /* STEP 0: 4 REWARD CHOICES SELECTION GRID */
          <div className="space-y-6 animate-fade-in relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black uppercase text-xs tracking-wider">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
              <span>PHẦN THƯỞNG CHUỖI CÂU ĐÚNG ĐẤU TRƯỜNG</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white">
              🎉 BẠN ĐẠT CHUỖI ĐÚNG! CHỌN 1 PHẦN THƯỞNG:
            </h2>
            <p className="text-xs text-slate-300">
              Hãy chọn 1 trong 4 loại thẻ thưởng chiến thuật dưới đây để trợ giúp bạn leo Rank!
            </p>

            {/* 4 Interactive Reward Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Card 1: ATTACK */}
              <button
                onClick={() => handleSelectRewardCard('ATTACK')}
                className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-rose-950/80 via-slate-900 to-red-950/80 border-2 border-rose-500/50 hover:border-rose-400 hover:scale-102 transition-all shadow-xl text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 group-hover:scale-110 transition-transform shrink-0">
                  <Swords className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-white text-base flex items-center justify-between">
                    ⚔️ TẤN CÔNG
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    Chọn 1 đối thủ bất kỳ để cướp 20% tổng điểm số!
                  </p>
                </div>
              </button>

              {/* Card 2: SHIELD */}
              <button
                onClick={() => handleSelectRewardCard('SHIELD')}
                className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/80 border-2 border-cyan-500/50 hover:border-cyan-400 hover:scale-102 transition-all shadow-xl text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 group-hover:scale-110 transition-transform shrink-0">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-white text-base flex items-center justify-between">
                    🛡️ KHIÊN BẢO VỆ
                    <ChevronRight className="w-4 h-4 text-cyan-300 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    Bật khiên bảo vệ chặn 100% đòn tấn công từ đối thủ!
                  </p>
                </div>
              </button>

              {/* Card 3: ORACLE_5050 */}
              <button
                onClick={() => handleSelectRewardCard('ORACLE_5050')}
                className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/50 hover:border-emerald-400 hover:scale-102 transition-all shadow-xl text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 group-hover:scale-110 transition-transform shrink-0">
                  <Eye className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-white text-base flex items-center justify-between">
                    👁️ MẮT THẦN 50:50
                    <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    Mở trợ giúp loại bỏ 2 phương án sai ở câu tiếp theo!
                  </p>
                </div>
              </button>

              {/* Card 4: MYSTERY_BOX */}
              <button
                onClick={() => handleSelectRewardCard('MYSTERY_BOX')}
                className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-yellow-950/80 via-slate-900 to-amber-950/80 border-2 border-yellow-400/60 hover:border-yellow-300 hover:scale-102 transition-all shadow-xl text-left group cursor-pointer relative overflow-hidden"
              >
                <div className="p-3 rounded-2xl bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 group-hover:scale-110 transition-transform shrink-0">
                  <Gift className="w-8 h-8 animate-bounce" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-yellow-300 text-base flex items-center justify-between">
                    🎁 MỞ RƯƠNG KHO BÁU
                    <ChevronRight className="w-4 h-4 text-yellow-300 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    Mở rương nhận ngẫu nhiên <strong className="text-yellow-400 font-bold">+100 đến +500 điểm</strong>!
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
