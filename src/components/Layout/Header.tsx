import React from 'react';
import { useAppStore } from '../../store/appStore';
import type { View } from '../../types';

const NAV_ITEMS: { label: string; value: View }[] = [
  { label: 'Puzzle', value: 'puzzle' },
  { label: 'Stats', value: 'stats' },
  { label: 'Themes', value: 'themes' },
];

export const Header: React.FC = () => {
  const { rating, ratingHistory, streak, view, setView } = useAppStore();

  // Rating trend from last 10 entries
  const last10 = ratingHistory.slice(-10);
  const trend =
    last10.length >= 2 ? last10[last10.length - 1].rating - last10[0].rating : 0;

  return (
    <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl" role="img" aria-label="paw">
              🐾
            </span>
            <span className="font-bold text-lg text-white hidden sm:block">PuzzleDog</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.value}
                onClick={() => setView(item.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === item.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <span className="text-amber-400 font-bold">{rating}</span>
              {trend !== 0 && (
                <span
                  className={`text-xs font-semibold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {trend > 0 ? '▲' : '▼'}
                  {Math.abs(trend)}
                </span>
              )}
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-1">
                <span role="img" aria-label="fire">
                  🔥
                </span>
                <span className="font-bold text-orange-400">{streak}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
