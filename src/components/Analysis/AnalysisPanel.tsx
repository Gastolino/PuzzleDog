import React from 'react';
import { useAppStore } from '../../store/appStore';
import { centipawnsToLabel, evalToBarPercent } from '../../utils/chess';

const THEME_EXPLANATIONS: Record<string, string> = {
  fork: 'A single piece attacks two or more enemy pieces simultaneously.',
  pin: 'A piece is unable to move without exposing a more valuable piece behind it.',
  skewer: 'Attacks a high-value piece, forcing it to move and exposing a piece behind it.',
  discoveredAttack: 'Moving one piece reveals an attack from another piece behind it.',
  doubleCheck: 'Both the moving piece and a discovered piece give check simultaneously.',
  mateIn1: 'Checkmate in one move.',
  mateIn2: 'Forced checkmate sequence in two moves.',
  mateIn3: 'Forced checkmate sequence in three moves.',
  mateIn4: 'Forced checkmate sequence in four moves.',
  mateIn5: 'Forced checkmate sequence in five moves.',
  backRankMate: 'Checkmate delivered on the back rank by a rook or queen.',
  smotheredMate: 'A knight delivers checkmate to a king surrounded by its own pieces.',
  sacrifice: 'Deliberately giving up material to gain a positional or tactical advantage.',
  quietMove: 'A powerful non-capturing, non-checking move that changes the position decisively.',
  endgame: 'A tactic arising in the endgame phase.',
  opening: 'A tactic arising in the opening phase.',
  middlegame: 'A tactic arising in the middlegame phase.',
  advancedPawn: 'A far-advanced pawn that creates threats or promotion opportunities.',
  rookEndgame: 'An endgame featuring rooks as the main pieces.',
  queenEndgame: 'An endgame featuring queens as the main pieces.',
  bishopEndgame: 'An endgame featuring bishops as the main pieces.',
  pawnEndgame: 'An endgame featuring only kings and pawns.',
  defensiveMove: 'A move that defends against an immediate threat.',
  xRayAttack: 'A piece attacks or defends through another piece.',
  zugzwang: 'Any move the opponent makes worsens their position.',
  trappedPiece: 'A piece that has no safe squares and can be captured.',
  clearance: 'Moving a piece out of the way to clear a line or square.',
};

function formatMove(moves: string, idx: number): string {
  const parts = moves.trim().split(' ');
  if (parts.length <= idx) return moves;
  return parts.slice(0, 3).join(' ');
}

export const AnalysisPanel: React.FC = () => {
  const { currentPuzzle, lastEval, status, nextPuzzle, analyzeCurrentPosition, fen } = useAppStore();

  if (!currentPuzzle) return null;

  const isDone = status === 'success' || status === 'failed';
  const canAnalyze = status === 'solving' || status === 'success' || status === 'failed';

  // Eval bar
  const topPv = lastEval?.pvs?.[0];
  const evalPercent = topPv
    ? evalToBarPercent(topPv.cp, topPv.mate)
    : 50;
  const evalLabel = topPv
    ? topPv.mate !== undefined
      ? topPv.mate > 0
        ? `M${topPv.mate}`
        : `-M${Math.abs(topPv.mate)}`
      : centipawnsToLabel(topPv.cp ?? 0, true)
    : null;

  const puzzleThemes = currentPuzzle.themes;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
          Analysis
        </h3>

        {/* Eval bar */}
        {lastEval ? (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Black</span>
              {evalLabel && (
                <span className="font-mono text-amber-400 font-semibold">{evalLabel}</span>
              )}
              <span>White</span>
            </div>
            <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
              <div
                className="h-full bg-gray-100 transition-all duration-500 rounded-full"
                style={{ width: `${evalPercent}%` }}
              />
            </div>

            {/* Best lines */}
            {lastEval.pvs?.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Best Lines
                </p>
                {lastEval.pvs.slice(0, 3).map((pv, i) => {
                  const scoreStr =
                    pv.mate !== undefined
                      ? pv.mate > 0
                        ? `M${pv.mate}`
                        : `-M${Math.abs(pv.mate)}`
                      : centipawnsToLabel(pv.cp ?? 0, true);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs font-mono bg-gray-900 rounded px-2 py-1.5"
                    >
                      <span
                        className={`shrink-0 font-bold ${
                          i === 0 ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {scoreStr}
                      </span>
                      <span className="text-gray-300 break-all">
                        {formatMove(pv.moves, 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4">
            {canAnalyze && status !== 'analyzing' ? (
              <button
                onClick={() => analyzeCurrentPosition()}
                className="w-full py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🔍 Get Cloud Analysis
              </button>
            ) : status === 'analyzing' ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400">
                <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Fetching Stockfish eval…
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic text-center py-2">
                Analysis not available
              </p>
            )}
          </div>
        )}

        {/* FEN display */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            FEN
          </p>
          <p className="text-xs font-mono text-gray-500 break-all bg-gray-900 rounded px-2 py-1.5">
            {fen}
          </p>
        </div>

        {/* Themes */}
        {puzzleThemes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Puzzle Themes
            </p>
            <div className="space-y-2">
              {puzzleThemes.map((theme) => (
                <div key={theme} className="bg-gray-900 rounded-lg px-3 py-2">
                  <p className="text-sm font-semibold text-blue-300 capitalize mb-0.5">
                    {theme.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  {THEME_EXPLANATIONS[theme] && (
                    <p className="text-xs text-gray-400">{THEME_EXPLANATIONS[theme]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Puzzle */}
        {isDone && (
          <button
            onClick={() => nextPuzzle()}
            className="mt-4 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
          >
            Next Puzzle →
          </button>
        )}
      </div>
    </div>
  );
};
