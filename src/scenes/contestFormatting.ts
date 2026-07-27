export function leaderLabel(liveGap: number): string {
  const magnitude = Math.abs(liveGap).toFixed(1);
  if (liveGap === 0) {
    return "TIED · 0.0s";
  }

  return liveGap < 0
    ? `PLAYER LEADS · ${magnitude}s`
    : `GHOST LEADS · ${magnitude}s`;
}