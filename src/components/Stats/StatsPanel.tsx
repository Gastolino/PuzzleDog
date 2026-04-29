import React from 'react';
import { useAppStore } from '../../store/appStore';
import { getPerformanceLabel } from '../../utils/rating';

function Sparkline({ history }: { history: { rating: number }[] }) {
  const points = history.slice(-20);
  if (points.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-xs text-[#4a4a46]">
        Solve more puzzles to see history
      </div>
    );
  }
  const ratings = points.map(p => p.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = max - min || 1;
  const W = 220, H = 48, P = 4;

  const pts = points.map((p, i) => {
    const x = P + (i / (points.length - 1)) * (W - P * 2);
    const y = H - P - ((p.rating - min) / range) * (H - P * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="#888882"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2.5" fill="#e2dfd8" />
    </svg>
  );
}

export const StatsPanel: React.FC = () => {
  const { rating, ratingHistory, themeStats, streak, totalSolved, totalAttempted } = useAppStore();

  const accuracy = totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : 0;
  const last10 = ratingHistory.slice(-10);
  const trend = last10.length >= 2 ? last10[last10.length - 1].rating - last10[0].rating : 0;

  const sortedThemes = Object.entries(themeStats)
    .filter(([, s]) => s.attempts > 0)
    .sort(([, a], [, b]) => a.solved / a.attempts - b.solved / b.attempts);

  return (
    <div className="max-w-lg mx-auto space-y-3 px-2">
      {/* Rating */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-[#4a4a46] mb-1">Rating</p>
            <p className="text-4xl font-semibold text-[#e2dfd8]">{rating}</p>
            {trend !== 0 && (
              <p className={`text-xs mt-1 ${trend > 0 ? 'text-[#a8c8a8]' : 'text-[#c8a8a8]'}`}>
                {trend > 0 ? '+' : ''}{trend} last 10
              </p>
            )}
          </div>
          {streak > 0 && (
            <div className="text-right">
              <p className="text-2xl font-semibold text-[#e2dfd8]">{streak}</p>
              <p className="text-xs text-[#4a4a46]">streak</p>
            </div>
          )}
        </div>
        <Sparkline history={ratingHistory} />
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Solved',    value: totalSolved    },
          { label: 'Attempted', value: totalAttempted },
          { label: 'Accuracy',  value: `${accuracy}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-3 text-center">
            <p className="text-xl font-semibold text-[#e2dfd8]">{value}</p>
            <p className="text-xs text-[#4a4a46] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Theme breakdown */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
        <p className="text-xs text-[#4a4a46] uppercase tracking-wider mb-3">By Theme</p>
        {sortedThemes.length === 0 ? (
          <p className="text-xs text-[#4a4a46] text-center py-4">No data yet</p>
        ) : (
          <div className="space-y-3">
            {sortedThemes.map(([theme, stat]) => {
              const rate = stat.solved / stat.attempts;
              const pct = Math.round(rate * 100);
              const { label } = getPerformanceLabel(rate);
              return (
                <div key={theme}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#e2dfd8] capitalize">
                      {theme.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-xs text-[#888882]">
                      {label} · {stat.solved}/{stat.attempts}
                    </span>
                  </div>
                  <div className="h-1 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#888882] rounded-full transition-all"
                      style={{ width: `${pct}%`, opacity: 0.4 + rate * 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
