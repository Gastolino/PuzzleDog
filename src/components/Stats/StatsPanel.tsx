import React from 'react';
import { useAppStore } from '../../store/appStore';
import { getPerformanceLabel } from '../../utils/rating';
import type { ThemeStat } from '../../types';

// ── SVG Sparkline ──────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, width = 300, height = 60 }) => {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-600"
        style={{ width, height }}
      >
        Not enough data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 8;
  const padY = 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + chartH - ((v - min) / range) * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastPoint = points[points.length - 1].split(',');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End dot */}
      <circle
        cx={parseFloat(lastPoint[0])}
        cy={parseFloat(lastPoint[1])}
        r={3}
        fill="#f59e0b"
      />
    </svg>
  );
};

// ── Theme Row ──────────────────────────────────────────────────────────────────

interface ThemeRowProps {
  theme: string;
  stat: ThemeStat;
}

const ThemeRow: React.FC<ThemeRowProps> = ({ theme, stat }) => {
  const rate = stat.attempts > 0 ? stat.solved / stat.attempts : 0;
  const { label, color } = getPerformanceLabel(rate);
  const pct = Math.round(rate * 100);

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-200 capitalize">
          {theme.replace(/([A-Z])/g, ' $1').trim()}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${color}`}>{label}</span>
          <span className="text-xs text-gray-400">
            {stat.solved}/{stat.attempts}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
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
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>{pct}% success</span>
        {stat.avgTime > 0 && (
          <span>avg {(stat.avgTime / 1000).toFixed(0)}s</span>
        )}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const StatsPanel: React.FC = () => {
  const { rating, ratingHistory, themeStats, streak, totalSolved, totalAttempted } =
    useAppStore();

  const last20 = ratingHistory.slice(-20);
  const last10 = ratingHistory.slice(-10);
  const ratingTrend =
    last10.length >= 2 ? last10[last10.length - 1].rating - last10[0].rating : 0;

  const overallRate =
    totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : 0;

  // Sort themes by success rate (worst first)
  const sortedThemes = Object.entries(themeStats)
    .filter(([, s]) => s.attempts > 0)
    .sort(([, a], [, b]) => {
      const rateA = a.solved / a.attempts;
      const rateB = b.solved / b.attempts;
      return rateA - rateB;
    });

  const wins = ratingHistory.filter((e) => e.result === 'win').length;
  const losses = ratingHistory.filter((e) => e.result === 'loss').length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Rating Card */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Rating
        </h2>
        <div className="flex items-end gap-4 mb-4">
          <span className="text-6xl font-bold text-amber-400">{rating}</span>
          {ratingTrend !== 0 && (
            <div
              className={`flex items-center gap-1 mb-2 ${
                ratingTrend > 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              <span className="text-xl">{ratingTrend > 0 ? '▲' : '▼'}</span>
              <span className="text-lg font-semibold">{Math.abs(ratingTrend)}</span>
              <span className="text-sm text-gray-500 ml-1">last 10</span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {last20.length >= 2 ? (
          <div className="w-full overflow-hidden">
            <Sparkline
              data={last20.map((e) => e.rating)}
              width={400}
              height={70}
            />
            <p className="text-xs text-gray-500 mt-1">Last {last20.length} puzzles</p>
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">Solve puzzles to see your rating history</p>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <p className="text-2xl font-bold text-green-400">{totalSolved}</p>
          <p className="text-xs text-gray-400 mt-1">Solved</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <p className="text-2xl font-bold text-gray-300">{totalAttempted}</p>
          <p className="text-xs text-gray-400 mt-1">Attempted</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <p className="text-2xl font-bold text-orange-400">{streak}</p>
          <p className="text-xs text-gray-400 mt-1">🔥 Streak</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <p className="text-2xl font-bold text-blue-400">{overallRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Success Rate</p>
        </div>
      </div>

      {/* Win/Loss */}
      {(wins > 0 || losses > 0) && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Results
          </h3>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400 font-semibold">✓ {wins} wins</span>
            <span className="text-red-400 font-semibold">✗ {losses} losses</span>
            <span className="text-yellow-400 font-semibold">
              ~ {ratingHistory.length - wins - losses} partial
            </span>
          </div>
        </div>
      )}

      {/* Theme Performance */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Theme Performance (Weakest First)
        </h2>
        {sortedThemes.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm border border-gray-700">
            Solve themed puzzles to see your performance breakdown
          </div>
        ) : (
          <div className="space-y-2">
            {sortedThemes.map(([theme, stat]) => (
              <ThemeRow key={theme} theme={theme} stat={stat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
