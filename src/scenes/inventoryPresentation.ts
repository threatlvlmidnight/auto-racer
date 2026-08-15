import type {
  InventoryHost,
  InventoryHostContext,
  InventoryPresentationMode,
} from "../simulation/types";

/**
 * Feature 032 T010: the pure inventory host/layout/session presentation
 * contract (research Decision 6). One session over multiple host scenes:
 * the host captures a typed context token before opening; a pure layout
 * projection selects overlay vs full-window from measured safe bounds,
 * never user agent; closing returns the token plus authorized mutations.
 * Scenes add drawing/input in T057-T063; this module stays pure.
 */

/** Measured safe bounds of the host scene, in logical canvas units. */
export interface InventorySafeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Minimum safe space the overlay presentation needs beside/over the host.
 * Narrower or shorter measured bounds switch the SAME interaction to
 * full-window (spec Clarifications: measured space, not device detection).
 */
export const INVENTORY_OVERLAY_MIN_WIDTH = 560;
export const INVENTORY_OVERLAY_MIN_HEIGHT = 360;

/** Chosen from measured safe bounds only — never user agent (contract §4). */
export function selectInventoryPresentation(
  bounds: InventorySafeBounds,
): InventoryPresentationMode {
  return bounds.width >= INVENTORY_OVERLAY_MIN_WIDTH
    && bounds.height >= INVENTORY_OVERLAY_MIN_HEIGHT
    ? "overlay"
    : "full-window";
}

export interface InventorySessionInput {
  host: InventoryHost;
  sceneKey: string;
  focusKey: string | null;
  /** Host-owned selection/navigation snapshot captured at open time. */
  hostState: Readonly<Record<string, unknown>>;
  safeBounds: InventorySafeBounds;
  /** Non-null while another modal/transaction is unresolved (contract §4). */
  blockedReason?: string | null;
}

export type InventoryOpenResult =
  | { kind: "opened"; context: InventoryHostContext }
  | { kind: "blocked"; reason: string };

/**
 * Opens one inventory session. Blocked while any modal/transaction is
 * unresolved; otherwise captures the host token and derives presentation
 * from measured bounds. Pure: never mutates the input.
 */
export function openInventorySession(input: InventorySessionInput): InventoryOpenResult {
  if (input.blockedReason) {
    return { kind: "blocked", reason: input.blockedReason };
  }
  return {
    kind: "opened",
    context: {
      host: input.host,
      sceneKey: input.sceneKey,
      focusKey: input.focusKey,
      hostState: input.hostState,
      presentation: selectInventoryPresentation(input.safeBounds),
      blockedReason: null,
    },
  };
}

/** The exact host state restored on close — selection, focus, navigation. */
export interface InventoryRestoreResult {
  host: InventoryHost;
  sceneKey: string;
  focusKey: string | null;
  hostState: Readonly<Record<string, unknown>>;
}

/**
 * Closing returns the captured token unchanged (contract §4: everything
 * restores except mutations explicitly committed through authoritative
 * garage/run commands inside the session). Pure and reference-preserving.
 */
export function closeInventorySession(
  context: InventoryHostContext,
): InventoryRestoreResult {
  return {
    host: context.host,
    sceneKey: context.sceneKey,
    focusKey: context.focusKey,
    hostState: context.hostState,
  };
}

/** The semantic regions every inventory layout provides (skeleton, T057 completes). */
export type InventoryRegionId = "board" | "storage" | "inspector" | "sell-target" | "undo";

export interface InventoryLayoutModel {
  presentation: InventoryPresentationMode;
  regions: readonly { id: InventoryRegionId; x: number; y: number; width: number; height: number }[];
}

/**
 * Skeleton layout projection: derives the region plan from the chosen
 * presentation and measured bounds. T057 completes exact responsive sizing;
 * the contract shape is fixed now so host integrations can wire against it.
 */
export function inventoryLayoutModel(
  presentation: InventoryPresentationMode,
  bounds: InventorySafeBounds,
): InventoryLayoutModel {
  const margin = 12;
  const innerWidth = Math.max(0, bounds.width - margin * 2);
  const innerHeight = Math.max(0, bounds.height - margin * 2);
  const boardHeight = Math.floor(innerHeight * 0.58);
  const storageHeight = Math.max(48, innerHeight - boardHeight - margin);
  const inspectorWidth = Math.min(260, Math.floor(innerWidth * 0.34));
  const contentWidth = innerWidth - inspectorWidth - margin;
  const boardWidth = presentation === "full-window" ? innerWidth : Math.max(0, contentWidth);
  const inspectorX = bounds.x + margin + boardWidth + margin;
  const regions = [
    { id: "board" as const, x: bounds.x + margin, y: bounds.y + margin, width: boardWidth, height: boardHeight },
    { id: "storage" as const, x: bounds.x + margin, y: bounds.y + margin + boardHeight + margin, width: boardWidth, height: storageHeight },
    { id: "inspector" as const, x: presentation === "full-window" ? bounds.x + margin : inspectorX, y: bounds.y + margin, width: presentation === "full-window" ? innerWidth : inspectorWidth, height: boardHeight },
    { id: "sell-target" as const, x: presentation === "full-window" ? bounds.x + margin : inspectorX, y: bounds.y + margin + boardHeight + margin, width: presentation === "full-window" ? Math.floor(innerWidth / 2) : inspectorWidth, height: 40 },
    { id: "undo" as const, x: presentation === "full-window" ? bounds.x + margin + Math.floor(innerWidth / 2) + margin : inspectorX, y: bounds.y + margin + boardHeight + margin, width: presentation === "full-window" ? Math.floor(innerWidth / 2) - margin : inspectorWidth, height: 40 },
  ];
  return { presentation, regions };
}
