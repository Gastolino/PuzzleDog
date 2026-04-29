import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProcessedPuzzle,
  ThemeStat,
  RatingEntry,
  CloudEval,
  PuzzleStatus,
  View,
} from '../types';
import { fetchPuzzle, fetchCloudEval } from '../services/lichess';
import { processPuzzle, uciToMove } from '../utils/chess';
import { calculateRatingChange } from '../utils/rating';
import { Chess } from 'chess.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PersistedState {
  rating: number;
  ratingHistory: RatingEntry[];
  themeStats: Record<string, ThemeStat>;
  streak: number;
  totalSolved: number;
  totalAttempted: number;
}

interface SessionState {
  currentPuzzle: ProcessedPuzzle | null;
  chess: Chess | null;
  fen: string;
  status: PuzzleStatus;
  solutionIdx: number;
  wrongMoves: number;
  hintsUsed: number;
  startTime: number;
  lastEval: CloudEval | null;
  selectedTheme: string | null;
  view: View;
  flashSquares: Record<string, { backgroundColor: string }>;
  hintSquare: string | null;
}

interface AppActions {
  loadPuzzle: () => Promise<void>;
  tryMove: (from: string, to: string, promotion?: string) => boolean;
  useHint: () => string | null;
  analyzeCurrentPosition: () => Promise<void>;
  nextPuzzle: () => Promise<void>;
  setTheme: (theme: string | null) => void;
  setView: (view: View) => void;
}

type AppState = PersistedState & SessionState & AppActions;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getWeakTheme(themeStats: Record<string, ThemeStat>): string | null {
  const entries = Object.entries(themeStats).filter(([, s]) => s.attempts > 0);
  if (entries.length === 0) return null;
  let worst: string | null = null;
  let worstRate = Infinity;
  for (const [theme, stat] of entries) {
    const rate = stat.solved / stat.attempts;
    if (rate < worstRate) {
      worstRate = rate;
      worst = theme;
    }
  }
  return worst;
}

function defaultThemeStat(): ThemeStat {
  return { attempts: 0, solved: 0, failed: 0, avgTime: 0 };
}

