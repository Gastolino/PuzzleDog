const K = 32;

export function expectedScore(playerRating: number, puzzleRating: number): number {
  return 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
}

export function calculateRatingChange(
  playerRating: number,
  puzzleRating: number,
  result: number // 1 = win, 0.5 = partial, 0 = loss
): number {
  const expected = expectedScore(playerRating, puzzleRating);
  return Math.round(K * (result - expected));
}

export function getPerformanceLabel(successRate: number): { label: string; color: string } {
  if (successRate >= 0.8) return { label: 'Strong', color: 'text-green-400' };
  if (successRate >= 0.6) return { label: 'Good', color: 'text-blue-400' };
  if (successRate >= 0.4) return { label: 'Needs Work', color: 'text-yellow-400' };
  return { label: 'Weak', color: 'text-red-400' };
}
