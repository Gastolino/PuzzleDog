/**
 * Fetches ~500 chess puzzles from the Lichess API across themes and difficulty
 * levels, pre-processes each one (extracts FEN from PGN), then saves the
 * result to public/puzzles.json for offline use.
 *
 * Usage: node scripts/prefetch-puzzles.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'puzzles.json');

const THEMES = [
  'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck',
  'mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'smotheredMate',
  'sacrifice', 'quietMove', 'trappedPiece', 'xRayAttack', 'clearance',
  'rookEndgame', 'pawnEndgame', 'advancedPawn', 'zugzwang', 'defensiveMove',
];

// Omit 'easiest' — too far below 1200; focus on the 1200-2400 band
const DIFFICULTIES = ['easier', 'normal', 'harder', 'hardest'];

// 20 themes × 4 difficulties × ~7 each = ~560 calls → ~400 unique after dedup
const PER_COMBO = 7;
const CONCURRENCY = 4;
const MIN_RATING = 1150;
const MAX_RATING = 2450;

function processPuzzle(raw) {
  try {
    const chess = new Chess();
    chess.loadPgn(raw.game.pgn);
    const history = chess.history({ verbose: true });
    const board = new Chess();
    for (let i = 0; i < raw.puzzle.initialPly && i < history.length; i++) {
      board.move(history[i]);
    }
    return {
      id:          raw.puzzle.id,
      fen:         board.fen(),
      playerColor: board.turn(),
      solution:    raw.puzzle.solution,
      themes:      raw.puzzle.themes,
      rating:      raw.puzzle.rating,
    };
  } catch {
    return null;
  }
}

async function fetchOne(theme, difficulty) {
  const url = `https://lichess.org/api/puzzle/next?angle=${theme}&difficulty=${difficulty}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const raw = await res.json();
    return processPuzzle(raw);
  } catch {
    return null;
  }
}

async function runConcurrent(tasks, concurrency) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const settled = await Promise.all(batch.map(fn => fn()));
    results.push(...settled);
    process.stdout.write(`\r  ${Math.min(i + concurrency, tasks.length)}/${tasks.length} requests`);
  }
  console.log();
  return results;
}

async function main() {
  console.log('Fetching puzzles from Lichess (this takes ~60s)...\n');

  const tasks = [];
  for (const theme of THEMES) {
    for (const diff of DIFFICULTIES) {
      for (let n = 0; n < PER_COMBO; n++) {
        tasks.push(() => fetchOne(theme, diff));
      }
    }
  }

  // Shuffle so we get theme variety even if we hit errors mid-way
  tasks.sort(() => Math.random() - 0.5);

  const raw = await runConcurrent(tasks, CONCURRENCY);

  // Deduplicate by id and filter to target rating band
  const seen = new Set();
  const puzzles = [];
  for (const p of raw) {
    if (!p || seen.has(p.id)) continue;
    if (p.rating < MIN_RATING || p.rating > MAX_RATING) continue;
    seen.add(p.id);
    puzzles.push(p);
  }

  // Sort by rating so the app can slice by difficulty easily
  puzzles.sort((a, b) => a.rating - b.rating);

  mkdirSync(join(__dirname, '..', 'public'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(puzzles));

  const ratings = puzzles.map(p => p.rating);
  console.log(`\nSaved ${puzzles.length} unique puzzles to public/puzzles.json`);
  console.log(`Rating range: ${Math.min(...ratings)} – ${Math.max(...ratings)}`);

  // Theme breakdown
  const themeCounts = {};
  for (const p of puzzles) {
    for (const t of p.themes) {
      themeCounts[t] = (themeCounts[t] ?? 0) + 1;
    }
  }
  const top = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('\nTop themes:');
  for (const [t, c] of top) console.log(`  ${t}: ${c}`);
}

main().catch(err => { console.error(err); process.exit(1); });
