import React from 'react';
import { Eye, Users, CheckCircle2, AlertTriangle, Megaphone } from 'lucide-react';
import { Player } from '../../types';

interface TeacherMonitorProps {
  players: Player[];
  onOpenTeacherAlert?: () => void;
}

export const TeacherMonitor: React.FC<TeacherMonitorProps> = ({
  players,
  onOpenTeacherAlert,
}) => {
  const totalStudents = players.length;
  const awayStudents = players.filter((p) => p.isTabActive === false).length;
  const focusedStudents = totalStudents - awayStudents;
  const warnedStudents = players.filter((p) => (p.tabSwitchCount || 0) > 0).length;

  return (
    <div className="bg-slate-900/90 border border-purple-500/20 p-3.5 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-black text-white uppercase tracking-wider">
          Giám Sát Anti-Cheat (Giáo Viên)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="px-2.5 py-1 bg-slate-800 rounded-xl text-slate-300 border border-slate-700 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-purple-400" /> Sĩ số: <strong className="text-white">{totalStudents}</strong>
        </span>
        <span className="px-2.5 py-1 bg-emerald-600/20 rounded-xl text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tập trung: <strong className="text-white">{focusedStudents}</strong>
        </span>
        {awayStudents > 0 && (
          <span className="px-2.5 py-1 bg-rose-600/20 rounded-xl text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Rời tab: <strong className="text-white">{awayStudents}</strong>
          </span>
        )}
        {warnedStudents > 0 && (
          <span className="px-2.5 py-1 bg-amber-500/20 rounded-xl text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" /> Cảnh báo: <strong className="text-white">{warnedStudents} HS</strong>
          </span>
        )}

        {onOpenTeacherAlert && (
          <button
            onClick={onOpenTeacherAlert}
            className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <Megaphone className="w-3.5 h-3.5" /> 📢 Gửi Cảnh Báo
          </button>
        )}
      </div>
    </div>
  );
};
