import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProcessedPuzzle, ThemeStat, RatingEntry, CloudEval, PuzzleStatus, View } from '../types';
import { fetchPuzzle, fetchCloudEval } from '../services/lichess';
import { processPuzzle, uciToMove } from '../utils/chess';
import { calculateRatingChange } from '../utils/rating';
import { storePuzzle, getLocalPuzzle, seedFromBundle, countPuzzles } from '../services/puzzleDb';
import { Chess } from 'chess.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersistedState {
  rating: number;
  ratingHistory: RatingEntry[];
  themeStats: Record<string, ThemeStat>;
  streak: number;
  totalSolved: number;
  totalAttempted: number;
  /** Rolling list of recently-seen puzzle IDs — avoids immediate repeats offline. */
  seenIds: string[];
  boardLightColor: string;
  boardDarkColor: string;
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
  offlinePuzzleCount: number;
  isOffline: boolean;
  gaveUp: boolean;
}

interface AppActions {
  initDb: () => Promise<void>;
  loadPuzzle: () => Promise<void>;
  tryMove: (from: string, to: string, promotion?: string) => boolean;
  useHint: () => string | null;
  solvePuzzle: () => Promise<void>;
  analyzeCurrentPosition: () => Promise<void>;
  nextPuzzle: () => Promise<void>;
  setTheme: (theme: string | null) => void;
  setView: (view: View) => void;
  setBoardColors: (light: string, dark: string) => void;
}

