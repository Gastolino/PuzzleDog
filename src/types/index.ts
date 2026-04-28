export interface LichessPuzzle {
  game: {
    id: string;
    pgn: string;
    players: Array<{ user: { name: string; id: string }; rating: number; color: string }>;
    clock?: string;
  };
  puzzle: {
    id: string;
    initialPly: number;
    rating: number;
    plays: number;
    solution: string[]; // UCI: "e2e4"
    themes: string[];
  };
}

export interface ProcessedPuzzle {
  id: string;
  fen: string; // starting FEN for the puzzle
  playerColor: 'w' | 'b';
  solution: string[]; // UCI moves
  themes: string[];
  rating: number;
}

export interface ThemeStat {
  attempts: number;
  solved: number;
  failed: number;
  avgTime: number; // ms
}

export interface RatingEntry {
  date: string; // ISO
  rating: number;
  puzzleId: string;
  result: 'win' | 'loss' | 'partial';
}

export interface CloudEval {
  fen: string;
  knodes: number;
  depth: number;
  pvs: Array<{
    moves: string;
    cp?: number;
    mate?: number;
  }>;
}

export type PuzzleStatus = 'idle' | 'loading' | 'solving' | 'success' | 'failed' | 'analyzing';
export type View = 'puzzle' | 'stats' | 'themes';