function updateThemeStats(
  themeStats: Record<string, ThemeStat>,
  themes: string[],
  result: 'win' | 'loss' | 'partial',
  elapsedMs: number
): Record<string, ThemeStat> {
  const updated = { ...themeStats };
  for (const theme of themes) {
    const prev = updated[theme] ?? defaultThemeStat();
    const newAttempts = prev.attempts + 1;
    const solved = result === 'win' || result === 'partial' ? prev.solved + 1 : prev.solved;
    const failed = result === 'loss' ? prev.failed + 1 : prev.failed;
    const avgTime =
      prev.attempts === 0
        ? elapsedMs
        : Math.round((prev.avgTime * prev.attempts + elapsedMs) / newAttempts);
    updated[theme] = { attempts: newAttempts, solved, failed, avgTime };
  }
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const defaultSession: SessionState = {
  currentPuzzle: null,
  chess: null,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  status: 'idle',
  solutionIdx: 0,
  wrongMoves: 0,
  hintsUsed: 0,
  startTime: 0,
  lastEval: null,
  selectedTheme: null,
  view: 'puzzle',
  flashSquares: {},
  hintSquare: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Persisted defaults ─────────────────────────────────────────────────
      rating: 1200,
      ratingHistory: [],
      themeStats: {},
      streak: 0,
      totalSolved: 0,
      totalAttempted: 0,

      // ── Session defaults ───────────────────────────────────────────────────
      ...defaultSession,

      // ── Actions ───────────────────────────────────────────────────────────

      loadPuzzle: async () => {
        set({ status: 'loading', lastEval: null, hintSquare: null });
        try {
          let theme = get().selectedTheme;
          if (theme === 'weak') {
            theme = getWeakTheme(get().themeStats);
          }
          const raw = await fetchPuzzle(theme ?? undefined);
          const processed = processPuzzle(raw);
          const chess = new Chess(processed.fen);
          set({
            currentPuzzle: processed,
            chess,
            fen: processed.fen,
            status: 'solving',
            solutionIdx: 0,
            wrongMoves: 0,
            hintsUsed: 0,
            startTime: Date.now(),
            flashSquares: {},
            hintSquare: null,
          });
        } catch (err) {
          console.error('Failed to load puzzle:', err);
          set({ status: 'idle' });
        }
      },

      tryMove: (from: string, to: string, promotion?: string) => {
        const state = get();
        const { currentPuzzle, chess, solutionIdx, status } = state;
        if (!currentPuzzle || !chess || status !== 'solving') return false;

        const expectedUci = currentPuzzle.solution[solutionIdx];
        const expected = uciToMove(expectedUci);

        const isCorrect =
          expected.from === from &&
          expected.to === to &&
          (expected.promotion === undefined ||
            expected.promotion === (promotion ?? '').toLowerCase());

        if (!isCorrect) {
          // Flash red on wrong square
          const flash: Record<string, { backgroundColor: string }> = {
            [from]: { backgroundColor: 'rgba(180,80,80,0.45)' },
            [to]: { backgroundColor: 'rgba(180,80,80,0.45)' },
          };
          set({
            wrongMoves: state.wrongMoves + 1,
            flashSquares: flash,
            status: 'failed',
          });
          setTimeout(() => {
            set({ flashSquares: {}, status: 'solving' });
          }, 700);
          return false;
        }

        // Apply player move
        try {
          chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined });
        } catch {
          return false;
        }

        const newFen = chess.fen();
        const nextIdx = solutionIdx + 1;

        // Flash green on correct move
        const flash: Record<string, { backgroundColor: string }> = {
          [from]: { backgroundColor: 'rgba(100,160,100,0.4)' },
          [to]: { backgroundColor: 'rgba(100,160,100,0.4)' },
        };

        // Check if puzzle is complete after player move
        if (nextIdx >= currentPuzzle.solution.length) {
          // Puzzle solved!
          const elapsed = Date.now() - state.startTime;
          const resultVal =
            state.wrongMoves === 0 && state.hintsUsed === 0
              ? 1.0
              : state.wrongMoves === 0
                ? 0.7
                : 0.5;
          const resultLabel: 'win' | 'partial' = resultVal >= 0.9 ? 'win' : 'partial';
          const ratingChange = calculateRatingChange(
            state.rating,
            currentPuzzle.rating,
            resultVal
          );
          const newRating = Math.max(100, state.rating + ratingChange);
          const entry: RatingEntry = {
            date: new Date().toISOString(),
            rating: newRating,
            puzzleId: currentPuzzle.id,
            result: resultLabel,
          };
          const updatedThemeStats = updateThemeStats(
            state.themeStats,
            currentPuzzle.themes,
            resultLabel,
            elapsed
          );
          set({
            fen: newFen,
            solutionIdx: nextIdx,
            flashSquares: flash,
            status: 'success',
            rating: newRating,
            ratingHistory: [...state.ratingHistory.slice(-99), entry],
            themeStats: updatedThemeStats,
            streak: state.streak + 1,
            totalSolved: state.totalSolved + 1,
            totalAttempted: state.totalAttempted + 1,
          });
          setTimeout(() => set({ flashSquares: {} }), 800);
          return true;
        }

        // Opponent's move (auto-play after 500ms)
        set({ fen: newFen, solutionIdx: nextIdx, flashSquares: flash, hintSquare: null });

        setTimeout(() => {
          const s = get();
          const { currentPuzzle: cp, chess: ch } = s;
          if (!cp || !ch) return;

          const opponentUci = cp.solution[nextIdx];
          const opponentMove = uciToMove(opponentUci);
          try {
            ch.move({
              from: opponentMove.from,
              to: opponentMove.to,
              promotion: opponentMove.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
            });
          } catch {
            return;
          }

          const afterOpponentFen = ch.fen();
          const afterOpponentIdx = nextIdx + 1;

          if (afterOpponentIdx >= cp.solution.length) {
            // Edge case: puzzle ended on opponent's move (shouldn't happen normally)
            set({ fen: afterOpponentFen, solutionIdx: afterOpponentIdx, flashSquares: {} });
          } else {
            set({
              fen: afterOpponentFen,
              solutionIdx: afterOpponentIdx,
              flashSquares: {},
              hintSquare: null,
            });
          }
        }, 500);

        return true;
      },

      useHint: () => {
        const state = get();
        const { currentPuzzle, solutionIdx, status } = state;
        if (!currentPuzzle || status !== 'solving') return null;
        const move = uciToMove(currentPuzzle.solution[solutionIdx]);
        set({ hintsUsed: state.hintsUsed + 1, hintSquare: move.to });
        return move.to;
      },

      analyzeCurrentPosition: async () => {
        const { fen, status } = get();
        if (status === 'loading') return;
        set({ status: 'analyzing' });
        try {
          const evalResult = await fetchCloudEval(fen, 3);
          set({ lastEval: evalResult, status: get().status === 'analyzing' ? 'solving' : get().status });
        } catch {
          set({ lastEval: null });
        }
      },

      nextPuzzle: async () => {
        set({
          currentPuzzle: null,
          chess: null,
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          status: 'idle',
          solutionIdx: 0,
          wrongMoves: 0,
          hintsUsed: 0,
          startTime: 0,
          lastEval: null,
          flashSquares: {},
          hintSquare: null,
        });
        await get().loadPuzzle();
      },

      setTheme: (theme: string | null) => {
        set({ selectedTheme: theme });
      },

      setView: (view: View) => {
        set({ view });
      },
    }),
    {
      name: 'puzzledog',
      partialize: (state) => ({
        rating: state.rating,
        ratingHistory: state.ratingHistory,
        themeStats: state.themeStats,
        streak: state.streak,
        totalSolved: state.totalSolved,
        totalAttempted: state.totalAttempted,
      }),
    }
  )
);
