import React from 'react';
import { useAppStore } from '../../store/appStore';
import { getPerformanceLabel } from '../../utils/rating';

interface ThemeItem { id: string; name: string }
interface Group { label: string; themes: ThemeItem[] }

const GROUPS: Group[] = [
  {
    label: 'Special',
    themes: [
      { id: 'all',  name: 'All Themes'       },
      { id: 'weak', name: 'Train Weak Spots'  },
    ],
  },
  {
    label: 'Tactics',
    themes: [
      { id: 'fork',             name: 'Fork'              },
      { id: 'pin',              name: 'Pin'               },
      { id: 'skewer',           name: 'Skewer'            },
      { id: 'discoveredAttack', name: 'Discovered Attack' },
      { id: 'doubleCheck',      name: 'Double Check'      },
      { id: 'sacrifice',        name: 'Sacrifice'         },
      { id: 'xRayAttack',       name: 'X-Ray Attack'      },
      { id: 'trappedPiece',     name: 'Trapped Piece'     },
      { id: 'clearance',        name: 'Clearance'         },
    ],
  },
  {
    label: 'Checkmates',
    themes: [
      { id: 'mateIn1',      name: 'Mate in 1'       },
      { id: 'mateIn2',      name: 'Mate in 2'       },
      { id: 'mateIn3',      name: 'Mate in 3'       },
      { id: 'mateIn4',      name: 'Mate in 4'       },
      { id: 'mateIn5',      name: 'Mate in 5'       },
      { id: 'backRankMate', name: 'Back-rank Mate'  },
      { id: 'smotheredMate',name: 'Smothered Mate'  },
      { id: 'arabianMate',  name: 'Arabian Mate'    },
    ],
  },
  {
    label: 'Endgames',
    themes: [
      { id: 'rookEndgame',   name: 'Rook Endgame'   },
      { id: 'queenEndgame',  name: 'Queen Endgame'  },
      { id: 'bishopEndgame', name: 'Bishop Endgame' },
      { id: 'pawnEndgame',   name: 'Pawn Endgame'   },
      { id: 'advancedPawn',  name: 'Advanced Pawn'  },
    ],
  },
  {
    label: 'Strategy',
    themes: [
      { id: 'quietMove',    name: 'Quiet Move'    },
      { id: 'zugzwang',     name: 'Zugzwang'      },
      { id: 'defensiveMove',name: 'Defensive Move' },
    ],
  },
  {
    label: 'Phase',
    themes: [
      { id: 'opening',    name: 'Opening'    },
      { id: 'middlegame', name: 'Middlegame' },
      { id: 'endgame',    name: 'Endgame'    },
    ],
  },
];

export const ThemeSelector: React.FC = () => {
  const { selectedTheme, themeStats, setTheme, nextPuzzle, setView } = useAppStore();

  const handleSelect = (id: string) => {
    setTheme(id === 'all' ? null : id);
    nextPuzzle();
    setView('puzzle');
  };

  return (
    <div className="max-w-lg mx-auto px-2 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-[#e2dfd8]">Choose a Theme</h2>
        <p className="text-xs text-[#4a4a46] mt-0.5">
          Select a puzzle category. "Train Weak Spots" picks your lowest-scoring theme.
        </p>
      </div>

      {GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-xs text-[#4a4a46] uppercase tracking-wider mb-2">{group.label}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {group.themes.map(({ id, name }) => {
              const stat = themeStats[id];
              const rate = stat && stat.attempts > 0 ? stat.solved / stat.attempts : null;
              const { label: perfLabel } = rate !== null ? getPerformanceLabel(rate) : { label: '' };
              const isActive = selectedTheme === id || (id === 'all' && selectedTheme === null);

              return (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`flex flex-col items-start p-3 rounded border text-left transition-all ${
                    isActive
                      ? 'border-[#e2dfd8] bg-[#222]'
                      : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#363636]'
                  }`}
                >
                  <span className="text-sm text-[#e2dfd8]">{name}</span>
                  {stat && stat.attempts > 0 && (
                    <div className="mt-1.5 w-full">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#888882]">{perfLabel}</span>
                        <span className="text-[#4a4a46]">{stat.solved}/{stat.attempts}</span>
                      </div>
                      <div className="h-0.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#888882] rounded-full"
                          style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
