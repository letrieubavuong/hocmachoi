import React, { useState } from 'react';
import { AttackEvent } from '../../types';
import { Swords, ChevronDown, ChevronUp } from 'lucide-react';

interface BattleLogProps {
  attacks: AttackEvent[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ attacks }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!attacks || attacks.length === 0) return null;

  return (
    <div className="bg-slate-950/80 border border-purple-500/20 rounded-2xl overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between text-xs font-extrabold text-purple-400 uppercase tracking-wider hover:bg-slate-900/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-purple-400" />
          <span>Nhật Ký Trận Đấu ({attacks.length})</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span>{isOpen ? 'Thu gọn' : 'Xem chi tiết'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-slate-800 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar text-xs">
          {attacks.map((att) => (
            <div
              key={att.id}
              className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-slate-300"
            >
              {att.powerUpType === 'FREEZE' ? (
                <span className="text-cyan-300">
                  ❄️ <strong className="text-white">{att.attackerName}</strong> đã đóng băng màn hình của <strong>{att.targetName}</strong> trong 6s!
                </span>
              ) : att.powerUpType === 'MYSTERY_BOX' ? (
                <span className="text-yellow-300">
                  🎁 <strong className="text-white">{att.attackerName}</strong> đã trúng rương kho báu ngẫu nhiên!
                </span>
              ) : att.blocked ? (
                <span className="text-cyan-300">
                  🛡️ <strong className="text-white">{att.targetName}</strong> đã dùng khiên chặn cú đánh từ <strong>{att.attackerName}</strong>!
                </span>
              ) : (
                <span className="text-amber-300">
                  ⚔️ <strong className="text-white">{att.attackerName}</strong> đánh trúng <strong className="text-white">{att.targetName}</strong> cướp +{att.stolenPoints} pt!
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
