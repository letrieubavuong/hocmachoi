import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Player, PowerUpType } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import {
  Swords,
  ShieldAlert,
  Zap,
  Gift,
  Snowflake,
  Shield,
  Bomb,
  Eye,
  Rocket,
  Sparkles,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { soundManager } from '../services/audio';

import { POWER_UP_CONFIG, TargetMode, PowerUpDefinition as PowerUpMeta } from '../services/powerUpEngine';
export { POWER_UP_CONFIG };
export type { TargetMode, PowerUpMeta };

export const REWARD_OPTIONS: PowerUpType[] = ['ATTACK', 'SHIELD', 'ORACLE_5050', 'STREAK_GUARD', 'MYSTERY_BOX'];

export type BattleStep = 'SELECT_POWERUP' | 'SELECT_TARGET' | 'RESULT';

export interface BattleResultData {
  blocked: boolean;
  stolenPoints: number;
  mysteryBonus?: number;
  targetName: string;
  type: PowerUpType;
}

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
  const [step, setStep] = useState<BattleStep>('SELECT_POWERUP');
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [battleResult, setBattleResult] = useState<BattleResultData | null>(null);

  const validTargets = useMemo(
    () => opponents.filter((p) => p.id !== attacker.id),
    [opponents, attacker.id]
  );

  useEffect(() => {
    if (isOpen) {
      setIsExecuting(false);
      setBattleResult(null);
      setSelectedTargetId(null);

      if (powerUpType) {
        const meta = POWER_UP_CONFIG[powerUpType];
        setActivePowerUp(powerUpType);

        if (meta && meta.targetMode === 'OPPONENT') {
          setStep('SELECT_TARGET');
        } else {
          setStep('SELECT_POWERUP');
        }
      } else {
        setActivePowerUp(null);
        setStep('SELECT_POWERUP');
      }
    }
  }, [isOpen, powerUpType]);

  const executePowerUp = useCallback(
    (chosenType: PowerUpType, targetIdToUse: string) => {
      if (isExecuting) return;

      const meta = POWER_UP_CONFIG[chosenType] || POWER_UP_CONFIG.ATTACK;

      if (meta.targetMode === 'OPPONENT') {
        if (!targetIdToUse || targetIdToUse === attacker.id) {
          return;
        }
      }

      setIsExecuting(true);

      try {
        const target =
          opponents.find((p) => p.id === targetIdToUse) ||
          (meta.targetMode === 'SELF' ? attacker : null);

        if (!target && meta.targetMode === 'OPPONENT') {
          return;
        }

        const targetName = target ? target.name : 'Đối thủ';

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
            targetName,
            type: chosenType,
          });
          setStep('RESULT');
        }
      } finally {
        setIsExecuting(false);
      }
    },
    [attacker, isExecuting, onExecutePowerUp, opponents]
  );

  const handleSelectRewardCard = useCallback(
    (type: PowerUpType) => {
      if (isExecuting) return;
      const meta = POWER_UP_CONFIG[type];
      setActivePowerUp(type);

      if (meta && meta.targetMode === 'OPPONENT') {
        setStep('SELECT_TARGET');
        setSelectedTargetId(null);
      } else {
        executePowerUp(type, attacker.id);
      }
    },
    [attacker.id, executePowerUp, isExecuting]
  );

  const handleFinishAndNext = useCallback(() => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      setBattleResult(null);
      setSelectedTargetId(null);
      setActivePowerUp(null);
      setStep('SELECT_POWERUP');
      onClose();
      if (onNextQuestion) {
        onNextQuestion();
      }
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, onClose, onNextQuestion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && step === 'SELECT_POWERUP' && !isExecuting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, isExecuting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-modal-title"
      onClick={() => {
        if (step === 'SELECT_POWERUP' && !isExecuting) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-lg animate-fade-in font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl text-center"
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* STEP: RESULT */}
        {step === 'RESULT' && battleResult && (
          <BattleResultView
            result={battleResult}
            isExecuting={isExecuting}
            onFinish={handleFinishAndNext}
          />
        )}

        {/* STEP: SELECT_TARGET */}
        {step === 'SELECT_TARGET' && activePowerUp && (
          <TargetSelectorView
            activePowerUp={activePowerUp}
            validTargets={validTargets}
            selectedTargetId={selectedTargetId}
            isExecuting={isExecuting}
            onSelectTarget={(id) => setSelectedTargetId(id)}
            onExecute={(id) => executePowerUp(activePowerUp, id)}
            onBack={() => {
              if (powerUpType) {
                onClose();
              } else {
                setStep('SELECT_POWERUP');
                setActivePowerUp(null);
              }
            }}
          />
        )}

        {/* STEP: SELECT_POWERUP */}
        {step === 'SELECT_POWERUP' && (
          <PowerUpSelectionView
            rewardOptions={REWARD_OPTIONS}
            isExecuting={isExecuting}
            onSelectCard={handleSelectRewardCard}
          />
        )}
      </div>
    </div>
  );
};

