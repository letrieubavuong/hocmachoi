import React from 'react';
import { ChibiCustomization } from '../types';

const DEFAULT_SKIN_COLOR = '#ffe0bd';
const DEFAULT_HAIR_COLOR = '#2d3748';
const DEFAULT_OUTFIT_COLOR = '#6c5ce7';

const SIZE_MAP = {
  sm: { width: 64, height: 80 },
  md: { width: 96, height: 120 },
  lg: { width: 140, height: 175 },
  xl: { width: 190, height: 230 },
} as const;

export interface ChibiAvatarProps {
  customization: ChibiCustomization;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  name?: string;
  shieldActive?: boolean;
  isBouncing?: boolean;
  streak?: number;
  className?: string;
}

/**
 * Renders the floating Name & Badge tag above Chibi Avatar.
 */
const NameBadge = React.memo<{
  name: string;
  streak: number;
  shieldActive: boolean;
}>(({ name, streak, shieldActive }) => {
  return (
    <div className="absolute -top-7 z-20 transition-all duration-300 pointer-events-auto">
      <div
        title={name}
        className="px-3 py-1 bg-slate-900/90 text-white font-extrabold rounded-full border-2 border-purple-500 shadow-lg text-xs flex items-center gap-1.5 backdrop-blur-md max-w-[130px] sm:max-w-[160px]"
      >
        {streak >= 2 && <span className="text-amber-400 shrink-0">🔥 {streak}</span>}
        <span className="truncate">{name}</span>
        {shieldActive && <span className="text-blue-400 font-bold shrink-0">🛡️</span>}
      </div>
    </div>
  );
});

NameBadge.displayName = 'NameBadge';

/**
 * Renders Glowing Shield Aura around Avatar.
 */
const ShieldAura = React.memo(() => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 rounded-full border-4 border-cyan-400/80 bg-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.7)] motion-safe:animate-pulse z-10 pointer-events-none transform scale-110"
    />
  );
});

ShieldAura.displayName = 'ShieldAura';

/**
 * Renders the static SVG Chibi Character body.
 * Isolated from streak / shield / name state changes.
 */
