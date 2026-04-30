import { parsePgn, startingPosition } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { Chess } from 'chessops/chess';
import { makeFen, parseFen, INITIAL_FEN } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import type { LichessPuzzle, ProcessedPuzzle } from '../types';

// ─── Puzzle processing ────────────────────────────────────────────────────────

/** Replay exactly `targetPly` half-moves from the PGN using chessops and
 *  return the resulting FEN. This is Lichess's own library so it handles all
 *  their PGN annotation formats ([%eval], [%clk], etc.) correctly. */
function fenAtPly(pgn: string, targetPly: number): string {
  try {
    const games = parsePgn(pgn);
    const game = games[0];
    if (!game) return INITIAL_FEN;

    const pos = startingPosition(game.headers).unwrap();
    let ply = 0;

    for (const node of game.moves.mainline()) {
      if (ply >= targetPly) break;
      const move = parseSan(pos, node.san);
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
  let fen = fenAtPly(raw.game.pgn, raw.puzzle.initialPly);

  // The piece on solution[0]'s from-square is ground truth for who is moving.
  // If it disagrees with the FEN active-color field (can happen when one parseSan
  // call fails inside fenAtPly and we exit the loop one ply early), patch the FEN.
  const firstFrom = raw.puzzle.solution[0]?.slice(0, 2) ?? '';
  if (firstFrom) {
    const piece = pieceAt(fen, firstFrom);
    if (piece) {
      const parts = fen.split(' ');
      if (parts[1] !== piece.color) {
        parts[1] = piece.color;
        parts[3] = '-'; // clear stale en-passant square
        fen = parts.join(' ');
      }
    }
  }

  const playerColor = fen.split(' ')[1] as 'w' | 'b';
  return {
    id:         raw.puzzle.id,
    fen,
    playerColor,
    solution:   raw.puzzle.solution,
    themes:     raw.puzzle.themes,
    rating:     raw.puzzle.rating,
  };
}

// ─── Position helpers ─────────────────────────────────────────────────────────

/** Apply a UCI move string to a FEN and return the resulting FEN.
 *  Returns the original FEN unchanged if anything fails. */
export function applyUci(fen: string, uci: string): string {
  try {
    const setup = parseFen(fen).unwrap();
    const pos   = Chess.fromSetup(setup).unwrap();
    const move  = parseUci(uci);
    if (!move) return fen;
    pos.play(move);
    return makeFen(pos.toSetup());
  } catch {
    return fen;
  }
}

/** Return the piece at a square from a FEN string, or null if empty.
 *  `type` is the lowercase piece letter: p n b r q k */
export function pieceAt(
  fen: string,
  sq: string
): { type: string; color: 'w' | 'b' } | null {
  const [board] = fen.split(' ');
  const file    = sq.charCodeAt(0) - 97; // a=0 … h=7
  const rank    = 8 - parseInt(sq[1]);   // rank8=row0 … rank1=row7
  const row     = board.split('/')[rank] ?? '';
  let col = 0;
  for (const c of row) {
    if (c >= '1' && c <= '8') { col += +c; continue; }
    if (col === file) {
      return { type: c.toLowerCase(), color: c === c.toUpperCase() ? 'w' : 'b' };
    }
    col++;
  }
  return null;
}

// ─── Eval display helpers ─────────────────────────────────────────────────────

export function centipawnsToLabel(cp: number, whitePov: boolean): string {
  const v = whitePov ? cp : -cp;
  return v > 0 ? `+${(v / 100).toFixed(1)}` : (v / 100).toFixed(1);
}

export function evalToBarPercent(cp: number | undefined, mate: number | undefined): number {
  if (mate !== undefined) return mate > 0 ? 100 : 0;
  if (cp  === undefined)  return 50;
  return 50 + (Math.max(-1000, Math.min(1000, cp)) / 1000) * 50;
}
