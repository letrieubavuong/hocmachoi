import React, { useState } from 'react';
import { Player } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { Swords, ShieldAlert, Zap, Trophy, Shield } from 'lucide-react';
import { soundManager } from '../services/audio';

interface BattleActionModalProps {
  attacker: Player;
  opponents: Player[];
  isOpen: boolean;
  onExecuteAttack: (targetId: string) => { success: boolean; blocked: boolean; stolenPoints: number } | null;
  onClose: () => void;
}

export const BattleActionModal: React.FC<BattleActionModalProps> = ({
  attacker,
  opponents,
  isOpen,
  onExecuteAttack,
  onClose,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{
    blocked: boolean;
    stolenPoints: number;
    targetName: string;
  } | null>(null);

  if (!isOpen) return null;

  const validTargets = opponents.filter((p) => p.id !== attacker.id);

  const handleAttack = () => {
    if (!selectedTargetId) return;
    const target = validTargets.find((p) => p.id === selectedTargetId);
    if (!target) return;

    const res = onExecuteAttack(selectedTargetId);
    if (res) {
      if (res.blocked) {
        soundManager.playShieldBlock();
      } else {
        soundManager.playAttack();
      }

      setBattleResult({
        blocked: res.blocked,
        stolenPoints: res.stolenPoints,
        targetName: target.name,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-center overflow-hidden">
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-2 text-amber-400 font-extrabold uppercase text-xs tracking-wider">
          <Swords className="w-5 h-5 text-amber-400 animate-bounce" />
          <span>Thưởng Chuỗi Trả Lời Đúng</span>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">⚔️ MỞ KHÓA THẺ TẤN CÔNG!</h2>
        <p className="text-xs text-slate-300 mb-6">
          Chọn 1 đối thủ để cướp điểm! Nếu đối thủ có <strong className="text-cyan-400">Khiên 🛡️</strong>, đòn tấn công sẽ bị chặn!
        </p>

        {/* Result Animation Banner */}
        {battleResult ? (
          <div className="py-6 px-4 space-y-4 bg-slate-800/90 rounded-2xl border border-slate-700">
            {battleResult.blocked ? (
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
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Tiếp Tục Chơi
            </button>
          </div>
        ) : (
          /* Opponent Selection List */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {validTargets.length === 0 ? (
                <div className="col-span-2 py-8 text-slate-400 font-bold text-sm">
                  Chưa có đối thủ khác trong phòng để tấn công!
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
                        <span className="text-xs text-slate-400 font-semibold">Dễ bị đánh</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Launch Attack Button */}
            <button
              disabled={!selectedTargetId}
              onClick={handleAttack}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 disabled:opacity-40 text-white font-black text-xl rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
              <Swords className="w-6 h-6" />
              TẤN CÔNG NGƯỜI CHƠI NÀY!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