/* Sub-Component 1: PowerUpSelectionView */
const PowerUpSelectionView: React.FC<{
  rewardOptions: PowerUpType[];
  isExecuting: boolean;
  onSelectCard: (type: PowerUpType) => void;
}> = ({ rewardOptions, isExecuting, onSelectCard }) => {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in relative z-10">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black uppercase text-[11px] sm:text-xs tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
        <span>PHẦN THƯỞNG CHUỖI CÂU ĐÚNG ĐẤU TRƯỜNG</span>
      </div>

      <div className="space-y-1">
        <h2 id="battle-modal-title" className="text-xl sm:text-2xl md:text-3xl font-black text-white">
          🎉 CHUỖI ĐÚNG XUẤT SẮC! CHỌN 1 THẺ THƯỞNG:
        </h2>
        <p className="text-xs text-slate-300">
          Hãy chọn 1 trong 4 loại thẻ chiến thuật dưới đây để bứt phá bảng xếp hạng!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {rewardOptions.map((type) => {
          const meta = POWER_UP_CONFIG[type];
          if (!meta) return null;
          const IconComponent = meta.icon;

          return (
            <button
              key={type}
              disabled={isExecuting}
              onClick={() => onSelectCard(type)}
              className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br ${meta.cardBgGradient} border-2 ${meta.borderClass} hover:scale-[1.02] transition-all shadow-xl text-left group cursor-pointer disabled:opacity-50 min-h-[90px]`}
            >
              <div className={`p-2.5 sm:p-3 rounded-2xl ${meta.badgeColor} border group-hover:scale-105 transition-transform shrink-0 mt-0.5`}>
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-white text-sm sm:text-base flex items-center justify-between">
                  <span>{meta.title}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5 leading-snug">
                  {meta.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* Sub-Component 2: TargetSelectorView */
const TargetSelectorView: React.FC<{
  activePowerUp: PowerUpType;
  validTargets: Player[];
  selectedTargetId: string | null;
  isExecuting: boolean;
  onSelectTarget: (id: string) => void;
  onExecute: (targetId: string) => void;
  onBack: () => void;
}> = ({
  activePowerUp,
  validTargets,
  selectedTargetId,
  isExecuting,
  onSelectTarget,
  onExecute,
  onBack,
}) => {
  const meta = POWER_UP_CONFIG[activePowerUp] || POWER_UP_CONFIG.ATTACK;

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in relative z-10">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={onBack}
          disabled={isExecuting}
          className="text-xs text-amber-400 font-extrabold flex items-center gap-1 hover:underline cursor-pointer min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <span className="text-xs font-black text-amber-400 uppercase">
          ⚔️ THẺ {meta.title}
        </span>
      </div>

      <h3 className="text-lg sm:text-xl font-black text-white">
        CHỌN 1 ĐỐI THỦ ĐỂ KÍCH HOẠT {meta.title}:
      </h3>

      {validTargets.length === 0 ? (
        <div className="py-8 space-y-4">
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-slate-300 text-sm font-semibold max-w-md mx-auto">
            Hiện chưa có đối thủ phù hợp khác trong phòng để nhắm tới!
          </div>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-sm rounded-xl shadow-lg cursor-pointer"
          >
            Quay lại chọn phần thưởng khác
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {validTargets.map((opp) => {
              const isSelected = selectedTargetId === opp.id;
              return (
                <button
                  key={opp.id}
                  disabled={isExecuting}
                  onClick={() => onSelectTarget(opp.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer min-h-[56px] ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 scale-[1.01]'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ChibiAvatar customization={opp.chibi} size="sm" isBouncing={false} />
                    <div className="text-left min-w-0">
                      <span className="font-black text-white text-xs sm:text-sm truncate block">
                        {opp.name}
                      </span>
                      <span className="text-[11px] text-yellow-400 font-bold">
                        {opp.score} điểm
                      </span>
                    </div>
                  </div>

                  {opp.shieldActive ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 rounded-lg text-[10px] font-black shrink-0">
                      <Shield className="w-3 h-3 text-cyan-400" /> Có khiên
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                      Chọn
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            disabled={!selectedTargetId || isExecuting}
            onClick={() => selectedTargetId && onExecute(selectedTargetId)}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 disabled:opacity-40 text-white font-black text-lg sm:text-xl rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer min-h-[50px]"
          >
            <Swords className="w-5 h-5 text-yellow-300" />
            KÍCH HOẠT VÀO NGƯỜI CHƠI NÀY!
          </button>
        </>
      )}
    </div>
  );
};

/* Sub-Component 3: BattleResultView */
const BattleResultView: React.FC<{
  result: BattleResultData;
  isExecuting: boolean;
  onFinish: () => void;
}> = ({ result, isExecuting, onFinish }) => {
  const meta = POWER_UP_CONFIG[result.type];

  return (
    <div className="py-2 sm:py-4 space-y-5 sm:space-y-6 animate-fade-in relative z-10">
      {result.type === 'MYSTERY_BOX' && (
        <div className="space-y-3 py-1">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-yellow-500/20 border-4 border-yellow-400 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
            <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200">
            MỞ RƯƠNG KHO BÁU THÀNH CÔNG!
          </h3>
          <div className="p-3 sm:p-4 bg-slate-950/80 rounded-2xl border border-yellow-500/40 inline-block px-6 sm:px-8">
            <span className="text-xs text-slate-400 font-bold uppercase block">
              ĐIỂM THƯỞNG NHẬN ĐƯỢC:
            </span>
            <span className="text-3xl sm:text-4xl font-black text-yellow-400 mt-1 block">
              +{result.mysteryBonus || 0} điểm
            </span>
          </div>
        </div>
      )}

      {result.type === 'SHIELD' && (
        <div className="space-y-3 py-1">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-cyan-500/20 border-4 border-cyan-400 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
            <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-300" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-cyan-300">
            ĐÃ KÍCH HOẠT KHIÊN BẢO VỆ!
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-semibold max-w-md mx-auto">
            Tấm khiên thần thánh sẽ chặn 100% sát thương từ đòn đánh tiếp theo của đối thủ!
          </p>
        </div>
      )}

      {result.type === 'ORACLE_5050' && (
        <div className="space-y-3 py-1">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
            <Eye className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-300" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-300">
            ĐÃ BẬT MẮT THẦN 50:50!
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-semibold max-w-md mx-auto">
            Ở câu hỏi tiếp theo, 2 lựa chọn phương án sai sẽ tự động bị gạch bỏ!
          </p>
        </div>
      )}

      {(result.type === 'ATTACK' || result.type === 'FREEZE' || result.type === 'BOMB') && (
        result.blocked ? (
          <div className="space-y-3 py-1">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-cyan-500/20 border-4 border-cyan-400 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-300" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-cyan-300">ĐỐI THỦ CÓ KHIÊN BẢO VỆ!</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold max-w-md mx-auto">
              <strong className="text-white">{result.targetName}</strong> đã dùng khiên chặn thành công đòn đánh của bạn!
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center">
              <Swords className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-400">TẤN CÔNG THÀNH CÔNG!</h3>
            <p className="text-sm sm:text-base text-slate-200">
              Bạn đã cướp thành công <strong className="text-yellow-400 text-xl sm:text-2xl font-black">+{result.stolenPoints} điểm</strong> từ <strong className="text-white">{result.targetName}</strong>!
            </p>
          </div>
        )
      )}

      {/* Fallback for other powerup types like DOUBLE_POINTS, ROCKET_BOOST, REFLECT_SHIELD */}
      {result.type !== 'MYSTERY_BOX' &&
        result.type !== 'SHIELD' &&
        result.type !== 'ORACLE_5050' &&
        result.type !== 'ATTACK' &&
        result.type !== 'FREEZE' &&
        result.type !== 'BOMB' && (
          <div className="space-y-3 py-1">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-purple-500/20 border-4 border-purple-400 flex items-center justify-center">
              <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-purple-300" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-purple-300">
              ĐÃ KÍCH HOẠT {meta?.title || 'THẺ THƯỞNG'}!
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold max-w-md mx-auto">
              {meta?.description || 'Thẻ thưởng đã được kích hoạt thành công.'}
            </p>
          </div>
        )}

      <button
        disabled={isExecuting}
        onClick={onFinish}
        className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-black text-lg sm:text-xl rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer min-h-[50px]"
      >
        TIẾP TỤC CHƠI & SANG CÂU TIẾP ➔
      </button>
    </div>
  );
};
