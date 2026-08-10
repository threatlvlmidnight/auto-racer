import Phaser from "phaser";
import type { Run } from "../simulation/run";

export const DEMO_COLORS = {
  ink: 0x172426,
  deepGreen: 0x203d3c,
  paper: 0xeadcb5,
  brass: 0xd8b45a,
  oxblood: 0x9f3038,
  teal: 0x3f7776,
  steel: 0x9eb9b3,
  muted: 0xa99f84,
} as const;

export const DISPLAY_FONT = "Georgia, serif";
export const UI_FONT = "Trebuchet MS, sans-serif";

export function addDemoBackdrop(
  scene: Phaser.Scene,
  key: "championship-paddock" | "workshop" | "race-day",
  overlayAlpha = 0.62,
): void {
  scene.add.image(400, 225, key).setDisplaySize(800, 450).setDepth(-100);
  scene.add.rectangle(400, 225, 800, 450, DEMO_COLORS.ink, overlayAlpha).setDepth(-99);
  const frame = scene.add.graphics().setDepth(90);
  frame.lineStyle(2, DEMO_COLORS.brass, 0.65).strokeRect(10, 10, 780, 430);
  frame.lineStyle(1, DEMO_COLORS.paper, 0.28).strokeRect(15, 15, 770, 420);
}

export function addHeaderBand(scene: Phaser.Scene): void {
  scene.add.rectangle(400, 50, 800, 100, DEMO_COLORS.ink, 0.86).setDepth(-20);
  scene.add.rectangle(400, 99, 800, 2, DEMO_COLORS.brass, 0.8).setDepth(-19);
}

/**
 * Draws the stage/credits stamp and returns the objects it created. Scenes that
 * stamp once and never mutate the run can ignore the return value; scenes whose
 * run changes in place (purchases, restocks) keep the handles so they can
 * destroy and redraw the stamp instead of leaving stale credits on screen.
 */
export function addRunStamp(scene: Phaser.Scene, run: Run): Phaser.GameObjects.Text[] {
  const stage = run.status === "completed"
    ? "RUN COMPLETE"
    : run.status === "failed"
      ? "RUN FAILED"
      : `STAGE ${run.stageIndex + 1}/${run.stages.length}`;
  const stageText = scene.add.text(24, 22, stage, {
    fontFamily: UI_FONT,
    fontSize: "11px",
    fontStyle: "bold",
    color: "#eadcb5",
  }).setDepth(92);
  const creditsText = scene.add.text(scene.scale.width - 24, 22, `${run.credits} CREDITS`, {
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
    .setStrokeStyle(2, DEMO_COLORS.brass, 0.75);
}

export interface DemoButtonOptions {
  fontSize?: string;
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
  const button = scene.add.text(x, y, label, {
    fontFamily: UI_FONT,
    fontSize: options.fontSize ?? "14px",
    fontStyle: "bold",
    color: enabled ? "#172426" : "#77766d",
    backgroundColor: enabled ? "#d8b45a" : "#454a45",
    padding: { x: 15, y: 8 },
  }).setOrigin(0.5);
  if (enabled) {
    button.setInteractive({ useHandCursor: true });
    button.on("pointerover", () => button.setBackgroundColor("#ead58d"));
    button.on("pointerout", () => button.setBackgroundColor("#d8b45a"));
    if (options.repeatable) button.on("pointerdown", action);
    else button.once("pointerdown", action);
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
  let index = 0;

  function draw(): void {
    ring.clear();
    const button = buttons[index];
    if (!button) return;
    const bounds = button.getBounds();
    ring.lineStyle(3, 0x7fd9ff, 1).strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
  }

  function move(delta: number): void {
    if (buttons.length === 0) return;
    index = ((index + delta) % buttons.length + buttons.length) % buttons.length;
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
