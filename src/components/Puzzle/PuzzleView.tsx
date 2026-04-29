import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ChessBoard } from '../Board/ChessBoard';

export const PuzzleView: React.FC = () => {
  const {
    currentPuzzle,
    fen,
    status,
    wrongMoves,
    hintsUsed,
    gaveUp,
    flashSquares,
    hintSquare,
    rating,
    tryMove,
    useHint,
    solvePuzzle,
    nextPuzzle,
    loadPuzzle,
  } = useAppStore();

  if (status === 'idle') {
    return (
      <div className="flex items-center justify-center h-64">
        <button
          onClick={() => loadPuzzle()}
          className="px-5 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-[#e2dfd8] rounded text-sm transition-colors"
        >
          Load Puzzle
        </button>
      </div>
    );
  }

  if (status === 'loading' && !currentPuzzle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#e2dfd8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPuzzle) return null;

  // Board is interactive only when the player should be moving
  const isSolving = status === 'solving' || status === 'failed';
  // During solution playback (status=loading after gaveUp trigger), board is locked
  const isPlaying = status === 'loading' && !!currentPuzzle;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Info bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-[#888882]">
          {currentPuzzle.playerColor === 'w' ? 'White' : 'Black'} to move
        </span>
        <span className="text-xs text-[#4a4a46]">{currentPuzzle.rating}</span>
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

        {/* Solution playback overlay */}
        {isPlaying && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-10">
            <span className="text-xs text-[#888882] bg-[#111]/80 px-3 py-1 rounded">
              Showing solution...
            </span>
          </div>
        )}

        {/* Completion overlay */}
        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]/80 rounded z-20">
            <div className="text-center p-6">
              <p className="text-xl font-semibold text-[#e2dfd8] mb-1">
                {gaveUp ? 'Solution shown' : 'Solved'}
              </p>
              <p className="text-sm text-[#888882] mb-4">Rating: {rating}</p>
              <button
                onClick={() => nextPuzzle()}
                className="px-6 py-2 bg-[#e2dfd8] text-[#111] rounded text-sm font-medium hover:opacity-80 transition-opacity"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls — visible while solving */}
      {isSolving && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => useHint()}
            className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#e2dfd8] rounded text-sm transition-colors"
          >
            Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ''}
          </button>

          <button
            onClick={() => solvePuzzle()}
            className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#e2dfd8] rounded text-sm transition-colors"
          >
            Solve
          </button>

          <button
            onClick={() => nextPuzzle()}
            className="ml-auto px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888882] rounded text-sm transition-colors"
          >
            Skip
          </button>

          {wrongMoves > 0 && (
            <span className="text-xs text-[#c8a8a8]">{wrongMoves} wrong</span>
          )}
        </div>
      )}
    </div>
  );
};
