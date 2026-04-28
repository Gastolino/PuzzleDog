import { Chess } from 'chess.js';
import type { LichessPuzzle, ProcessedPuzzle } from '../types';

export function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci.length === 5 ? { promotion: uci[4] } : {}),
  };
}

export function processPuzzle(raw: LichessPuzzle): ProcessedPuzzle {
  const chess = new Chess();
  try {
    chess.loadPgn(raw.game.pgn);
  } catch {
    chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  const history = chess.history({ verbose: true });
  const puzzle = new Chess();

  for (let i = 0; i < raw.puzzle.initialPly && i < history.length; i++) {
    puzzle.move(history[i]);
  }

  return {
    id: raw.puzzle.id,
    fen: puzzle.fen(),
    playerColor: puzzle.turn(),
    solution: raw.puzzle.solution,
    themes: raw.puzzle.themes,
    rating: raw.puzzle.rating,
  };
}

export function centipawnsToLabel(cp: number, isWhitePerspective: boolean): string {
  const adjusted = isWhitePerspective ? cp : -cp;
  if (adjusted > 0) return `+${(adjusted / 100).toFixed(1)}`;
  return (adjusted / 100).toFixed(1);
}

export function evalToBarPercent(cp: number | undefined, mate: number | undefined): number {
  if (mate !== undefined) return mate > 0 ? 100 : 0;
  if (cp === undefined) return 50;
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + (clamped / 1000) * 50;
}
