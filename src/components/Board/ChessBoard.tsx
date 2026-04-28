import React, { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';

interface Props {
  fen: string;
  playerColor: 'w' | 'b';
  onMove: (from: string, to: string, promotion?: string) => boolean;
  flashSquares?: Record<string, { backgroundColor: string }>;
  hintSquare?: string | null;
  disabled?: boolean;
}

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;
type PromoPiece = (typeof PROMOTION_PIECES)[number];

const PIECE_LABELS: Record<PromoPiece, string> = { q: '♛', r: '♜', b: '♝', n: '♞' };

export const ChessBoard: React.FC<Props> = ({
  fen,
  playerColor,
  onMove,
  flashSquares = {},
  hintSquare,
  disabled = false,
}) => {
  const [pendingPromo, setPendingPromo] = useState<{ from: string; to: string } | null>(null);

  const customSquareStyles: Record<string, React.CSSProperties> = { ...flashSquares };
  if (hintSquare) {
    customSquareStyles[hintSquare] = {
      backgroundColor: 'rgba(251,191,36,0.55)',
      borderRadius: '50%',
    };
  }

  const handleDrop = useCallback(
    (from: string, to: string, piece: string): boolean => {
      if (disabled) return false;
      // Detect pawn promotion
      const isPawn = piece[1] === 'P';
      const isPromoRank = to[1] === '8' || to[1] === '1';
      if (isPawn && isPromoRank) {
        setPendingPromo({ from, to });
        return false; // prevent board update until piece chosen
      }
      return onMove(from, to);
    },
    [disabled, onMove]
  );

  const handlePromoChoice = (piece: PromoPiece) => {
    if (!pendingPromo) return;
    onMove(pendingPromo.from, pendingPromo.to, piece);
    setPendingPromo(null);
  };

  return (
    <div className="relative w-full">
      <Chessboard
        position={fen}
        onPieceDrop={handleDrop}
        boardOrientation={playerColor === 'w' ? 'white' : 'black'}
        customSquareStyles={customSquareStyles}
        arePiecesDraggable={!disabled && !pendingPromo}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
        customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
        customDarkSquareStyle={{ backgroundColor: '#b58863' }}
      />

      {/* Promotion dialog */}
      {pendingPromo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded z-10">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
            <p className="text-center text-sm text-gray-300 mb-3">Promote to:</p>
            <div className="flex gap-3">
              {PROMOTION_PIECES.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePromoChoice(p)}
                  className="w-12 h-12 text-3xl bg-gray-700 hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center"
                >
                  {playerColor === 'w' ? PIECE_LABELS[p] : PIECE_LABELS[p].replace(/[♛♜♝♞]/, (c) => ({
                    '♛': '♕', '♜': '♖', '♝': '♗', '♞': '♘'
                  }[c] ?? c))}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
