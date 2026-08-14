export interface TrackFitChartLayout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  radius: number;
  barWidth: number;
}

/** Phaser-free geometry contract for the compact Results chart. */
export function trackFitChartLayout(width: number, height: number): TrackFitChartLayout {
  return {
    width,
    height,
    centerX: width / 2,
    centerY: Math.min(90, height * 0.42),
    radius: Math.min(55, width * 0.18, height * 0.27),
    barWidth: Math.max(54, (width - 34) / 2),
  };
}
