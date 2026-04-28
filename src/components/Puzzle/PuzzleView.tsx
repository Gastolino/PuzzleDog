import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ChessBoard } from '../Board/ChessBoard';

const THEME_BADGES: Record<string, string> = {
  fork: 'bg-purple-800 text-purple-200',
  pin: 'bg-blue-800 text-blue-200',
  skewer: 'bg-cyan-800 text-cyan-200',
  mateIn1: 'bg-red-800 text-red-200',
  mateIn2: 'bg-red-800 text-red-200',
  mateIn3: 'bg-red-800 text-red-200',
  mateIn4: 'bg-red-800 text-red-200',
  mateIn5: 'bg-red-800 text-red-200',
  sacrifice: 'bg-orange-800 text-orange-200',
  endgame: 'bg-gray-600 text-gray-200',
  opening: 'bg-emerald-800 text-emerald-200',
  middlegame: 'bg-indigo-800 text-indigo-200',
};

function themeBadgeClass(theme: string): string {
  return THEME_BADGES[theme] ?? 'bg-gray-700 text-gray-300';
}

export const PuzzleView: React.FC = () => {
  const {
    currentPuzzle,
    fen,
    status,
    solutionIdx,
    wrongMoves,
    hintsUsed,
    flashSquares,
    hintSquare,
    rating,
    tryMove,
    useHint,
    nextPuzzle,
    analyzeCurrentPosition,
    loadPuzzle,
  } = useAppStore();

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        {status === 'loading' ? (
          <>
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Loading puzzle…</p>
          </>
        ) : (
          <>
            <p className="text-gray-400">No puzzle loaded.</p>
            <button
              onClick={() => loadPuzzle()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Load Puzzle
            </button>
          </>
        )}
      </div>
    );
  }

  if (!currentPuzzle) return null;

  const playerMoveCount = Math.ceil(currentPuzzle.solution.length / 2);
  const currentPlayerMove = Math.floor(solutionIdx / 2) + 1;
  const clampedMove = Math.min(currentPlayerMove, playerMoveCount);
  const isSolving = status === 'solving' || status === 'analyzing' || status === 'failed';

  const ratingChange = (() => {
    if (status !== 'success') return null;
    // Already applied — show last history entry diff
    return null;
  })();
  void ratingChange;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Puzzle info bar */}
      <div className="bg-gray-800 rounded-lg px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Rating:</span>
          <span className="font-semibold text-amber-400">{currentPuzzle.rating}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Move</span>
          <span className="font-semibold text-white">
            {clampedMove}/{playerMoveCount}
          </span>
        </div>
        {wrongMoves > 0 && (
          <span className="text-red-400 text-xs">✗ {wrongMoves} mistake{wrongMoves > 1 ? 's' : ''}</span>
        )}
        {hintsUsed > 0 && (
          <span className="text-amber-400 text-xs">💡 {hintsUsed} hint{hintsUsed > 1 ? 's' : ''}</span>
        )}
        <div className="flex flex-wrap gap-1 ml-auto">
          {currentPuzzle.themes.slice(0, 4).map((theme) => (
            <span
              key={theme}
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${themeBadgeClass(theme)}`}
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="relative">
        <ChessBoard
          fen={fen}
          playerColor={currentPuzzle.playerColor}
          onMove={tryMove}
          flashSquares={flashSquares}
          hintSquare={hintSquare}
          disabled={!isSolving}
        />

        {/* Success overlay */}
        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 rounded-lg z-20">
            <div className="text-center p-6">
              <div className="text-5xl mb-3">✓</div>
              <p className="text-2xl font-bold text-green-300 mb-1">Excellent!</p>
              <p className="text-green-400 text-sm mb-1">
                {wrongMoves === 0 && hintsUsed === 0
                  ? 'Perfect solve!'
                  : wrongMoves === 0
                    ? 'Solved with hints'
                    : 'Puzzle solved'}
              </p>
              <p className="text-lg font-semibold text-white mb-4">
                Rating: <span className="text-amber-400">{rating}</span>
              </p>
              <button
                onClick={() => nextPuzzle()}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Next Puzzle →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Turn indicator */}
      {isSolving && (
        <div className="text-center text-sm text-gray-400">
          {currentPuzzle.playerColor === 'w' ? '⬜ White' : '⬛ Black'} to move
        </div>
      )}

      {/* Control bar */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        {isSolving && (
          <>
            <button
              onClick={() => useHint()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              💡 Hint
            </button>
            <button
              onClick={() => analyzeCurrentPosition()}
              disabled={status === 'analyzing'}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {status === 'analyzing' ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                '🔍 Analyze'
              )}
            </button>
            <button
              onClick={() => nextPuzzle()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ⏭ Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
};