const ChibiSvg = React.memo<{
  customization: ChibiCustomization;
  size: 'sm' | 'md' | 'lg' | 'xl';
  isBouncing: boolean;
}>(
  ({ customization, size, isBouncing }) => {
    const dims = SIZE_MAP[size] || SIZE_MAP.md;
    const skinColor = customization?.skinColor || DEFAULT_SKIN_COLOR;
    const hairColor = customization?.hairColor || DEFAULT_HAIR_COLOR;
    const outfitColor = customization?.outfitColor || DEFAULT_OUTFIT_COLOR;

    return (
      <div
        className={`${isBouncing ? 'motion-safe:animate-bounce-slow' : ''} transition-transform duration-300 transform hover:scale-105`}
        style={{ width: dims.width, height: dims.height }}
      >
        <svg
          viewBox="0 0 100 125"
          className="w-full h-full drop-shadow-xl"
          aria-hidden="true"
          focusable="false"
        >
          {/* Shadow below avatar */}
          <ellipse cx="50" cy="118" rx="32" ry="6" fill="#000000" opacity="0.35" />

          {/* Halo Hat (Behind head) */}
          {customization?.hatStyle === 'halo' && (
            <ellipse
              cx="50"
              cy="12"
              rx="22"
              ry="6"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="4"
              className="motion-safe:animate-pulse"
            />
          )}

          {/* Body & Outfit */}
          <rect x="32" y="65" width="36" height="38" rx="12" fill={outfitColor} />

          {/* Outfit Style Details */}
          {customization?.outfitStyle === 'hoodie' && (
            <>
              <path d="M 40 65 L 50 82 L 60 65 Z" fill="#ffffff" opacity="0.3" />
              <circle cx="50" cy="84" r="3" fill="#ffffff" />
            </>
          )}
          {customization?.outfitStyle === 'superhero' && (
            <path d="M 44 72 L 50 82 L 56 72 L 50 75 Z" fill="#fbbf24" />
          )}
          {customization?.outfitStyle === 'wizard' && (
            <polygon points="50,68 45,78 55,78" fill="#a855f7" />
          )}

          {/* Arms & Hands */}
          <circle cx="26" cy="80" r="7" fill={skinColor} />
          <circle cx="74" cy="80" r="7" fill={skinColor} />

          {/* Feet & Shoes */}
          <rect x="36" y="100" width="10" height="12" rx="4" fill="#1e293b" />
          <rect x="54" y="100" width="10" height="12" rx="4" fill="#1e293b" />

          {/* Head */}
          <circle cx="50" cy="42" r="28" fill={skinColor} />

          {/* Cheeks */}
          <circle cx="34" cy="48" r="4" fill="#ff7675" opacity="0.5" />
          <circle cx="66" cy="48" r="4" fill="#ff7675" opacity="0.5" />

          {/* Eyes */}
          {customization?.eyeType === 'happy' && (
            <>
              <circle cx="38" cy="40" r="3.5" fill="#1e293b" />
              <circle cx="62" cy="40" r="3.5" fill="#1e293b" />
              <circle cx="39.5" cy="38.5" r="1.2" fill="#ffffff" />
              <circle cx="63.5" cy="38.5" r="1.2" fill="#ffffff" />
            </>
          )}
          {customization?.eyeType === 'star' && (
            <>
              <text x="33" y="44" fontSize="11" fill="#f59e0b">
                ★
              </text>
              <text x="57" y="44" fontSize="11" fill="#f59e0b">
                ★
              </text>
            </>
          )}
          {customization?.eyeType === 'wink' && (
            <>
              <path d="M 34 40 Q 38 35 42 40" stroke="#1e293b" strokeWidth="2.5" fill="none" />
              <circle cx="62" cy="40" r="3.5" fill="#1e293b" />
              <circle cx="63.5" cy="38.5" r="1.2" fill="#ffffff" />
            </>
          )}
          {customization?.eyeType === 'cool' && (
            <rect x="30" y="36" width="40" height="10" rx="3" fill="#1e293b" />
          )}
          {customization?.eyeType === 'cute' && (
            <>
              <circle cx="38" cy="41" r="5" fill="#1e293b" />
              <circle cx="62" cy="41" r="5" fill="#1e293b" />
              <circle cx="36" cy="39" r="2" fill="#ffffff" />
              <circle cx="60" cy="39" r="2" fill="#ffffff" />
            </>
          )}

          {/* Mouth */}
          <path
            d="M 44 51 Q 50 56 56 51"
            stroke="#1e293b"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Hairstyle */}
          {customization?.hairStyle === 'short' && (
            <path
              d="M 22 36 Q 50 12 78 36 Q 74 24 50 20 Q 26 24 22 36 Z"
              fill={hairColor}
            />
          )}
          {customization?.hairStyle === 'spiky' && (
            <path
              d="M 22 38 L 30 18 L 40 26 L 50 14 L 60 26 L 70 18 L 78 38 Z"
              fill={hairColor}
            />
          )}
          {customization?.hairStyle === 'pigtails' && (
            <>
              <path d="M 22 36 Q 50 16 78 36 Q 50 20 22 36 Z" fill={hairColor} />
              <circle cx="18" cy="36" r="10" fill={hairColor} />
              <circle cx="82" cy="36" r="10" fill={hairColor} />
            </>
          )}
          {customization?.hairStyle === 'curly' && (
            <path
              d="M 22 40 Q 25 15 50 15 Q 75 15 78 40 C 85 25 65 10 50 10 C 35 10 15 25 22 40 Z"
              fill={hairColor}
            />
          )}
          {customization?.hairStyle === 'long' && (
            <>
              <rect x="20" y="32" width="10" height="36" rx="5" fill={hairColor} />
              <rect x="70" y="32" width="10" height="36" rx="5" fill={hairColor} />
              <path d="M 22 36 Q 50 16 78 36 Z" fill={hairColor} />
            </>
          )}
          {customization?.hairStyle === 'afro' && (
            <circle cx="50" cy="32" r="32" fill={hairColor} opacity="0.9" />
          )}

          {/* Hats */}
          {customization?.hatStyle === 'crown' && (
            <path
              d="M 32 20 L 41 8 L 50 16 L 59 8 L 68 20 Z"
              fill="#fbbf24"
              stroke="#d97706"
              strokeWidth="1.5"
            />
          )}
          {customization?.hatStyle === 'cap' && (
            <>
              <path d="M 24 28 Q 50 12 76 28 Z" fill="#ef4444" />
              <rect x="20" y="27" width="30" height="5" rx="2" fill="#dc2626" />
            </>
          )}
          {customization?.hatStyle === 'catEars' && (
            <>
              <polygon points="26,24 34,6 42,22" fill="#ec4899" />
              <polygon points="58,22 66,6 74,24" fill="#ec4899" />
            </>
          )}
          {customization?.hatStyle === 'wizardHat' && (
            <>
              <polygon points="50,2 24,28 76,28" fill="#7c3aed" />
              <ellipse cx="50" cy="28" rx="28" ry="4" fill="#6d28d9" />
              <text x="46" y="20" fontSize="10" fill="#fbbf24">
                ★
              </text>
            </>
          )}

          {/* Accessories */}
          {customization?.accessory === 'glasses' && (
            <>
              <circle cx="38" cy="40" r="7" fill="none" stroke="#000000" strokeWidth="2" />
              <circle cx="62" cy="40" r="7" fill="none" stroke="#000000" strokeWidth="2" />
              <line x1="45" y1="40" x2="55" y2="40" stroke="#000000" strokeWidth="2" />
            </>
          )}
          {customization?.accessory === 'sunglasses' && (
            <>
              <path d="M 30 36 L 46 36 L 44 46 L 32 46 Z" fill="#000000" />
              <path d="M 54 36 L 70 36 L 68 46 L 56 46 Z" fill="#000000" />
              <line x1="46" y1="38" x2="54" y2="38" stroke="#000000" strokeWidth="2" />
            </>
          )}
          {customization?.accessory === 'headphone' && (
            <>
              <path
                d="M 22 40 C 22 15 78 15 78 40"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
              />
              <rect x="18" y="34" width="8" height="16" rx="4" fill="#1d4ed8" />
              <rect x="74" y="34" width="8" height="16" rx="4" fill="#1d4ed8" />
            </>
          )}
          {customization?.accessory === 'mask' && (
            <rect
              x="34"
              y="44"
              width="32"
              height="14"
              rx="4"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          )}
        </svg>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.size !== nextProps.size) return false;
    if (prevProps.isBouncing !== nextProps.isBouncing) return false;

    const p = prevProps.customization;
    const n = nextProps.customization;
    if (p === n) return true;
    if (!p || !n) return false;

    return (
      p.skinColor === n.skinColor &&
      p.hairColor === n.hairColor &&
      p.outfitColor === n.outfitColor &&
      p.eyeType === n.eyeType &&
      p.hairStyle === n.hairStyle &&
      p.hatStyle === n.hatStyle &&
      p.accessory === n.accessory &&
      p.outfitStyle === n.outfitStyle
    );
  }
);

ChibiSvg.displayName = 'ChibiSvg';

/**
 * Main ChibiAvatar wrapper component.
 * Memoized to prevent re-rendering when parent re-renders without prop changes.
 */
export const ChibiAvatar: React.FC<ChibiAvatarProps> = React.memo(
  ({
    customization,
    size = 'md',
    showName = false,
    name,
    shieldActive = false,
    isBouncing = true,
    streak = 0,
    className = '',
  }) => {
    return (
      <div className={`relative flex flex-col items-center select-none ${className}`}>
        {/* Floating Name Tag Above Head */}
        {showName && name && (
          <NameBadge name={name} streak={streak} shieldActive={shieldActive} />
        )}

        {/* Active Glowing Shield Aura */}
        {shieldActive && <ShieldAura />}

        {/* Main SVG Chibi Body */}
        <ChibiSvg customization={customization} size={size} isBouncing={isBouncing} />
      </div>
    );
  }
);

ChibiAvatar.displayName = 'ChibiAvatar';
