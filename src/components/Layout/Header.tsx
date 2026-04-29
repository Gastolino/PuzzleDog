import React from 'react';
import { useAppStore } from '../../store/appStore';
import type { View } from '../../types';

const NAV: { label: string; value: View }[] = [
  { label: 'Puzzle', value: 'puzzle' },
  { label: 'Stats',  value: 'stats'  },
  { label: 'Themes', value: 'themes' },
];

export const Header: React.FC = () => {
  const { rating, ratingHistory, streak, view, setView } = useAppStore();

  const last10 = ratingHistory.slice(-10);
  const trend = last10.length >= 2 ? last10[last10.length - 1].rating - last10[0].rating : 0;

  return (
    <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">

          <span className="font-semibold text-[#e2dfd8] tracking-tight text-sm">
            PuzzleDog
          </span>

          <nav className="flex items-center gap-0.5">
            {NAV.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  view === value
                    ? 'bg-[#e2dfd8] text-[#111] font-medium'
                    : 'text-[#888882] hover:text-[#e2dfd8]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-[#e2dfd8]">
              {rating}
              {trend !== 0 && (
                <span className={`ml-1 text-xs ${trend > 0 ? 'text-[#a8c8a8]' : 'text-[#c8a8a8]'}`}>
                  {trend > 0 ? '+' : ''}{trend}
                </span>
              )}
            </span>
            {streak > 1 && (
              <span className="text-xs text-[#888882]">{streak} streak</span>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
