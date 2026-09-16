import React, { useState } from 'react';
import { GameRoom, Player } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { QRCodeModal } from './QRCodeModal';
import { Play, QrCode, Volume2, VolumeX, Users, Sparkles, Shield, Flame, UserX } from 'lucide-react';
import { soundManager } from '../services/audio';

interface ChibiLobbyProps {
  room: GameRoom;
  isHost: boolean;
  currentPlayerId?: string;
  onStartGame: () => void;
  onRemovePlayer?: (playerId: string) => void;
}

export const ChibiLobby: React.FC<ChibiLobbyProps> = ({
  room,
  isHost,
  currentPlayerId,
  onStartGame,
  onRemovePlayer,
}) => {
  const [showQR, setShowQR] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const playersList = Object.values(room.players);

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundManager.playBGM();
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto min-h-[80vh] flex flex-col justify-between p-6 bg-slate-900/90 backdrop-blur-2xl rounded-3xl border-2 border-purple-500/30 shadow-2xl overflow-hidden">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/30 border border-purple-500/50 rounded-2xl text-purple-300">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">{room.quiz.title}</h1>
            <p className="text-xs text-slate-400 font-semibold">{room.quiz.description}</p>
          </div>
        </div>

        {/* Room Code & Quick QR Button */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border-2 border-yellow-400/80 px-5 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-widest">Mã Phòng</span>
              <span className="text-2xl md:text-3xl font-black text-yellow-400 tracking-wider">{room.roomCode}</span>
            </div>
            <button
              onClick={() => setShowQR(true)}
              className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all active:scale-95 shadow-md"
              title="Mở Mã QR Quét Nhanh"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={toggleSound}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Chibi Arena Stage */}
      <div className="relative my-6 min-h-[420px] bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/80 rounded-3xl border border-purple-500/20 p-6 flex flex-col justify-between overflow-hidden shadow-inner">
        {/* Stage Lights & Ambient Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Counter Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-slate-200 font-extrabold text-sm">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Sảnh Đã Có: <strong className="text-yellow-400 text-base">{playersList.length}</strong> Học Sinh</span>
          </div>

          <div className="text-xs text-slate-400 font-bold hidden md:block">
            💡 Học sinh có thể đến muộn và dùng Mã PIN <span className="text-yellow-400">{room.roomCode}</span> để vào bất cứ lúc nào!
          </div>
        </div>

        {/* Chibi Characters Floor */}
        {playersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center z-10">
            <div className="w-20 h-20 mb-4 rounded-full bg-purple-600/20 border-2 border-purple-500/40 flex items-center justify-center animate-bounce">
              <Users className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-300">Đang chờ học sinh tham gia sảnh...</h3>
            <p className="text-sm text-slate-400 mt-1">Hãy chia sẻ Mã PIN <strong className="text-yellow-400">{room.roomCode}</strong> hoặc cho học sinh quét Mã QR!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 py-8 z-10 items-end justify-items-center">
            {playersList.map((player: Player) => {
              const isCurrent = player.id === currentPlayerId;
              return (
                <div 
                  key={player.id} 
                  className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-300 ${
                    isCurrent ? 'bg-purple-600/20 ring-2 ring-purple-400' : ''
                  }`}
                >
                  <ChibiAvatar
                    customization={player.chibi}
                    size="md"
                    showName={true}
                    name={player.name}
                    shieldActive={player.shieldActive}
                    isBouncing={true}
                    streak={player.streak}
                  />

                  {player.isTabActive === false && (
                    <span className="mt-1 px-1.5 py-0.5 bg-rose-600/30 text-rose-300 border border-rose-500/50 rounded-md text-[9px] font-black animate-pulse flex items-center gap-0.5">
                      🔴 Rời tab
                    </span>
                  )}
                  {(player.tabSwitchCount || 0) > 0 && (
                    <span className="mt-0.5 px-1.5 py-0.5 bg-amber-500/20 text-yellow-300 border border-amber-500/40 rounded-md text-[9px] font-extrabold flex items-center gap-0.5">
                      ⚠️ Rời tab: {player.tabSwitchCount}
                    </span>
                  )}

                  {isHost && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Bạn có chắc chắn muốn xóa học sinh "${player.name}" khỏi phòng không?`)) {
                          onRemovePlayer?.(player.id);
                        }
                      }}
                      className="mt-1.5 px-2 py-0.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-md cursor-pointer"
                      title={`Xóa học sinh ${player.name} khỏi phòng`}
                    >
                      <UserX className="w-3 h-3" />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Gamification Info Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-2 px-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-300 z-10">
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <Flame className="w-3.5 h-3.5" /> Chuỗi 2 câu: Tự mở Khiên 🛡️
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-purple-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Chuỗi 3 câu: Mở Thẻ Tấn Công ⚔️
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-blue-400 font-bold">
            <Shield className="w-3.5 h-3.5" /> Khiên chặn 100% sát thương!
          </span>
        </div>
      </div>

      {/* Bottom Host & Student Control Panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={playersList.length === 0}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white font-black text-xl rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            BẮT ĐẦU BÀI TEST NGAY!
          </button>
        ) : (
          <div className="text-center sm:text-left text-slate-300 font-extrabold text-sm flex items-center gap-2 bg-slate-800/80 px-5 py-3 rounded-2xl border border-slate-700">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            Bạn đã sẵn sàng! Đang chờ giáo viên bấm "Bắt Đầu"...
          </div>
        )}

        <div className="text-xs text-slate-400 font-medium">
          Mã phòng: <span className="font-bold text-yellow-400">{room.roomCode}</span> • Tự động đồng bộ thời gian thực
        </div>
      </div>

      {/* QR Modal Component */}
      <QRCodeModal roomCode={room.roomCode} isOpen={showQR} onClose={() => setShowQR(false)} />
    </div>
  );
};
