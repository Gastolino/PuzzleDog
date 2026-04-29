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
          <div className="w-6 h-6 border-2 border-[#e2dfd8] border-t-transparent rounded-full animate-spin" />
        ) : (
          <button
            onClick={() => loadPuzzle()}
            className="px-5 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-[#e2dfd8] rounded text-sm transition-colors"
          >
            Load Puzzle
          </button>
        )}
      </div>
    );
  }

  if (!currentPuzzle) return null;

  const isSolving = status === 'solving' || status === 'analyzing' || status === 'failed';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Minimal info bar — puzzle rating only */}
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

        {/* Success overlay */}
        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]/80 rounded z-20">
            <div className="text-center p-6">
              <p className="text-xl font-semibold text-[#e2dfd8] mb-1">
                {wrongMoves === 0 && hintsUsed === 0 ? 'Solved' : 'Solved'}
              </p>
              <p className="text-sm text-[#888882] mb-4">
                Rating: {rating}
              </p>
              <button
                onClick={() => nextPuzzle()}
                className="px-6 py-2 bg-[#e2dfd8] text-[#111] rounded text-sm font-medium transition-opacity hover:opacity-80"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isSolving && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => useHint()}
            className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#e2dfd8] rounded text-sm transition-colors"
          >
            Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ''}
          </button>
          <button
            onClick={() => analyzeCurrentPosition()}
            disabled={status === 'analyzing'}
            className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#e2dfd8] rounded text-sm transition-colors disabled:opacity-40"
          >
            {status === 'analyzing' ? 'Analyzing...' : 'Analyze'}
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
