import Phaser from "phaser";

/**
 * Feature 032 T011: semantic UI crop-region/state contract (032 data-model.md
 * "UIChromeRegion", contract §8). Named crop/nine-slice regions come from the
 * approved transparent master; runtime labels, icons, focus, enabled state,
 * and actions remain semantic code. Accessibility meaning lives in the
 * runtime control model, never the bitmap.
 *
 * The registry is measured once from the approved master. The runtime still
 * has a code-rendered fallback so a missing optional art asset cannot remove
 * a label, action, or focus affordance.
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

/** The empty registry is useful to keep the registration operation pure. */
export const EMPTY_UI_CHROME_REGISTRY: UIChromeRegistry = Object.freeze({
  regions: Object.freeze([]),
});

/**
 * Measured, non-overlapping crops from the approved 1672×941 master. The
 * first two rows are the large editorial panels, the third row contains
 * compact controls, and the fourth row contains selectors/focus affordances.
 * All labels and interaction meaning remain runtime text/code.
 */
export const APPROVED_UI_CHROME_REGISTRY: UIChromeRegistry = (() => {
  const regions: UIChromeRegion[] = [
    { key: "primary-normal", family: "primary", sourceRect: { x: 48, y: 67, width: 330, height: 160 }, nineSliceMargins: { left: 24, top: 24, right: 24, bottom: 24 } },
    { key: "primary-hover", family: "primary", sourceRect: { x: 418, y: 67, width: 373, height: 160 }, nineSliceMargins: { left: 24, top: 24, right: 24, bottom: 24 } },
    { key: "primary-focus", family: "primary", sourceRect: { x: 831, y: 67, width: 380, height: 160 }, nineSliceMargins: { left: 24, top: 24, right: 24, bottom: 24 } },
    { key: "primary-disabled", family: "primary", sourceRect: { x: 1245, y: 67, width: 365, height: 160 }, nineSliceMargins: { left: 24, top: 24, right: 24, bottom: 24 } },
    { key: "secondary-normal", family: "secondary", sourceRect: { x: 58, y: 290, width: 320, height: 126 }, nineSliceMargins: { left: 20, top: 20, right: 20, bottom: 20 } },
    { key: "secondary-hover", family: "secondary", sourceRect: { x: 447, y: 290, width: 342, height: 126 }, nineSliceMargins: { left: 20, top: 20, right: 20, bottom: 20 } },
    { key: "secondary-focus", family: "secondary", sourceRect: { x: 858, y: 290, width: 343, height: 126 }, nineSliceMargins: { left: 20, top: 20, right: 20, bottom: 20 } },
    { key: "secondary-disabled", family: "secondary", sourceRect: { x: 1267, y: 290, width: 345, height: 126 }, nineSliceMargins: { left: 20, top: 20, right: 20, bottom: 20 } },
    { key: "compact-normal", family: "compact", sourceRect: { x: 50, y: 481, width: 122, height: 115 }, nineSliceMargins: { left: 16, top: 16, right: 16, bottom: 16 } },
    { key: "compact-hover", family: "compact", sourceRect: { x: 201, y: 481, width: 122, height: 115 }, nineSliceMargins: { left: 16, top: 16, right: 16, bottom: 16 } },
    { key: "compact-focus", family: "compact", sourceRect: { x: 354, y: 481, width: 123, height: 115 }, nineSliceMargins: { left: 16, top: 16, right: 16, bottom: 16 } },
    { key: "compact-disabled", family: "compact", sourceRect: { x: 510, y: 481, width: 123, height: 115 }, nineSliceMargins: { left: 16, top: 16, right: 16, bottom: 16 } },
    { key: "danger-normal", family: "danger", sourceRect: { x: 1337, y: 481, width: 120, height: 115 }, nineSliceMargins: { left: 16, top: 16, right: 16, bottom: 16 } },
    { key: "danger-pressed", family: "danger", sourceRect: { x: 1490, y: 481, width: 120, height: 115 }, nineSliceMargins: { left: 16, top: 16, right: 16, bottom: 16 } },
    { key: "selector-normal", family: "selector", sourceRect: { x: 305, y: 666, width: 340, height: 74 }, nineSliceMargins: { left: 18, top: 18, right: 18, bottom: 18 } },
    { key: "selector-focus", family: "selector", sourceRect: { x: 1023, y: 666, width: 159, height: 74 }, nineSliceMargins: { left: 18, top: 18, right: 18, bottom: 18 } },
    { key: "focus-ring", family: "focus", sourceRect: { x: 1378, y: 666, width: 233, height: 75 }, nineSliceMargins: { left: 12, top: 12, right: 12, bottom: 12 } },
  ];
  return Object.freeze({ regions: Object.freeze(regions.map((region) => Object.freeze(region))) });
})();

