/**
 * Feature 032 T011: semantic UI crop-region/state contract (032 data-model.md
 * "UIChromeRegion", contract §8). Named crop/nine-slice regions come from the
 * approved transparent master; runtime labels, icons, focus, enabled state,
 * and actions remain semantic code. Accessibility meaning lives in the
 * runtime control model, never the bitmap.
 *
 * The region registry starts EMPTY by design — T094 registers measured
 * source rectangles once region-metadata tests (T089/T090) exist.
 */

/** The approved transparent control master (validated by tests/unit/uiChrome.test.ts). */
export const UI_CHROME_MASTER_TEXTURE_KEY = "feature-032-controls-sheet";

export const UI_CHROME_MASTER_SIZE = Object.freeze({ width: 1672, height: 941 });

/** Semantic control families — styling is subordinate to item/build/race action. */
export type UIChromeFamily =
  | "primary"
  | "secondary"
  | "compact"
  | "danger"
  | "selector"
  | "focus"
  | "divider"
  | "glyph";

/** Semantic interaction states; color is never the sole state signal. */
export type UIChromeState = "normal" | "hover" | "focus" | "pressed" | "disabled";

export const UI_CHROME_STATES: readonly UIChromeState[] = [
  "normal",
  "hover",
  "focus",
  "pressed",
  "disabled",
];

export interface SourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NineSliceMargins {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** One named crop region of the approved master (stable semantic key). */
export interface UIChromeRegion {
  key: string;
  family: UIChromeFamily;
  sourceRect: SourceRect;
  nineSliceMargins: NineSliceMargins;
}

/** Immutable registry of crop regions — built by withUIChromeRegion only. */
export interface UIChromeRegistry {
  readonly regions: readonly UIChromeRegion[];
}

/** The empty registry: no region exists until T094 measures the master. */
export const EMPTY_UI_CHROME_REGISTRY: UIChromeRegistry = Object.freeze({
  regions: Object.freeze([]),
});

/** In-bounds guard against the approved master (contract §8, T089). */
export function sourceRectInBounds(rect: SourceRect): boolean {
  return (
    Number.isInteger(rect.x) && Number.isInteger(rect.y)
    && Number.isInteger(rect.width) && Number.isInteger(rect.height)
    && rect.width > 0 && rect.height > 0
    && rect.x >= 0 && rect.y >= 0
    && rect.x + rect.width <= UI_CHROME_MASTER_SIZE.width
    && rect.y + rect.height <= UI_CHROME_MASTER_SIZE.height
  );
}

/** Pure nine-slice sanity: margins must fit inside the source rectangle. */
export function nineSliceMarginsValid(region: UIChromeRegion): boolean {
  const { nineSliceMargins: margins, sourceRect } = region;
  return (
    margins.left >= 0 && margins.top >= 0 && margins.right >= 0 && margins.bottom >= 0
    && margins.left + margins.right <= sourceRect.width
    && margins.top + margins.bottom <= sourceRect.height
  );
}

/**
 * Returns a new registry with `region` added. Stable keys are unique —
 * re-registering an existing key throws rather than silently shadowing.
 */
export function withUIChromeRegion(
  registry: UIChromeRegistry,
  region: UIChromeRegion,
): UIChromeRegistry {
  if (registry.regions.some((existing) => existing.key === region.key)) {
    throw new Error(`UI chrome region key already registered: ${region.key}`);
  }
  if (!sourceRectInBounds(region.sourceRect)) {
    throw new Error(`UI chrome region ${region.key} falls outside the approved master`);
  }
  if (!nineSliceMarginsValid(region)) {
    throw new Error(`UI chrome region ${region.key} has invalid nine-slice margins`);
  }
  return { regions: [...registry.regions, region] };
}

export function uiChromeRegionByKey(
  registry: UIChromeRegistry,
  key: string,
): UIChromeRegion | null {
  return registry.regions.find((region) => region.key === key) ?? null;
}
