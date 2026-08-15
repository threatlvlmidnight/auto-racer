export interface RaceBoardLayout {
  slotWidth: number;
  gap: number;
  totalWidth: number;
  startX: number;
  centers: readonly number[];
}
/** Fits every authored vehicle slot inside the fixed logical race viewport. */
export function raceBoardLayout(slotCount: number, logicalWidth = 800): RaceBoardLayout {
  const count = Math.max(1, Math.floor(slotCount));
  const margin = 24;
  const gap = count >= 4 ? 12 : 18;
  const available = logicalWidth - margin * 2;
  const slotWidth = Math.min(190, Math.floor((available - (count - 1) * gap) / count));
  const totalWidth = count * slotWidth + (count - 1) * gap;
  const startX = (logicalWidth - totalWidth) / 2 + slotWidth / 2;
  return {
    slotWidth,
    gap,
    totalWidth,
    startX,
    centers: Array.from({ length: count }, (_, index) => startX + index * (slotWidth + gap)),
  };
}
