/**
 * Feature 035 Phase 7 (T046–T049) — pure vertical-band and caption decisions
 * for the three dense-state primary scenes remediated after owner QA
 * (owner-qa-findings-2026-08-17.md). These functions encode a reserved-region
 * layout so no consequential text/control overlaps, are display-only, and are
 * consumed both by the Phaser scenes and by their production-path regression
 * tests (T049). They never derive simulation/economy/tier state.
 */

/** Logical landscape canvas height used by every primary scene. */
export const LAYOUT_HEIGHT = 450;

/** A reserved vertical region of the logical canvas. */
export interface VerticalBand {
  id: string;
  top: number;
  bottom: number;
}

/** Two bands overlap if their interiors share any vertical pixel (touching edges are allowed). */
export function bandsOverlap(a: VerticalBand, b: VerticalBand): boolean {
  return a.bottom > b.top && b.bottom > a.top;
}

/**
 * Validates a set of bands: each non-empty, each inside the logical canvas, and
 * no two bands overlap. Returns the offending pairs when invalid.
 */
export function validateBands(
  bands: readonly VerticalBand[],
  height = LAYOUT_HEIGHT,
): { kind: "valid" } | { kind: "invalid"; overlaps: string[] } {
  const overlaps: string[] = [];
  for (const band of bands) {
    if (band.top < 0 || band.bottom > height) {
      overlaps.push(`${band.id} escapes canvas (${band.top}..${band.bottom})`);
    }
    if (band.bottom <= band.top) overlaps.push(`${band.id} is empty`);
  }
  for (let i = 0; i < bands.length; i += 1) {
    for (let j = i + 1; j < bands.length; j += 1) {
      if (bandsOverlap(bands[i], bands[j])) {
        overlaps.push(`${bands[i].id}↔${bands[j].id} overlap`);
      }
    }
  }
  return overlaps.length ? { kind: "invalid", overlaps } : { kind: "valid" };
}

// --- PreRaceScene (T046) -----------------------------------------------------

/** The right-side stats panel is anchored at LOGICAL_WIDTH-130 (see renderStats). */
export const PRERACE_STAT_PANEL_LEFT = 550;

/**
 * Bound the single circuit/location identity caption to the empty centre column
 * so a long track/region line never runs into the left track summary or the
 * right CAR · CURRENT → PROSPECTIVE panel (UI-035-01).
 */
export interface PreRaceCaptionMetrics {
  x: number;
  y: number;
  width: number;
  maxFontSize: number;
  maxLines: number;
}

export function preRaceCaptionMetrics(textLength: number): PreRaceCaptionMetrics {
  return {
    x: 370,
    y: 51,
    // 260px centred on x=370 spans 240..500 — clear of the left summary (~210)
    // and the stats panel (550).
    width: 260,
    maxFontSize: textLength > 48 ? 9 : 11,
    maxLines: 2,
  };
}

/** Bounded display for a canonical stat point: never raw floating-point noise (UI-035-01). */
export function formatStatPoint(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// --- PrepareScene (T047) -----------------------------------------------------

export const PREPARE_BOARD_Y = 350;
export const PREPARE_SLOT_HEIGHT = 52;
/** Storage heading sits between the installed-row bottom and the storage row. */
export const PREPARE_STORAGE_Y = 420;
export const PREPARE_STORAGE_HEADING_Y = 382;

/**
 * Reserved bottom strip of an offer/Supplier card so the non-color state chips
 * (⬆ UPGRADE / UNAVAILABLE / "+ N MORE · PIN FOR DETAILS") never cover the item
 * rule/effect lines (UI-035-02). Effect text is constrained above this strip.
 */
export const OFFER_CARD_BOTTOM_RESERVE = 24;

/**
 * How many effect lines fit above the reserved bottom state-chip strip on an
 * offer card. Returns a bounded count (>= 1) never exceeding the nominal
 * `effectLinesVisible` decision. Pure and testable (T047/T049).
 */
export function offerCardEffectLineFit(input: {
  height: number;
  effectLinesVisible: number;
  effectsStartY: number;
  lineHeight: number;
}): number {
  const effectAreaBottom = input.height / 2 - OFFER_CARD_BOTTOM_RESERVE;
  const fit = Math.max(1, Math.floor((effectAreaBottom - input.effectsStartY) / input.lineHeight));
  return Math.min(input.effectLinesVisible, fit);
}

/**
 * The reserved vertical bands for the Supplier/acquisition dense state. The
 * installed row (board) and the storage row own independent measured bands, and
 * the storage heading occupies the deliberate gap between them (UI-035-02).
 */
export function prepareDenseBands(receiptVisible = false): readonly VerticalBand[] {
  const bands: VerticalBand[] = [
    { id: "title", top: 28, bottom: 62 },
    { id: "offer-row", top: 66, bottom: 190 },
    { id: "controls", top: 190, bottom: 212 },
  ];
  if (receiptVisible) bands.push({ id: "receipt", top: 230, bottom: 292 });
  bands.push(
    { id: "board-heading", top: 294, bottom: 312 },
    { id: "board", top: 314, bottom: 376 },
    { id: "storage-heading", top: 378, bottom: 392 },
    { id: "storage", top: 396, bottom: 448 },
  );
  return bands;
}

// --- ContestScene (T048) -----------------------------------------------------

/**
 * Exclusive safe regions for the Contest HUD (UI-035-03). Identity and status
 * own distinct top bands; the lower HUD band is reserved as a whole for the
 * lap-evidence / installed-build / playback-control sub-regions. Feature 035
 * owns the identity/status separation and the crowded lower-HUD guard; the
 * exact horizontal allocation of the three lower-HUD sub-regions is
 * coordinated with Feature 036 (T061) and must not be changed in isolation.
 * Display-only — no playback/result authority changes.
 */
export function contestSafeRegions(): readonly VerticalBand[] {
  return [
    { id: "identity", top: 14, bottom: 96 },
    { id: "status", top: 120, bottom: 160 },
    { id: "lower-hud", top: 316, bottom: 448 },
  ];
}

/** Longest acceptable single-line identity caption width for the Contest top band. */
export const CONTEST_IDENTITY_MAX_WIDTH = 300;