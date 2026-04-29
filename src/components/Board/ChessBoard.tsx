import React, { useState, useCallback, useRef } from 'react';
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
const PROMO_LABELS: Record<PromoPiece, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };

/** Returns 'w', 'b', or null for the piece color at a given square, from FEN. */
function pieceColorAt(fen: string, square: string): 'w' | 'b' | null {
  const [board] = fen.split(' ');
  const fileIdx = square.charCodeAt(0) - 97;
  const rankIdx = 8 - parseInt(square[1]);
  const rank = board.split('/')[rankIdx] ?? '';
  let col = 0;
  for (const c of rank) {
    if (c >= '1' && c <= '8') {
      col += parseInt(c);
    } else {
      if (col === fileIdx) return c === c.toUpperCase() ? 'w' : 'b';
      col++;
    }
  }
  return null;
}

export const ChessBoard: React.FC<Props> = ({
  fen,
  playerColor,
  onMove,
  flashSquares = {},
  hintSquare,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: string; to: string } | null>(null);
  // Track whether a drag is happening so click handler doesn't also fire
  const isDragging = useRef(false);

  const resetSelected = () => setSelected(null);

  const customSquareStyles: Record<string, React.CSSProperties> = { ...flashSquares };

  if (selected) {
    customSquareStyles[selected] = {
      backgroundColor: 'rgba(226, 223, 216, 0.25)',
      boxShadow: 'inset 0 0 0 2px rgba(226, 223, 216, 0.7)',
    };
  }
  if (hintSquare) {
    customSquareStyles[hintSquare] = {
      backgroundColor: 'rgba(226, 223, 216, 0.2)',
      boxShadow: 'inset 0 0 0 2px rgba(226, 223, 216, 0.5)',
      borderRadius: '50%',
    };
  }

  const attemptMove = useCallback(
    (from: string, to: string, promo?: string): boolean => {
      const piece = pieceColorAt(fen, from);
      const isPawn = (() => {
        const [board] = fen.split(' ');
        const fi = from.charCodeAt(0) - 97;
        const ri = 8 - parseInt(from[1]);
        const rank = board.split('/')[ri] ?? '';
        let col = 0;
        for (const c of rank) {
          if (c >= '1' && c <= '8') col += parseInt(c);
          else { if (col === fi) return c.toLowerCase() === 'p'; col++; }
        }
        return false;
      })();
      const isPromoRank = to[1] === '8' || to[1] === '1';
      if (isPawn && isPromoRank && !promo) {
        setPendingPromo({ from, to });
        return false;
      }
      return onMove(from, to, promo);
    },
    [fen, onMove]
  );

  // Drag handlers
  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      isDragging.current = false;
      if (disabled) return false;
      resetSelected();
      return attemptMove(from, to);
    },
    [disabled, attemptMove]
  );

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    return !disabled;
  }, [disabled]);

  // Tap / click handler
  const handleSquareClick = useCallback(
    (square: string) => {
      if (disabled || isDragging.current) return;

      // Promotion pending — ignore board clicks
      if (pendingPromo) return;

      const clickedColor = pieceColorAt(fen, square);

      if (!selected) {
        // Select if it's the player's piece
        if (clickedColor === playerColor) setSelected(square);
        return;
      }

      if (square === selected) {
        setSelected(null);
        return;
      }

      // Clicking another friendly piece — reselect
      if (clickedColor === playerColor) {
        setSelected(square);
        return;
      }

      // Attempt move
      const moved = attemptMove(selected, square);
      setSelected(null);
      if (!moved && !pendingPromo) {
        // If move was rejected and it's not a promotion prompt, do nothing
      }
    },
    [disabled, fen, playerColor, selected, pendingPromo, attemptMove]
  );

  const handlePromoChoice = (piece: PromoPiece) => {
    if (!pendingPromo) return;
    onMove(pendingPromo.from, pendingPromo.to, piece);
    setPendingPromo(null);
  };

  return (
    <div
      className="board-wrap relative w-full"
      onDragStart={e => e.preventDefault()}
    >
      <Chessboard
        position={fen}
        onPieceDrop={handleDrop}
        onPieceDragBegin={handleDragStart}
        onSquareClick={handleSquareClick}
        boardOrientation={playerColor === 'w' ? 'white' : 'black'}
        customSquareStyles={customSquareStyles}
        arePiecesDraggable={!disabled && !pendingPromo}
        customBoardStyle={{
          borderRadius: '3px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
        }}
        customLightSquareStyle={{ backgroundColor: '#e8e5de' }}
        customDarkSquareStyle={{ backgroundColor: '#272523' }}
      />

      {/* Promotion dialog */}
      {pendingPromo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded z-10">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-center text-sm text-[#888882] mb-3">Promote to</p>
            <div className="grid grid-cols-2 gap-2">
              {PROMOTION_PIECES.map((p) => (
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
