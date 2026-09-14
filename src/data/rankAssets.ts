export interface RankTier {
  name: string;
  subTitle: string;
  icon: string;
  minScore: number;
  bgGradient: string;
  borderColor: string;
  textColor: string;
}

export const LIEN_QUAN_RANKS: RankTier[] = [
  {
    name: 'Thách Đấu',
    subTitle: 'TOP 1 SERVER',
    icon: '🏆',
    minScore: 3000,
    bgGradient: 'from-amber-400 via-rose-500 to-yellow-300',
    borderColor: 'border-yellow-300 ring-4 ring-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.8)]',
    textColor: 'text-yellow-300',
  },
  {
    name: 'Cao Thủ',
    subTitle: 'Huyền Thoại Đấu Trường',
    icon: '👑',
    minScore: 2200,
    bgGradient: 'from-rose-600 via-red-500 to-pink-600',
    borderColor: 'border-red-400 ring-2 ring-red-500/50 shadow-[0_0_15px_rgba(244,63,94,0.6)]',
    textColor: 'text-rose-400',
  },
  {
    name: 'Tinh Anh',
    subTitle: 'Bậc Thay Trí Tuệ',
    icon: '🌌',
    minScore: 1600,
    bgGradient: 'from-purple-600 via-violet-600 to-indigo-600',
    borderColor: 'border-purple-400 ring-2 ring-purple-500/40',
    textColor: 'text-purple-300',
  },
  {
    name: 'Kim Cương',
    subTitle: 'Cao Thủ Tốc Độ',
    icon: '🔷',
    minScore: 1100,
    bgGradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    borderColor: 'border-cyan-400 ring-2 ring-cyan-400/40',
    textColor: 'text-cyan-300',
  },
  {
    name: 'Bạch Kim',
    subTitle: 'Tập Sự Xuất Sắc',
    icon: '💎',
    minScore: 700,
    bgGradient: 'from-teal-500 to-emerald-600',
    borderColor: 'border-teal-400',
    textColor: 'text-teal-300',
  },
  {
    name: 'Vàng',
    subTitle: 'Chiến Binh Năng Nổ',
    icon: '🥇',
    minScore: 400,
    bgGradient: 'from-yellow-500 to-amber-600',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-400',
  },
  {
    name: 'Bạc',
    subTitle: 'Học Sinh Chăm Chỉ',
    icon: '🥈',
    minScore: 180,
    bgGradient: 'from-slate-400 to-slate-600',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-300',
  },
  {
    name: 'Đồng',
    subTitle: 'Tân Binh Gia Nhập',
    icon: '🥉',
    minScore: 0,
    bgGradient: 'from-amber-800 to-stone-700',
    borderColor: 'border-stone-500',
    textColor: 'text-amber-600',
  },
];

export function getRankTier(score: number): RankTier {
  for (const rank of LIEN_QUAN_RANKS) {
    if (score >= rank.minScore) {
      return rank;
    }
  }
  return LIEN_QUAN_RANKS[LIEN_QUAN_RANKS.length - 1];
}