export const UI_CHROME_STATE_REGION_KEYS: Readonly<Record<UIChromeFamily, Readonly<Partial<Record<UIChromeState, string>>>>> = {
  primary: { normal: "primary-normal", hover: "primary-hover", focus: "primary-focus", pressed: "primary-focus", disabled: "primary-disabled" },
  secondary: { normal: "secondary-normal", hover: "secondary-hover", focus: "secondary-focus", pressed: "secondary-focus", disabled: "secondary-disabled" },
  compact: { normal: "compact-normal", hover: "compact-hover", focus: "compact-focus", pressed: "compact-focus", disabled: "compact-disabled" },
  danger: { normal: "danger-normal", hover: "danger-pressed", focus: "danger-pressed", pressed: "danger-pressed", disabled: "secondary-disabled" },
  selector: { normal: "selector-normal", hover: "selector-normal", focus: "selector-focus", pressed: "selector-focus", disabled: "secondary-disabled" },
  focus: { normal: "focus-ring", focus: "focus-ring" },
  divider: {},
  glyph: {},
};

export function uiChromeRegionForState(family: UIChromeFamily, state: UIChromeState): UIChromeRegion | null {
  const key = UI_CHROME_STATE_REGION_KEYS[family][state] ?? UI_CHROME_STATE_REGION_KEYS[family].normal;
  return key ? uiChromeRegionByKey(APPROVED_UI_CHROME_REGISTRY, key) : null;
}

/** Add the measured crops as Phaser texture frames after the sheet loads. */
export function registerUIChromeTextureFrames(scene: Phaser.Scene): void {
  const texture = scene.textures.get(UI_CHROME_MASTER_TEXTURE_KEY);
  if (!texture || texture.key === "__MISSING") return;
  APPROVED_UI_CHROME_REGISTRY.regions.forEach((region) => {
    if (!texture.has(region.key)) {
      const rect = region.sourceRect;
      texture.add(region.key, 0, rect.x, rect.y, rect.width, rect.height);
    }
  });
}

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

export interface RuntimeTextControlOptions {
  family: UIChromeFamily;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  enabled?: boolean;
  focused?: boolean;
  action?: () => void;
  interactive?: boolean;
  fontFamily?: string;
  fontSize?: string;
}

export interface UIChromeViewport { width: number; height: number; }
export interface UIChromeControlBounds { x: number; y: number; width: number; height: number; }
export const SUPPORTED_UI_VIEWPORTS: readonly UIChromeViewport[] = Object.freeze([
  { width: 800, height: 450 },
  { width: 960, height: 540 },
]);

export function chromeBoundsInViewport(bounds: UIChromeControlBounds, viewport: UIChromeViewport): boolean {
  return bounds.width > 0 && bounds.height > 0
    && bounds.x - bounds.width / 2 >= 0
    && bounds.y - bounds.height / 2 >= 0
    && bounds.x + bounds.width / 2 <= viewport.width
    && bounds.y + bounds.height / 2 <= viewport.height;
}

export function chromeBoundsOverlap(a: UIChromeControlBounds, b: UIChromeControlBounds): boolean {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width
    && Math.abs(a.y - b.y) * 2 < a.height + b.height;
}

export function semanticInputState(enabled: boolean, focused: boolean, pressed = false): UIChromeState {
  if (!enabled) return "disabled";
  if (pressed) return "pressed";
  if (focused) return "focus";
  return "normal";
}

