import {
  PLAYBACK_SPEEDS,
  type PlaybackSpeed,
} from "../simulation/playback";

/** Canonical logical canvas dimensions (mirror src/scenes/layout.ts). */
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 450;

/**
 * 030-race-playback-controls (T036): the pure, framework-free presentation
 * model for the two speed controls. Both watched-race scenes render from this
 * so exactly two controls with exactly one selected marker exist everywhere
 * (data-model "PlaybackControlModel", contract §6), independent of color.
 *
 * The model is pure data — no Phaser dependency — so unit tests (T032/T035)
 * and the message-lifecycle suite (T025) cover it without a harness.
 */

export interface PlaybackControlModel {
  readonly speed: PlaybackSpeed;
  /** Visible glyph: "1×" or "2×" (data-model "visible label"). */
  readonly label: string;
  /** Keyboard shortcut glyph: "1" or "2" (contract §6). */
  readonly shortcut: string;
  /** True when this control reflects the active speed. */
  readonly selected: boolean;
  /**
   * A persistent, non-color selected marker appended to the label so the
   * active control is readable without color (contract §6, FR-026). The
   * marker is a leading "▶" glyph; unselected controls show a "·" stub so
   * the row width is stable.
   */
  readonly selectedMarker: "▶" | "·";
  /** Stable authored order (0 = normal, 1 = fast). */
  readonly order: number;
}

export interface PlaybackControlPlan {
  /** Exactly two controls in stable authored order (data-model, contract §2). */
  readonly controls: readonly PlaybackControlModel[];
  /** The single selected control during active playback (null when inactive). */
  readonly selectedControl: PlaybackControlModel | null;
}

/**
 * Builds the two-control plan for the given active speed. When `active` is
 * false (race finished/inactive) no control is marked selected (contract §6
 * "exactly one is selected during active playback"). Always returns exactly
 * two controls in stable `normal → fast` order, derived from `PLAYBACK_SPEEDS`
 * so the source of truth is one place.
 */
export function playbackControlPlan(
  activeSpeed: PlaybackSpeed,
  active = true,
): PlaybackControlPlan {
  const controls = PLAYBACK_SPEEDS.map((descriptor, order) => {
    const selected = active && descriptor.value === activeSpeed;
    return {
      speed: descriptor.value,
      label: descriptor.label,
      shortcut: descriptor.shortcut,
      selected,
      selectedMarker: selected ? ("▶" as const) : ("·" as const),
      order,
    };
  });
  return {
    controls,
    selectedControl: active ? controls.find((control) => control.selected) ?? null : null,
  };
}

/** Returns the control plan for a fresh race: two controls, `2×` selected. */
export function freshPlaybackControlPlan(): PlaybackControlPlan {
  return playbackControlPlan("fast", true);
}

/**
 * Re-derives the plan after a selection, marking the newly active speed. This
 * is the pure equivalent of the scene's idempotent `selectSpeed` call (T026/
 * T027): selection only changes the marker, never the control set.
 */
export function selectPlaybackControl(
  _plan: PlaybackControlPlan,
  speed: PlaybackSpeed,
): PlaybackControlPlan {
  return playbackControlPlan(speed, true);
}

/** Resolve the keyboard shortcut glyph to its speed (contract §6). */
export function playbackSpeedFromShortcut(key: string): PlaybackSpeed | null {
  const match = PLAYBACK_SPEEDS.find((descriptor) => descriptor.shortcut === key);
  return match ? match.value : null;
}

// --- Logical layout (T035) --------------------------------------------------
// Fixed logical bounds at the canonical 800×450 canvas so the two controls
// never overlap the track, projection, ticker, lap label, item board, or
// vehicle-stat regions. Both scenes place the control row in the same safe
// band; Test Day composes it alongside its existing control row.

export interface PlaybackControlRegion {
  readonly id: PlaybackSpeed;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly textPx: number;
}

export interface PlaybackControlLayout {
  readonly viewport: { width: number; height: number };
  readonly regions: readonly PlaybackControlRegion[];
  /** True if any region overlaps a reserved non-control region. */
  readonly overlapsReserved: boolean;
  /** True if any region exceeds the viewport bounds. */
  readonly overflowsViewport: boolean;
}

/** Reserved non-control regions at 800×450 the controls must not overlap. */
const RESERVED_REGIONS: readonly { x: number; y: number; width: number; height: number }[] = [
  { x: 0, y: 0, width: LOGICAL_WIDTH, height: 90 }, // title + subtitle
  { x: 0, y: 90, width: LOGICAL_WIDTH - 200, height: 230 }, // track band
  { x: 0, y: 360, width: LOGICAL_WIDTH, height: 78 }, // item board header + slots
  { x: 660, y: 40, width: 140, height: 330 }, // projected-pace sidebar
];

const CONTROL_ROW_Y = 440;
const CONTROL_WIDTH = 70;
const CONTROL_HEIGHT = 8;
const CONTROL_GAP = 12;

function regionsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Lays out the two controls centered in the bottom safe band at 800×450.
 * Tests (T035) assert no overlap with reserved regions and no overflow.
 */
export function layoutPlaybackControls(
  viewport: { width: number; height: number } = { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT },
): PlaybackControlLayout {
  const totalWidth = CONTROL_WIDTH * 2 + CONTROL_GAP;
  const startX = (viewport.width - totalWidth) / 2;
  const regions = PLAYBACK_SPEEDS.map((descriptor, index) => ({
    id: descriptor.value,
    x: startX + index * (CONTROL_WIDTH + CONTROL_GAP),
    y: CONTROL_ROW_Y,
    width: CONTROL_WIDTH,
    height: CONTROL_HEIGHT,
    textPx: 14,
  }));
  const overlapsReserved = regions.some((region) =>
    RESERVED_REGIONS.some((reserved) => regionsOverlap(region, reserved)));
  const overflowsViewport = regions.some(
    (region) =>
      region.x < 0
      || region.y < 0
      || region.x + region.width > viewport.width
      || region.y + region.height > viewport.height,
  );
  return { viewport, regions, overlapsReserved, overflowsViewport };
}
