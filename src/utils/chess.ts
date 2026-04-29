import { parsePgn, startingPosition } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { makeFen, INITIAL_FEN } from 'chessops/fen';
import type { LichessPuzzle, ProcessedPuzzle } from '../types';

export function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci.length === 5 ? { promotion: uci[4] } : {}),
  };
}

/** Uses chessops (Lichess's own chess library) to replay the game PGN to
 *  exactly initialPly half-moves, returning the correct puzzle FEN. */
function fenAtPly(pgn: string, targetPly: number): string {
  try {
    const games = parsePgn(pgn);
    const game = games[0];
    if (!game) return INITIAL_FEN;

    const pos = startingPosition(game.headers).unwrap();
    let ply = 0;

    for (const nodeData of game.moves.mainline()) {
      if (ply >= targetPly) break;
      const move = parseSan(pos, nodeData.san);
      if (!move) break;
      pos.play(move);
      ply++;
    }

    return makeFen(pos.toSetup());
  } catch {
    return INITIAL_FEN;
  }
}

export function processPuzzle(raw: LichessPuzzle): ProcessedPuzzle {
  const fen = fenAtPly(raw.game.pgn, raw.puzzle.initialPly);
  const playerColor = fen.split(' ')[1] as 'w' | 'b';

  return {
    id: raw.puzzle.id,
    fen,
    playerColor,
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
