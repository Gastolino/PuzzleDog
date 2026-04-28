import React from 'react';
import { useAppStore } from '../../store/appStore';
import { getPerformanceLabel } from '../../utils/rating';
import type { ThemeStat } from '../../types';

interface ThemeInfo {
  id: string;
  label: string;
  description: string;
  emoji: string;
}

const THEME_GROUPS: { label: string; themes: ThemeInfo[] }[] = [
  {
    label: 'Special',
    themes: [
      { id: 'all', label: 'All Themes', description: 'Random puzzle from any theme', emoji: '🎲' },
      {
        id: 'weak',
        label: 'Weak Spots',
        description: 'Auto-selects your worst-performing theme',
        emoji: '🎯',
      },
    ],
  },
  {
    label: 'Tactics',
    themes: [
      { id: 'fork', label: 'Fork', description: 'Attack two pieces at once', emoji: '⚡' },
      { id: 'pin', label: 'Pin', description: 'Restrict piece movement', emoji: '📍' },
      { id: 'skewer', label: 'Skewer', description: 'Force a piece to expose another', emoji: '🗡️' },
      {
        id: 'discoveredAttack',
        label: 'Discovered Attack',
        description: 'Reveal a hidden attack',
        emoji: '💫',
      },
      {
        id: 'doubleCheck',
        label: 'Double Check',
        description: 'Two pieces check simultaneously',
        emoji: '‼️',
      },
      {
        id: 'sacrifice',
        label: 'Sacrifice',
        description: 'Give material for a decisive advantage',
        emoji: '♟️',
      },
      {
        id: 'xRayAttack',
        label: 'X-Ray Attack',
        description: 'Attack through another piece',
        emoji: '🔭',
      },
      {
        id: 'trappedPiece',
        label: 'Trapped Piece',
        description: 'Capture a piece with no escape',
        emoji: '🪤',
      },
    ],
  },
  {
    label: 'Checkmates',
    themes: [
      { id: 'mateIn1', label: 'Mate in 1', description: 'Find the killing blow', emoji: '👑' },
      { id: 'mateIn2', label: 'Mate in 2', description: 'Two-move forced mate', emoji: '👑' },
      { id: 'mateIn3', label: 'Mate in 3', description: 'Three-move forced mate', emoji: '👑' },
      { id: 'mateIn4', label: 'Mate in 4', description: 'Four-move forced mate', emoji: '👑' },
      { id: 'mateIn5', label: 'Mate in 5', description: 'Five-move forced mate', emoji: '👑' },
      {
        id: 'backRankMate',
        label: 'Back Rank Mate',
        description: 'Rook or queen checkmates on the back rank',
        emoji: '🏰',
      },
      {
        id: 'smotheredMate',
        label: 'Smothered Mate',
        description: 'Knight mates a king blocked by its own pieces',
        emoji: '🐎',
      },
    ],
  },
  {
    label: 'Endgames',
    themes: [
      {
        id: 'rookEndgame',
        label: 'Rook Endgame',
        description: 'Rook vs rook endgame tactics',
        emoji: '🏰',
      },
      {
        id: 'pawnEndgame',
        label: 'Pawn Endgame',
        description: 'King and pawn endgames',
        emoji: '♟️',
      },
      {
        id: 'queenEndgame',
        label: 'Queen Endgame',
        description: 'Queen endgame technique',
        emoji: '👸',
      },
      {
        id: 'bishopEndgame',
        label: 'Bishop Endgame',
        description: 'Bishop endgame strategy',
        emoji: '⛪',
      },
      {
        id: 'advancedPawn',
        label: 'Advanced Pawn',
        description: 'Far-advanced pawn threats',
        emoji: '🚀',
      },
    ],
  },
  {
    label: 'Strategy',
    themes: [
      {
        id: 'quietMove',
        label: 'Quiet Move',
        description: 'Non-obvious decisive move',
        emoji: '🤫',
      },
      {
        id: 'zugzwang',
        label: 'Zugzwang',
        description: 'Any move worsens your position',
        emoji: '😰',
      },
      {
        id: 'clearance',
        label: 'Clearance',
        description: 'Clear a line or square for another piece',
        emoji: '🧹',
      },
      {
        id: 'defensiveMove',
        label: 'Defensive Move',
        description: 'Defend against an immediate threat',
        emoji: '🛡️',
      },
    ],
  },
];

// ── Single Theme Card ──────────────────────────────────────────────────────────

interface ThemeCardProps {
  theme: ThemeInfo;
  stat?: ThemeStat;
  isSelected: boolean;
  onSelect: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, stat, isSelected, onSelect }) => {
  const hasData = stat && stat.attempts > 0;
  const rate = hasData ? stat.solved / stat.attempts : null;
  const { label: perfLabel, color: perfColor } = rate !== null ? getPerformanceLabel(rate) : { label: '', color: '' };
  const pct = rate !== null ? Math.round(rate * 100) : null;

  const isSpecial = theme.id === 'all' || theme.id === 'weak';

  return (
    <button
      onClick={onSelect}
      className={`relative text-left rounded-xl p-4 border transition-all duration-150 hover:scale-[1.02] active:scale-100 ${
        isSelected
          ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50'
          : isSpecial
            ? 'bg-gradient-to-br from-amber-900/30 to-gray-800 border-amber-700/50 hover:border-amber-600'
            : 'bg-gray-800 border-gray-700 hover:border-gray-500'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{theme.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-100 text-sm leading-tight">{theme.label}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{theme.description}</p>

          {hasData && pct !== null && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${perfColor}`}>{perfLabel}</span>
                <span className="text-xs text-gray-500">
                  {stat.solved}/{stat.attempts}
                </span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    pct >= 80
                      ? 'bg-green-500'
                      : pct >= 60
                        ? 'bg-blue-500'
                        : pct >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isSelected && (
        <span className="absolute top-2 right-2 text-blue-400 text-sm">✓</span>
      )}
    </button>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const ThemeSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { selectedTheme, themeStats, setTheme, loadPuzzle, view } = useAppStore();

  const handleSelect = (themeId: string) => {
    const newTheme = themeId === 'all' ? null : themeId;
    setTheme(newTheme);
    if (view !== 'puzzle') {
      useAppStore.getState().setView('puzzle');
    }
    // Load a new puzzle with the selected theme
    setTimeout(() => {
      loadPuzzle();
    }, 100);
  };

  const currentSelection = selectedTheme ?? 'all';

  if (compact) {
    // Compact sidebar version - just show theme chips
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Theme
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[{ id: 'all', label: 'All' }, { id: 'weak', label: '🎯 Weak' }].map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                currentSelection === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
          {THEME_GROUPS.slice(1).flatMap((g) =>
            g.themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  currentSelection === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Theme Trainer</h2>
        <p className="text-sm text-gray-400">
          Select a theme to practice. Your performance is tracked per theme.
        </p>
      </div>

      {THEME_GROUPS.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            {group.label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                stat={themeStats[theme.id]}
                isSelected={currentSelection === theme.id}
                onSelect={() => handleSelect(theme.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
