import React, { useState } from 'react';
import { Player } from '../types';
import { Megaphone, X, Send, Volume2, ShieldAlert, AlertTriangle, MessageSquare, Sparkles } from 'lucide-react';
import { realtime } from '../services/realtime';
import { soundManager } from '../services/audio';

interface TeacherAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  players: Record<string, Player>;
}

export const TeacherAlertModal: React.FC<TeacherAlertModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  players,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const playersList = Object.values(players);

  const PRESETS = [
    {
      id: 'silence',
      type: 'SILENCE' as const,
      icon: '🤫',
      title: 'Cấm nói chuyện',
      message: 'Yêu cầu cả lớp giữ trật tự, tuyệt đối không nói chuyện hay gây ồn!',
      color: 'bg-red-600/20 border-red-500/40 text-red-300 hover:bg-red-600/30',
    },
    {
      id: 'focus',
      type: 'FOCUS' as const,
      icon: '📝',
      title: 'Nghiêm túc làm bài',
      message: 'Nghiêm túc tự làm bài, không xem bài hay trao đổi với bạn xung quanh!',
      color: 'bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30',
    },
    {
      id: 'no-tab',
      type: 'WARNING' as const,
      icon: '⚠️',
      title: 'Cấm mở tab khác',
      message: 'Cảnh báo: Tập trung hoàn toàn vào bài test, tuyệt đối không mở tab khác tra cứu!',
      color: 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30',
    },
    {
      id: 'time',
      type: 'WARNING' as const,
      icon: '⏱️',
      title: 'Nhắc nhở thời gian',
      message: 'Thời gian làm bài sắp hết, các em hãy rà soát lại kỹ các câu trả lời!',
      color: 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30',
    },
    {
      id: 'praise',
      type: 'PRAISE' as const,
      icon: '🌟',
      title: 'Khen ngợi lớp',
      message: 'Các em đang làm bài rất tốt, tiếp tục phát huy tốc độ và độ chính xác nhé!',
      color: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30',
    },
  ];

  const handleSend = (presetMsg?: string, alertType?: any) => {
    const finalMsg = (presetMsg || customMessage).trim();
    if (!finalMsg) return;

    soundManager.playCorrect();
    realtime.sendTeacherAlert(
      roomCode,
      selectedTarget,
      finalMsg,
      alertType || 'WARNING'
    );

    const targetText = selectedTarget === 'ALL' ? 'tất cả học sinh' : (players[selectedTarget]?.name || 'học sinh');
    setSentNotice(`✅ Đã phát thông báo thành công tới ${targetText}!`);
    setCustomMessage('');
    setSelectedPreset(null);

    setTimeout(() => setSentNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-2xl text-purple-300">
              <Megaphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Gửi Cảnh Báo & Nhắc Nhở Học Sinh</h3>
              <p className="text-xs text-slate-400">Phát thông báo nhắc nhở trực tiếp lên màn hình học sinh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Student Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
            1. Chọn Đối Tượng Nhận Cảnh Báo:
          </label>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-yellow-300 font-extrabold text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">📢 Gửi Cho TẤT CẢ Học Sinh Trong Lớp ({playersList.length} HS)</option>
            {playersList.map((p) => {
              const switchText = (p.tabSwitchCount || 0) > 0 ? ` (⚠️ ${p.tabSwitchCount} lần rời tab)` : '';
              const statusText = p.isTabActive === false ? ' [🔴 Đang rời tab]' : '';
              return (
                <option key={p.id} value={p.id}>
                  🎯 Chỉ gửi riêng cho: {p.name}{statusText}{switchText}
                </option>
              );
            })}
          </select>
        </div>

        {/* Mẫu cảnh báo nhanh (Quick Presets) */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
            2. Các Mẫu Cảnh Báo Nhanh (Click để phát ngay):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSend(p.message, p.type)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 active:scale-95 ${p.color}`}
              >
                <span className="text-xl">{p.icon}</span>
                <div>
                  <span className="font-extrabold text-xs block">{p.title}</span>
                  <span className="text-[11px] opacity-80 leading-tight block">{p.message}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nhập thông điệp tùy chỉnh */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
            3. Hoặc Nhập Nội Dung Cảnh Báo Tùy Chỉnh:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập nội dung nhắc nhở tùy chỉnh (VD: Em Nam trật tự làm bài)..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!customMessage.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shrink-0 flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Gửi
            </button>
          </div>
        </div>

        {/* Notification Feedback Toast */}
        {sentNotice && (
          <div className="p-3 bg-emerald-600/30 border border-emerald-500/50 rounded-xl text-emerald-300 font-extrabold text-xs text-center animate-fade-in">
            {sentNotice}
          </div>
        )}
      </div>
    </div>
  );
};
