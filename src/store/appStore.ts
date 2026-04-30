import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProcessedPuzzle, ThemeStat, RatingEntry, CloudEval, PuzzleStatus, View } from '../types';
import { fetchPuzzle, fetchCloudEval } from '../services/lichess';
import { processPuzzle, applyUci } from '../utils/chess';
import { calculateRatingChange } from '../utils/rating';
import { storePuzzle, getLocalPuzzle, seedFromBundle, countPuzzles } from '../services/puzzleDb';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersistedState {
  rating:         number;
  ratingHistory:  RatingEntry[];
  themeStats:     Record<string, ThemeStat>;
  streak:         number;
  totalSolved:    number;
  totalAttempted: number;
  seenIds:        string[];
  boardLightColor: string;
  boardDarkColor:  string;
}

interface SessionState {
  currentPuzzle:    ProcessedPuzzle | null;
  fen:              string;
  status:           PuzzleStatus;
  moveIndex:        number;   // index into solution[]; player moves at even indices
  wrongMoves:       number;
  hintsUsed:        number;
  startTime:        number;
  lastEval:         CloudEval | null;
  selectedTheme:    string | null;
  view:             View;
  flashSquares:     Record<string, { backgroundColor: string }>;
  hintSquare:       string | null;
  offlinePuzzleCount: number;
  isOffline:        boolean;
  gaveUp:           boolean;
  waitingForOpponent: boolean;
}