/** Approved control crops are light ivory, so every semantic state uses ink text. */
export const UI_CHROME_TEXT_COLORS: Readonly<Record<UIChromeState, string>> = {
  normal: "#243238",
  hover: "#172426",
  focus: "#172426",
  pressed: "#172426",
  disabled: "#59615e",
};

function uiChromeTextColor(state: UIChromeState): string {
  return UI_CHROME_TEXT_COLORS[state];
}

/**
 * Shared text-over-nine-slice control. It intentionally returns the text
 * object for compatibility with existing focus/navigation code; its frame is
 * stored on the text object and follows the same lifecycle as the scene.
 */
export function createRuntimeTextControl(
  scene: Phaser.Scene,
  options: RuntimeTextControlOptions,
): Phaser.GameObjects.Text {
  const enabled = options.enabled !== false;
  const state: UIChromeState = !enabled ? "disabled" : options.focused ? "focus" : "normal";
  const region = uiChromeRegionForState(options.family, state);
  const frame = region && scene.textures.exists(UI_CHROME_MASTER_TEXTURE_KEY)
    ? scene.add.nineslice(
      options.x,
      options.y,
      UI_CHROME_MASTER_TEXTURE_KEY,
      region.key,
      options.width,
      options.height,
      region.nineSliceMargins.left,
      region.nineSliceMargins.right,
      region.nineSliceMargins.top,
      region.nineSliceMargins.bottom,
    ).setOrigin(0.5)
    : scene.add.rectangle(
      options.x,
      options.y,
      options.width,
      options.height,
      enabled ? 0xf3eee2 : 0xd4d1c8,
      0.96,
    ).setOrigin(0.5).setStrokeStyle(2, options.focused ? 0x7fd9ff : 0xb8c0c2, 0.9);
  frame.setData("uiChromeFamily", options.family);
  frame.setData("uiChromeState", state);
  const text = scene.add.text(options.x, options.y, options.label, {
    fontFamily: options.fontFamily ?? "Avenir Next Condensed, Arial Narrow, sans-serif",
    fontSize: options.fontSize ?? "14px",
    fontStyle: "bold",
    color: uiChromeTextColor(state),
    align: "center",
    wordWrap: { width: Math.max(20, options.width - 24) },
  }).setOrigin(0.5);
  text.setData("uiChromeFrame", frame);
  frame.setData("uiChromeLabel", text);
  text.setData("uiChromeState", state);
  const setState = (next: UIChromeState): void => {
    text.setData("uiChromeState", next);
    frame.setData("uiChromeState", next);
    text.setColor(uiChromeTextColor(next));
    const nextRegion = uiChromeRegionForState(options.family, next);
    if (nextRegion && "setFrame" in frame && typeof frame.setFrame === "function") {
      frame.setFrame(nextRegion.key);
    } else if ("setFillStyle" in frame && typeof frame.setFillStyle === "function") {
      frame.setFillStyle(next === "disabled" ? 0xd4d1c8 : next === "hover" ? 0xfff9e9 : 0xf3eee2, 0.96);
      frame.setStrokeStyle(2, next === "focus" ? 0x7fd9ff : 0xb8c0c2, 0.9);
    }
  };
  text.setData("setUIChromeState", setState);
  text.once("destroy", () => frame.destroy());
  if (enabled && (options.interactive ?? Boolean(options.action))) {
    // The artwork, not only its much smaller label, is the button's hit target.
    // Keep the label interactive too for backwards compatibility with scene
    // focus lists; Phaser's top-only input selects one of the two. The guard
    // also prevents a duplicate activation if a scene enables multi-hit input.
    frame.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    let activating = false;
    const activate = (): void => {
      if (activating || !options.action) return;
      activating = true;
      options.action();
      queueMicrotask(() => { activating = false; });
    };
    const targets = [frame, text] as const;
    targets.forEach((target) => {
      target.on("pointerover", () => setState("hover"));
      target.on("pointerout", () => setState(options.focused ? "focus" : "normal"));
      target.on("pointerdown", () => setState("pressed"));
      target.on("pointerup", () => setState("hover"));
      if (options.action) target.once("pointerdown", activate);
    });
    text.setData("uiChromeInputTargets", targets);
    text.setData("uiChromeActivate", activate);
  }
  return text;
}