type AppState = PersistedState & SessionState & AppActions;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeakTheme(themeStats: Record<string, ThemeStat>): string | null {
  const entries = Object.entries(themeStats).filter(([, s]) => s.attempts > 0);
  if (!entries.length) return null;
  return entries.reduce((worst, cur) =>
    cur[1].solved / cur[1].attempts < worst[1].solved / worst[1].attempts ? cur : worst
  )[0];
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
    const solved = result !== 'loss' ? prev.solved + 1 : prev.solved;
    const failed = result === 'loss' ? prev.failed + 1 : prev.failed;
    const avgTime = prev.attempts === 0
      ? elapsedMs
      : Math.round((prev.avgTime * prev.attempts + elapsedMs) / newAttempts);
    updated[theme] = { attempts: newAttempts, solved, failed, avgTime };
  }
  return updated;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const defaultSession: SessionState = {
  currentPuzzle: null,
  chess: null,
  fen: INITIAL_FEN,
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
  offlinePuzzleCount: 0,
  isOffline: false,
  gaveUp: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Persisted
      rating: 1200,
      ratingHistory: [],
      themeStats: {},
      streak: 0,
      totalSolved: 0,
      totalAttempted: 0,
      seenIds: [],
      boardLightColor: '#e8e5de',
      boardDarkColor: '#272523',

      // Session
      ...defaultSession,

      // ── Actions ──────────────────────────────────────────────────────────────

      /** Called once on mount: seed IndexedDB from bundle, update count. */
      initDb: async () => {
        await seedFromBundle();
        const count = await countPuzzles();
        set({ offlinePuzzleCount: count, isOffline: !navigator.onLine });

        // Keep isOffline in sync
        const go = () => set({ isOffline: !navigator.onLine });
        window.addEventListener('online', go);
        window.addEventListener('offline', go);
      },

      loadPuzzle: async () => {
        set({ status: 'loading', lastEval: null, hintSquare: null });

        let theme = get().selectedTheme;
        if (theme === 'weak') theme = getWeakTheme(get().themeStats);

        let processed: ProcessedPuzzle | null = null;

        // ── Online: try Lichess API first ──────────────────────────────────
        if (navigator.onLine) {
          try {
            const raw = await fetchPuzzle(theme ?? undefined);
            processed = processPuzzle(raw);
            // Save in background so it's available offline later
            storePuzzle(processed)
              .then(() => countPuzzles().then(n => set({ offlinePuzzleCount: n })))
              .catch(() => {});
          } catch {
            // API failed even though nominally online — fall through to local
          }
        }

        // ── Offline / API failure: serve from IndexedDB ────────────────────
        if (!processed) {
          const exclude = new Set(get().seenIds.slice(-200));
          processed = await getLocalPuzzle(theme, exclude).catch(() => null);
        }

        if (!processed) {
          console.error('No puzzle available (offline and empty cache)');
          set({ status: 'idle', isOffline: true });
          return;
        }

        // Track seen to avoid immediate repeats when offline
        set(s => ({ seenIds: [...s.seenIds.slice(-299), processed!.id] }));

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
      },

      tryMove: (from, to, promotion) => {
        const state = get();
        const { currentPuzzle, chess, solutionIdx, status } = state;
        if (!currentPuzzle || !chess || status !== 'solving') return false;

        const expected = uciToMove(currentPuzzle.solution[solutionIdx]);
        const isCorrect =
          expected.from === from &&
          expected.to === to &&
          (expected.promotion === undefined ||
            expected.promotion === (promotion ?? '').toLowerCase());

        if (!isCorrect) {
          const flash = {
            [from]: { backgroundColor: 'rgba(180,80,80,0.45)' },
            [to]:   { backgroundColor: 'rgba(180,80,80,0.45)' },
          };
          set({ wrongMoves: state.wrongMoves + 1, flashSquares: flash, status: 'failed' });
          setTimeout(() => set({ flashSquares: {}, status: 'solving' }), 700);
          return false;
        }

        try {
          chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined });
        } catch {
          return false;
        }

        const newFen = chess.fen();
        const nextIdx = solutionIdx + 1;
        const flash = {
          [from]: { backgroundColor: 'rgba(100,160,100,0.4)' },
          [to]:   { backgroundColor: 'rgba(100,160,100,0.4)' },
        };

        if (nextIdx >= currentPuzzle.solution.length) {
          const elapsed = Date.now() - state.startTime;
          const resultVal = state.wrongMoves === 0 && state.hintsUsed === 0 ? 1.0
            : state.wrongMoves === 0 ? 0.7 : 0.5;
          const resultLabel: 'win' | 'partial' = resultVal >= 0.9 ? 'win' : 'partial';
          const ratingChange = calculateRatingChange(state.rating, currentPuzzle.rating, resultVal);
          const newRating = Math.max(100, state.rating + ratingChange);
          set({
            fen: newFen,
            solutionIdx: nextIdx,
            flashSquares: flash,
            status: 'success',
            rating: newRating,
            ratingHistory: [...state.ratingHistory.slice(-99), {
              date: new Date().toISOString(),
              rating: newRating,
              puzzleId: currentPuzzle.id,
              result: resultLabel,
            }],
            themeStats: updateThemeStats(state.themeStats, currentPuzzle.themes, resultLabel, elapsed),
            streak: state.streak + 1,
            totalSolved: state.totalSolved + 1,
            totalAttempted: state.totalAttempted + 1,
          });
          setTimeout(() => set({ flashSquares: {} }), 800);
          return true;
        }

        set({ fen: newFen, solutionIdx: nextIdx, flashSquares: flash, hintSquare: null });

        setTimeout(() => {
          const s = get();
          const { currentPuzzle: cp, chess: ch } = s;
          if (!cp || !ch) return;
          const opp = uciToMove(cp.solution[nextIdx]);
          try {
            ch.move({ from: opp.from, to: opp.to, promotion: opp.promotion as 'q' | 'r' | 'b' | 'n' | undefined });
          } catch { return; }
          set({
            fen: ch.fen(),
            solutionIdx: nextIdx + 1,
            flashSquares: {},
            hintSquare: null,
          });
        }, 500);

        return true;
      },

      useHint: () => {
        const { currentPuzzle, solutionIdx, status, hintsUsed } = get();
        if (!currentPuzzle || status !== 'solving') return null;
        const move = uciToMove(currentPuzzle.solution[solutionIdx]);
        // Highlight the FROM square (the piece to pick up)
        set({ hintsUsed: hintsUsed + 1, hintSquare: move.from });
        return move.from;
      },

      solvePuzzle: async () => {
        const state = get();
        const { currentPuzzle, chess, solutionIdx, status } = state;
        if (!currentPuzzle || !chess || status !== 'solving') return;

        // Disable the board during playback
        set({ status: 'loading', hintSquare: null });

        const elapsed = Date.now() - state.startTime;
        const remaining = currentPuzzle.solution.slice(solutionIdx);

        // Play each remaining move with a short delay so the player can follow
        for (let i = 0; i < remaining.length; i++) {
          await new Promise<void>(r => setTimeout(r, i === 0 ? 400 : 750));
          const move = uciToMove(remaining[i]);
          try {
            chess.move({ from: move.from, to: move.to, promotion: move.promotion as 'q' | 'r' | 'b' | 'n' | undefined });
          } catch { break; }
          const flash = {
            [move.from]: { backgroundColor: 'rgba(226,223,216,0.18)' },
            [move.to]:   { backgroundColor: 'rgba(226,223,216,0.32)' },
          };
          set({ fen: chess.fen(), flashSquares: flash });
          await new Promise<void>(r => setTimeout(r, 350));
          set({ flashSquares: {} });
        }

        // Count as a loss — reset streak, apply rating penalty
        const ratingChange = calculateRatingChange(state.rating, currentPuzzle.rating, 0);
        const newRating = Math.max(100, state.rating + ratingChange);
        set({
          solutionIdx: currentPuzzle.solution.length,
          status: 'success',
          gaveUp: true,
          rating: newRating,
          ratingHistory: [...state.ratingHistory.slice(-99), {
            date: new Date().toISOString(),
            rating: newRating,
            puzzleId: currentPuzzle.id,
            result: 'loss',
          }],
          themeStats: updateThemeStats(state.themeStats, currentPuzzle.themes, 'loss', elapsed),
          streak: 0,
          totalAttempted: state.totalAttempted + 1,
          flashSquares: {},
        });
      },

      analyzeCurrentPosition: async () => {
        const { fen, status } = get();
        if (status === 'loading') return;
        const prevStatus = status;
        set({ status: 'analyzing' });
        try {
          const evalResult = await fetchCloudEval(fen, 3);
          set({ lastEval: evalResult, status: prevStatus });
        } catch {
          set({ lastEval: null, status: prevStatus });
        }
      },

      nextPuzzle: async () => {
        set({ ...defaultSession, offlinePuzzleCount: get().offlinePuzzleCount, isOffline: get().isOffline });
        await get().loadPuzzle();
      },

      setTheme: theme => set({ selectedTheme: theme }),
      setView:  view  => set({ view }),
      setBoardColors: (light, dark) => set({ boardLightColor: light, boardDarkColor: dark }),
    }),
    {
      name: 'puzzledog',
      partialize: state => ({
        rating:          state.rating,
        ratingHistory:   state.ratingHistory,
        themeStats:      state.themeStats,
        streak:          state.streak,
        totalSolved:     state.totalSolved,
        totalAttempted:  state.totalAttempted,
        seenIds:         state.seenIds,
        boardLightColor: state.boardLightColor,
        boardDarkColor:  state.boardDarkColor,
      }),
    }
  )
);
