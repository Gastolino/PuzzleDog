/**
 * IndexedDB wrapper for offline puzzle storage.
 * Stores ProcessedPuzzle objects so the app works without a network connection.
 */

import type { ProcessedPuzzle } from '../types';

const DB_NAME = 'puzzledog';
const DB_VERSION = 1;
const STORE = 'puzzles';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('rating', 'rating');
        store.createIndex('themes', 'themes', { multiEntry: true });
      }
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = e => reject((e.target as IDBOpenDBRequest).error);
  });
}

function txPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Insert or update a batch of puzzles. */
export async function storePuzzles(puzzles: ProcessedPuzzle[]): Promise<void> {
  if (!puzzles.length) return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const p of puzzles) store.put(p);
  return txPromise(tx);
}

/** Insert a single puzzle (no-op if already stored). */
export async function storePuzzle(puzzle: ProcessedPuzzle): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(puzzle);
  return txPromise(tx);
}

/** Total number of puzzles in the local store. */
export async function countPuzzles(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Pull a random puzzle from local storage.
 * Optionally filter by theme (or omit for any theme).
 * Excludes any puzzle IDs in `exclude`.
 */
export async function getLocalPuzzle(
  theme?: string | null,
  exclude: Set<string> = new Set()
): Promise<ProcessedPuzzle | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);

    let req: IDBRequest<ProcessedPuzzle[]>;
    if (theme && theme !== 'all' && theme !== 'weak') {
      req = store.index('themes').getAll(theme) as IDBRequest<ProcessedPuzzle[]>;
    } else {
      req = store.getAll() as IDBRequest<ProcessedPuzzle[]>;
    }

    req.onsuccess = () => {
      const all: ProcessedPuzzle[] = req.result ?? [];
      const candidates = all.filter(p => !exclude.has(p.id));
      if (!candidates.length) {
        // If all are excluded (seen), pick from full set
        const fallback = all[Math.floor(Math.random() * all.length)] ?? null;
        resolve(fallback);
        return;
      }
      resolve(candidates[Math.floor(Math.random() * candidates.length)]);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load the bundled public/puzzles.json into IndexedDB on first run.
 * Skips if the store is already populated.
 */
export async function seedFromBundle(): Promise<number> {
  const count = await countPuzzles();
  if (count > 0) return count;

  try {
    const res = await fetch('/puzzles.json');
    if (!res.ok) return 0;
    const puzzles: ProcessedPuzzle[] = await res.json();
    if (!Array.isArray(puzzles) || puzzles.length === 0) return 0;
    await storePuzzles(puzzles);
    return puzzles.length;
  } catch {
    return 0;
  }
}
