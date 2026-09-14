import React, { useState } from 'react';
import { ChibiCustomization } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import {
  SKIN_COLORS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  HAIR_STYLES,
  EYE_TYPES,
  OUTFIT_STYLES,
  HAT_STYLES,
  ACCESSORY_STYLES,
  getRandomChibi,
} from '../data/chibiAssets';
import { Shuffle, Sparkles, UserCheck } from 'lucide-react';

interface ChibiCustomizerProps {
  initialName?: string;
  initialChibi?: ChibiCustomization;
  onComplete: (name: string, chibi: ChibiCustomization) => void;
}

export const ChibiCustomizer: React.FC<ChibiCustomizerProps> = ({
  initialName = '',
  initialChibi,
  onComplete,
}) => {
  const [name, setName] = useState(initialName);
  const [chibi, setChibi] = useState<ChibiCustomization>(
    initialChibi || getRandomChibi()
  );
  const [activeTab, setActiveTab] = useState<'style' | 'colors' | 'accessories'>('style');

  const handleRandomize = () => {
    setChibi(getRandomChibi());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onComplete(name.trim(), chibi);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-800/90 backdrop-blur-xl p-6 rounded-3xl border-2 border-purple-500/30 shadow-2xl">
      <h2 className="text-2xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-400 mb-6 flex items-center justify-center gap-2">
        <Sparkles className="w-6 h-6 text-yellow-400 animate-spin" />
        Tạo Nhân Vật Chibi Của Bạn
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Tên Học Sinh / Biệt Danh:</label>
          <input
            type="text"
            required
            maxLength={20}
            placeholder="Nhập tên của bạn (Ví dụ: Minh Tuấn)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-3 bg-slate-900/90 border-2 border-purple-500/50 rounded-2xl text-white font-extrabold focus:outline-none focus:border-yellow-400 text-lg transition-colors placeholder:font-normal placeholder:text-slate-500"
          />
        </div>

        {/* Live Chibi Preview */}
        <div className="flex flex-col items-center justify-center py-6 bg-slate-900/60 rounded-3xl border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <button
              type="button"
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-bold shadow-lg transition-transform active:scale-95"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Ngẫu Nhiên
            </button>
          </div>

          <ChibiAvatar customization={chibi} size="lg" showName={true} name={name || 'Học Sinh'} />
        </div>

        {/* Customization Category Tabs */}
        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-2 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'style' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Kiểu Dáng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('colors')}
            className={`flex-1 py-2 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'colors' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Màu Sắc
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accessories')}
            className={`flex-1 py-2 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'accessories' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mũ & Kính
          </button>
        </div>

        {/* Tab 1: Style options */}
        {activeTab === 'style' && (
          <div className="space-y-4 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block mb-2">Kiểu Tóc</span>
              <div className="grid grid-cols-4 gap-2">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setChibi({ ...chibi, hairStyle: h.id })}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all ${
                      chibi.hairStyle === h.id
                        ? 'bg-purple-500/30 border-purple-400 text-purple-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block mb-2">Mắt / Biểu Cảm</span>
              <div className="grid grid-cols-3 gap-2">
                {EYE_TYPES.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setChibi({ ...chibi, eyeType: e.id })}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all ${
                      chibi.eyeType === e.id
                        ? 'bg-purple-500/30 border-purple-400 text-purple-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Colors options */}
        {activeTab === 'colors' && (
          <div className="space-y-4 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block mb-2">Màu Da</span>
              <div className="flex gap-3">
                {SKIN_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setChibi({ ...chibi, skinColor: color })}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      chibi.skinColor === color ? 'scale-125 border-white ring-2 ring-purple-500' : 'border-transparent hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block mb-2">Màu Tóc</span>
              <div className="flex flex-wrap gap-2.5">
                {HAIR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setChibi({ ...chibi, hairColor: color })}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      chibi.hairColor === color ? 'scale-125 border-white ring-2 ring-purple-500' : 'border-transparent hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block mb-2">Màu Trang Phục</span>
              <div className="flex flex-wrap gap-2.5">
                {OUTFIT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setChibi({ ...chibi, outfitColor: color })}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      chibi.outfitColor === color ? 'scale-125 border-white ring-2 ring-purple-500' : 'border-transparent hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Accessories */}
        {activeTab === 'accessories' && (
          <div className="space-y-4 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block mb-2">Mũ / Trang Sức</span>
              <div className="grid grid-cols-3 gap-2">
                {HAT_STYLES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setChibi({ ...chibi, hatStyle: h.id })}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all ${
                      chibi.hatStyle === h.id
                        ? 'bg-purple-500/30 border-purple-400 text-purple-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block mb-2">Kính & Phụ Kiện</span>
              <div className="grid grid-cols-3 gap-2">
                {ACCESSORY_STYLES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setChibi({ ...chibi, accessory: a.id })}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all ${
                      chibi.accessory === a.id
                        ? 'bg-purple-500/30 border-purple-400 text-purple-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submit Join Button */}
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 text-white font-black text-xl rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
        >
          <UserCheck className="w-6 h-6" />
          Sẵn Sàng Vào Sảnh Chờ!
        </button>
      </form>
    </div>
  );
};
