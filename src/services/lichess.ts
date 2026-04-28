import type { LichessPuzzle, CloudEval } from '../types';

const BASE = 'https://lichess.org';

export async function fetchPuzzle(theme?: string): Promise<LichessPuzzle> {
  const url =
    theme && theme !== 'all'
      ? `${BASE}/api/puzzle/next?angle=${theme}`
      : `${BASE}/api/puzzle/next`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lichess puzzle fetch failed: ${res.status}`);
  return res.json() as Promise<LichessPuzzle>;
}

export async function fetchCloudEval(fen: string, multiPv = 2): Promise<CloudEval | null> {
  try {
    const params = new URLSearchParams({ fen, multiPv: String(multiPv) });
    const res = await fetch(`${BASE}/api/cloud-eval?${params}`);
    if (!res.ok) return null;
    return res.json() as Promise<CloudEval>;
  } catch {
    return null;
  }
}
