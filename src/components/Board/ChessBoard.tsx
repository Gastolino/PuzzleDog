import React, { useState, useCallback, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { pieceAt } from '../../utils/chess';

interface Props {
  fen:              string;
  playerColor:      'w' | 'b';
  onMove:           (from: string, to: string, promotion?: string) => boolean;
  flashSquares?:    Record<string, { backgroundColor: string }>;
  hintSquare?:      string | null;
  disabled?:        boolean;
  lightSquareColor?: string;
  darkSquareColor?:  string;
}

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;
type PromoPiece = (typeof PROMOTION_PIECES)[number];
const PROMO_LABELS: Record<PromoPiece, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };

export const ChessBoard: React.FC<Props> = ({
  fen,
  playerColor,
  onMove,
  flashSquares = {},
  hintSquare,
  disabled = false,
  lightSquareColor = '#e8e5de',
  darkSquareColor  = '#272523',
}) => {
  const [selected,    setSelected]    = useState<string | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: string; to: string } | null>(null);
  const isDragging = useRef(false);

  // ── Square styles ──────────────────────────────────────────────────────────

  const squareStyles: Record<string, React.CSSProperties> = { ...flashSquares };

  if (selected) {
    squareStyles[selected] = {
      backgroundColor: 'rgba(226,223,216,0.25)',
      boxShadow:       'inset 0 0 0 2px rgba(226,223,216,0.7)',
    };
  }
  if (hintSquare) {
    squareStyles[hintSquare] = {
      backgroundColor: 'rgba(226,223,216,0.2)',
      boxShadow:       'inset 0 0 0 2px rgba(226,223,216,0.5)',
      borderRadius:    '50%',
    };
  }

  // ── Move attempt ───────────────────────────────────────────────────────────

  const attemptMove = useCallback(
    (from: string, to: string, promo?: string): boolean => {
      // Intercept pawn promotions — show dialog before forwarding to store
      const piece      = pieceAt(fen, from);
      const isPawn     = piece?.type === 'p';
      const promoRank  = to[1] === '8' || to[1] === '1';
      if (isPawn && promoRank && !promo) {
        setPendingPromo({ from, to });
        return false;
      }
      return onMove(from, to, promo);
    },
    [fen, onMove]
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragBegin = useCallback(() => {
    isDragging.current = true;
    return !disabled;
  }, [disabled]);

  const handleDragEnd = useCallback(() => {
    // Always reset — fires even when piece is dropped off-board
    isDragging.current = false;
  }, []);

  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      isDragging.current = false;
      if (disabled) return false;
      setSelected(null);
      return attemptMove(from, to);
    },
    [disabled, attemptMove]
  );

  // ── Click / tap handler ────────────────────────────────────────────────────

  const handleSquareClick = useCallback(
    (square: string) => {
      if (disabled || isDragging.current || pendingPromo) return;

      const clicked = pieceAt(fen, square);

      if (!selected) {
        // First tap — select if it's the player's piece
        if (clicked?.color === playerColor) setSelected(square);
        return;
      }

      // Second tap on same square — deselect
      if (square === selected) { setSelected(null); return; }

      // Second tap on another friendly piece — reselect
      if (clicked?.color === playerColor) { setSelected(square); return; }

      // Attempt the move
      attemptMove(selected, square);
      setSelected(null);
    },
    [disabled, fen, playerColor, selected, pendingPromo, attemptMove]
  );

  // ── Promotion dialog ───────────────────────────────────────────────────────

  const handlePromoChoice = (piece: PromoPiece) => {
    if (!pendingPromo) return;
    onMove(pendingPromo.from, pendingPromo.to, piece);
    setPendingPromo(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="board-wrap relative w-full" onDragStart={e => e.preventDefault()}>
      <Chessboard
        position={fen}
        boardOrientation={playerColor === 'w' ? 'white' : 'black'}
        onPieceDrop={handleDrop}
        onPieceDragBegin={handleDragBegin}
        onPieceDragEnd={handleDragEnd}
        onSquareClick={handleSquareClick}
        customSquareStyles={squareStyles}
        arePiecesDraggable={!disabled && !pendingPromo}
        customBoardStyle={{ borderRadius: '3px', boxShadow: '0 4px 32px rgba(0,0,0,0.6)' }}
        customLightSquareStyle={{ backgroundColor: lightSquareColor }}
        customDarkSquareStyle={{ backgroundColor: darkSquareColor }}
      />

      {pendingPromo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded z-10">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-center text-sm text-[#888882] mb-3">Promote to</p>
            <div className="grid grid-cols-2 gap-2">
              {PROMOTION_PIECES.map(p => (
                <button
                  key={p}
                  onClick={() => handlePromoChoice(p)}
                  className="px-4 py-2 bg-[#222] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded text-sm text-[#e2dfd8] transition-colors"
                >
                  {PROMO_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