interface AppActions {
  initDb:                 () => Promise<void>;
  loadPuzzle:             () => Promise<void>;
  tryMove:                (from: string, to: string, promotion?: string) => boolean;
  useHint:                () => string | null;
  solvePuzzle:            () => Promise<void>;
  analyzeCurrentPosition: () => Promise<void>;
  nextPuzzle:             () => Promise<void>;
  setTheme:               (theme: string | null) => void;
  setView:                (view: View) => void;
  setBoardColors:         (light: string, dark: string) => void;
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
    const prev       = updated[theme] ?? defaultThemeStat();
    const newAttempts = prev.attempts + 1;
    const solved     = result !== 'loss' ? prev.solved + 1 : prev.solved;
    const failed     = result === 'loss' ? prev.failed + 1 : prev.failed;
    const avgTime    = prev.attempts === 0
      ? elapsedMs
      : Math.round((prev.avgTime * prev.attempts + elapsedMs) / newAttempts);
    updated[theme] = { attempts: newAttempts, solved, failed, avgTime };
  }
  return updated;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const defaultSession: SessionState = {
  currentPuzzle:      null,
  fen:                INITIAL_FEN,
  status:             'idle',
  moveIndex:          0,
  wrongMoves:         0,
  hintsUsed:          0,
  startTime:          0,
  lastEval:           null,
  selectedTheme:      null,
  view:               'puzzle',
  flashSquares:       {},
  hintSquare:         null,
  offlinePuzzleCount: 0,
  isOffline:          false,
  gaveUp:             false,
  waitingForOpponent: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Persisted defaults
      rating:          1200,
      ratingHistory:   [],
      themeStats:      {},
      streak:          0,
      totalSolved:     0,
      totalAttempted:  0,
      seenIds:         [],
      boardLightColor: '#e8e5de',
      boardDarkColor:  '#272523',

      // Session defaults
      ...defaultSession,

      // ── Actions ────────────────────────────────────────────────────────────

      initDb: async () => {
        await seedFromBundle();
        const count = await countPuzzles();
        set({ offlinePuzzleCount: count, isOffline: !navigator.onLine });
        const sync = () => set({ isOffline: !navigator.onLine });
        window.addEventListener('online',  sync);
        window.addEventListener('offline', sync);
      },

      loadPuzzle: async () => {
        set({ status: 'loading', lastEval: null, hintSquare: null });

        let theme = get().selectedTheme;
        if (theme === 'weak') theme = getWeakTheme(get().themeStats);

        let processed: ProcessedPuzzle | null = null;

        if (navigator.onLine) {
          try {
            const raw = await fetchPuzzle(theme ?? undefined);
            processed = processPuzzle(raw);
            storePuzzle(processed)
              .then(() => countPuzzles().then(n => set({ offlinePuzzleCount: n })))
              .catch(() => {});
          } catch { /* fall through to local cache */ }
        }

        if (!processed) {
          const exclude = new Set(get().seenIds.slice(-200));
          processed = await getLocalPuzzle(theme, exclude).catch(() => null);
        }

        if (!processed) {
          set({ status: 'idle', isOffline: true });
          return;
        }

        set(s => ({ seenIds: [...s.seenIds.slice(-299), processed!.id] }));

        set({
          currentPuzzle: processed,
          fen:           processed.fen,
          status:        'solving',
          moveIndex:     0,
          wrongMoves:    0,
          hintsUsed:     0,
          startTime:     Date.now(),
          flashSquares:  {},
          hintSquare:    null,
          gaveUp:        false,
          waitingForOpponent: false,
        });
      },

      tryMove: (from, to, promotion) => {
        const state = get();
        const { currentPuzzle, fen, moveIndex, status, waitingForOpponent } = state;
        if (!currentPuzzle || status !== 'solving' || waitingForOpponent) return false;

        // Build the UCI string the player just attempted
        const playerUci = from + to + (promotion ?? '');
        const expected  = currentPuzzle.solution[moveIndex];

        if (playerUci !== expected) {
          // Wrong move — flash red, count the error
          set({
            wrongMoves:  state.wrongMoves + 1,
            flashSquares: {
              [from]: { backgroundColor: 'rgba(180,80,80,0.45)' },
              [to]:   { backgroundColor: 'rgba(180,80,80,0.45)' },
            },
            status: 'failed',
          });
          setTimeout(() => set({ flashSquares: {}, status: 'solving' }), 700);
          return false;
        }

        // Correct — apply the move via chessops (pure, no mutation)
        const newFen   = applyUci(fen, expected);
        const nextIdx  = moveIndex + 1;
        const flash    = {
          [from]: { backgroundColor: 'rgba(100,160,100,0.4)' },
          [to]:   { backgroundColor: 'rgba(100,160,100,0.4)' },
        };

        // Puzzle complete?
        if (nextIdx >= currentPuzzle.solution.length) {
          const elapsed     = Date.now() - state.startTime;
          const resultVal   = state.wrongMoves === 0 && state.hintsUsed === 0 ? 1.0
                            : state.wrongMoves === 0 ? 0.7 : 0.5;
          const resultLabel: 'win' | 'partial' = resultVal >= 0.9 ? 'win' : 'partial';
          const ratingChange = calculateRatingChange(state.rating, currentPuzzle.rating, resultVal);
          const newRating    = Math.max(100, state.rating + ratingChange);

          set({
            fen:          newFen,
            moveIndex:    nextIdx,
            flashSquares: flash,
            status:       'success',
            rating:       newRating,
            ratingHistory: [...state.ratingHistory.slice(-99), {
              date:     new Date().toISOString(),
              rating:   newRating,
              puzzleId: currentPuzzle.id,
              result:   resultLabel,
            }],
            themeStats:     updateThemeStats(state.themeStats, currentPuzzle.themes, resultLabel, elapsed),
            streak:         state.streak + 1,
            totalSolved:    state.totalSolved + 1,
            totalAttempted: state.totalAttempted + 1,
          });
          setTimeout(() => set({ flashSquares: {} }), 800);
          return true;
        }

        // Lock board while the opponent's response auto-plays
        set({ fen: newFen, moveIndex: nextIdx, flashSquares: flash, hintSquare: null, waitingForOpponent: true });

        setTimeout(() => {
          const s = get();
          if (!s.currentPuzzle) return;
          const oppUci = s.currentPuzzle.solution[nextIdx];
          const oppFen = applyUci(s.fen, oppUci);
          set({
            fen:                oppFen,
            moveIndex:          nextIdx + 1,
            flashSquares:       {},
            hintSquare:         null,
            waitingForOpponent: false,
          });
        }, 500);

        return true;
      },

      useHint: () => {
        const { currentPuzzle, moveIndex, status, hintsUsed } = get();
        if (!currentPuzzle || status !== 'solving') return null;
        // The FROM square is the first two chars of the UCI string
        const fromSq = currentPuzzle.solution[moveIndex]?.slice(0, 2) ?? null;
        if (!fromSq) return null;
        set({ hintsUsed: hintsUsed + 1, hintSquare: fromSq });
        return fromSq;
      },

      solvePuzzle: async () => {
        const state = get();
        const { currentPuzzle, fen: startFen, moveIndex, status } = state;
        if (!currentPuzzle || status !== 'solving') return;

        // Lock board and immediately mark as gave-up so the overlay shows
        set({ status: 'loading', hintSquare: null, gaveUp: true });

        const elapsed   = Date.now() - state.startTime;
        const remaining = currentPuzzle.solution.slice(moveIndex);
        let   currentFen = startFen;

        for (let i = 0; i < remaining.length; i++) {
          await new Promise<void>(r => setTimeout(r, i === 0 ? 400 : 750));
          const uci  = remaining[i];
          currentFen = applyUci(currentFen, uci);
          set({
            fen: currentFen,
            flashSquares: {
              [uci.slice(0, 2)]: { backgroundColor: 'rgba(226,223,216,0.18)' },
              [uci.slice(2, 4)]: { backgroundColor: 'rgba(226,223,216,0.32)' },
            },
          });
          await new Promise<void>(r => setTimeout(r, 350));
          set({ flashSquares: {} });
        }

        const ratingChange = calculateRatingChange(state.rating, currentPuzzle.rating, 0);
        const newRating    = Math.max(100, state.rating + ratingChange);

        set({
          fen:          currentFen,
          moveIndex:    currentPuzzle.solution.length,
          status:       'success',
          gaveUp:       true,
          rating:       newRating,
          ratingHistory: [...state.ratingHistory.slice(-99), {
            date:     new Date().toISOString(),
            rating:   newRating,
            puzzleId: currentPuzzle.id,
            result:   'loss',
          }],
          themeStats:     updateThemeStats(state.themeStats, currentPuzzle.themes, 'loss', elapsed),
          streak:         0,
          totalAttempted: state.totalAttempted + 1,
          flashSquares:   {},
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
        const { offlinePuzzleCount, isOffline } = get();
        set({ ...defaultSession, offlinePuzzleCount, isOffline });
        await get().loadPuzzle();
      },

      setTheme:      theme => set({ selectedTheme: theme }),
      setView:       view  => set({ view }),
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
