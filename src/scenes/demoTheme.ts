import Phaser from "phaser";
import type { Run } from "../simulation/run";
import type { ProductionBackdropKey } from "./visualAssets";
import { LOGICAL_WIDTH } from "./layout";
import { createRuntimeTextControl } from "./uiChrome";
export { practiceFocusVisible } from "./focusPresentation";

export const DEMO_COLORS = {
  ink: 0x101817,
  deepGreen: 0x12352d,
  porcelain: 0xf1eee5,
  silver: 0xb8c0c2,
  steel: 0x74858a,
  italianRed: 0xb83232,
  italianRedBright: 0xd9483f,
  brass: 0xc6a15b,
  muted: 0x8d9997,
} as const;

export const DISPLAY_FONT = "DIN Condensed, Avenir Next Condensed, Arial Narrow, Helvetica Neue, sans-serif";
export const UI_FONT = "Avenir Next Condensed, Arial Narrow, Helvetica Neue, Arial, sans-serif";

export function addDemoBackdrop(
  scene: Phaser.Scene,
  key: "championship-paddock" | "workshop" | "race-day" | ProductionBackdropKey,
  overlayAlpha = 0.62,
): void {
  const image = scene.add.image(400, 225, key).setDepth(-100);
  // Cover-fit instead of stretching 16:9 masters. This also keeps the helper
  // valid if a later art revision uses a slightly different source crop.
  const source = image.texture.getSourceImage() as { width: number; height: number };
  const scale = Math.max(800 / source.width, 450 / source.height);
  image.setDisplaySize(source.width * scale, source.height * scale);
  scene.add.rectangle(400, 225, 800, 450, DEMO_COLORS.ink, overlayAlpha).setDepth(-99);
}

export function addHeaderBand(scene: Phaser.Scene): void {
  scene.add.rectangle(400, 50, 800, 100, DEMO_COLORS.ink, 0.86).setDepth(-20);
}

/**
 * Draws the stage/credits stamp and returns the objects it created. Scenes that
 * stamp once and never mutate the run can ignore the return value; scenes whose
 * run changes in place (purchases, restocks) keep the handles so they can
 * destroy and redraw the stamp instead of leaving stale credits on screen.
 */
export function addRunStamp(
  scene: Phaser.Scene,
  run: Run,
  options: { showCredits?: boolean } = {},
): Phaser.GameObjects.Text[] {
  const stage = run.status === "completed"
    ? "RUN COMPLETE"
    : run.status === "failed"
      ? "RUN FAILED"
      : `STAGE ${run.stageIndex + 1}/${run.stages.length}`;
  const stageText = scene.add.text(24, 22, stage, {
    fontFamily: UI_FONT,
    fontSize: "11px",
    fontStyle: "bold",
    color: "#f1eee5",
  }).setDepth(92);
  if (options.showCredits === false) return [stageText];
  const creditsText = scene.add.text(LOGICAL_WIDTH - 24, 22, `${run.credits} CREDITS`, {
    fontFamily: UI_FONT,
    fontSize: "11px",
    fontStyle: "bold",
    color: "#f0ce73",
  }).setOrigin(1, 0).setDepth(92);
  return [stageText, creditsText];
}

export function addPaperPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.94,
): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(x, y, width, height, DEMO_COLORS.ink, alpha)
    .setStrokeStyle(2, DEMO_COLORS.silver, 0.72);
}

export interface DemoButtonOptions {
  fontSize?: string;
  width?: number;
  height?: number;
  // Most buttons here navigate/commit once and get torn down with their scene's
  // next render(), so a single-fire listener is the safe default. Controls meant
  // to be pressed repeatedly without a re-render in between (pause, speed) opt in.
  repeatable?: boolean;
}

export function createDemoButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  action: () => void,
  enabled = true,
  options: DemoButtonOptions = {},
): Phaser.GameObjects.Text {
  const button = createRuntimeTextControl(scene, {
    family: "primary",
    x,
    y,
    width: options.width ?? Math.max(150, label.length * 9 + 34),
    height: options.height ?? 42,
    label,
    action,
    enabled,
    fontFamily: UI_FONT,
    fontSize: options.fontSize ?? "14px",
  });
  if (enabled && options.repeatable) {
    const targets = button.getData("uiChromeInputTargets") as Phaser.GameObjects.GameObject[] | undefined;
    const activate = button.getData("uiChromeActivate") as (() => void) | undefined;
    (targets ?? [button]).forEach((target) => {
      target.removeAllListeners("pointerdown");
      target.on("pointerdown", () => {
        const setState = button.getData("setUIChromeState") as ((state: "pressed") => void) | undefined;
        setState?.("pressed");
        (activate ?? action)();
      });
    });
  }
  return button;
}

// Practice/Test Day controls use a larger 16px floor (FR-025) without changing
// the shared 14px default createDemoButton keeps for scored scenes.
export const PRACTICE_CONTROL_FONT_SIZE = "16px";

export interface PracticeFocusHandle {
  destroy(): void;
}

// Phaser has no native DOM tab order, so Test Day scenes get a minimal
// keyboard focus ring: Tab/Shift+Tab move a visible outline across the given
// buttons in order; the buttons keep their own dedicated shortcut keys as the
// primary equivalent-action path.
export function applyPracticeFocusRing(
  scene: Phaser.Scene,
  buttons: readonly Phaser.GameObjects.Text[],
): PracticeFocusHandle {
  const ring = scene.add.graphics().setDepth(200);
  let index = -1;

  function draw(): void {
    ring.clear();
    const button = index >= 0 ? buttons[index] : undefined;
    if (!button) return;
    const frame = button.getData("uiChromeFrame") as Phaser.GameObjects.NineSlice | Phaser.GameObjects.Rectangle | undefined;
    const bounds = frame?.getBounds() ?? button.getBounds();
    ring.lineStyle(3, 0x7fd9ff, 1).strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
  }

  function move(delta: number): void {
    if (buttons.length === 0) return;
    index = index < 0
      ? delta > 0 ? 0 : buttons.length - 1
      : ((index + delta) % buttons.length + buttons.length) % buttons.length;
    draw();
  }

  scene.input.keyboard?.addCapture("TAB");
  const onTab = (event: KeyboardEvent) => move(event.shiftKey ? -1 : 1);
  scene.input.keyboard?.on("keydown-TAB", onTab);
  draw();

  return {
    destroy(): void {
      ring.destroy();
      scene.input.keyboard?.off("keydown-TAB", onTab);
    },
  };
}
