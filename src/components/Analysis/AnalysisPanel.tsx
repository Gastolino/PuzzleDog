import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { centipawnsToLabel, evalToBarPercent } from '../../utils/chess';

const THEME_EXPLANATIONS: Record<string, string> = {
  fork: 'One piece attacks two or more enemy pieces at once.',
  pin: 'A piece cannot move without exposing a more valuable piece behind it.',
  skewer: 'A valuable piece is attacked and forced to move, exposing another behind it.',
  discoveredAttack: 'Moving one piece reveals an attack from another.',
  doubleCheck: 'Both the moving piece and a discovered piece give check simultaneously.',
  mateIn1: 'Checkmate in one move.',
  mateIn2: 'Forced checkmate in two moves.',
  mateIn3: 'Forced checkmate in three moves.',
  mateIn4: 'Forced checkmate in four moves.',
  mateIn5: 'Forced checkmate in five moves.',
  backRankMate: 'Checkmate delivered on the back rank by a rook or queen.',
  smotheredMate: 'A knight mates a king surrounded by its own pieces.',
  arabianMate: 'Rook and knight combine to trap the king in a corner.',
  sacrifice: 'Give up material to gain a positional or tactical advantage.',
  quietMove: 'A non-capturing, non-checking move that changes everything.',
  defensiveMove: 'The best response is to defend rather than attack.',
  endgame: 'Precision required with few pieces remaining.',
  middlegame: 'Complex play with most pieces still active.',
  opening: 'Tactical opportunity in the opening phase.',
  advancedPawn: 'A far-advanced pawn creates threats or promotion chances.',
  pawnEndgame: 'King and pawn precision.',
  rookEndgame: 'Rook endgame technique.',
  queenEndgame: 'Queen endgame calculation.',
  bishopEndgame: 'Same- or opposite-color bishop endings.',
  xRayAttack: 'A piece exerts force through another piece.',
  zugzwang: 'Any move the opponent makes worsens their position.',
  trappedPiece: 'A piece has no safe square to escape to.',
  clearance: 'Move a piece out of the way to open a line or square.',
};

export const AnalysisPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { lastEval, currentPuzzle, status, analyzeCurrentPosition, nextPuzzle, fen } =
    useAppStore();

  const isSuccess = status === 'success';
  const isAnalyzing = status === 'analyzing';
  const bestPv = lastEval?.pvs?.[0];
  const isWhiteTurn = fen.split(' ')[1] === 'w';
  const relevantThemes = currentPuzzle?.themes.filter(t => THEME_EXPLANATIONS[t]) ?? [];

  const evalPercent = bestPv ? evalToBarPercent(bestPv.cp, bestPv.mate) : 50;
  const evalLabel = bestPv
    ? bestPv.mate !== undefined
      ? bestPv.mate > 0 ? `M${bestPv.mate}` : `-M${Math.abs(bestPv.mate)}`
      : centipawnsToLabel(bestPv.cp ?? 0, isWhiteTurn)
    : null;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#222] transition-colors"
      >
        <span className="text-sm text-[#e2dfd8]">Analysis</span>
        <span className="text-xs text-[#4a4a46] select-none">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#2a2a2a]">

          {isSuccess && (
            <p className="text-sm text-[#a8c8a8] pt-3">Puzzle solved.</p>
          )}

          {/* Eval */}
          {lastEval && bestPv ? (
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#4a4a46]">
                <span>Black</span>
                {evalLabel && <span className="text-[#888882] font-mono">{evalLabel}</span>}
                <span>White</span>
              </div>
              <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#e2dfd8] transition-all duration-500"
                  style={{ width: `${evalPercent}%` }}
                />
              </div>
              {lastEval.pvs.slice(0, 3).map((pv, i) => {
                const score = pv.mate !== undefined
                  ? pv.mate > 0 ? `M${pv.mate}` : `-M${Math.abs(pv.mate)}`
                  : centipawnsToLabel(pv.cp ?? 0, isWhiteTurn);
                return (
                  <div key={i} className="flex gap-2 text-xs font-mono bg-[#222] rounded px-2 py-1.5">
                    <span className={i === 0 ? 'text-[#a8c8a8]' : 'text-[#4a4a46]'}>{score}</span>
                    <span className="text-[#888882] break-all">
                      {pv.moves.split(' ').slice(0, 5).join(' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pt-3">
              {!isAnalyzing ? (
                <button
                  onClick={() => analyzeCurrentPosition()}
                  className="w-full py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-[#e2dfd8] rounded text-sm transition-colors"
                >
                  Get Analysis
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-[#888882]">
                  <span className="inline-block w-3 h-3 border border-[#888882] border-t-transparent rounded-full animate-spin" />
                  Fetching eval...
                </div>
              )}
            </div>
          )}

          {/* Themes */}
          {relevantThemes.length > 0 && (
            <div className="space-y-1.5">
              {relevantThemes.map(theme => (
                <div key={theme} className="bg-[#222] rounded px-3 py-2">
                  <p className="text-xs font-medium text-[#e2dfd8] capitalize mb-0.5">
                    {theme.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-xs text-[#888882]">{THEME_EXPLANATIONS[theme]}</p>
                </div>
              ))}
            </div>
          )}

          {isSuccess && (
            <button
              onClick={() => nextPuzzle()}
              className="w-full py-2 bg-[#e2dfd8] text-[#111] rounded text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Next Puzzle
            </button>
          )}
        </div>
      )}
    </div>
  );
};
