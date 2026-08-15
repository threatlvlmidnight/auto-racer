import Phaser from "phaser";

export const ENTRANT_CARD_TEXTURE_KEY = "feature-032-entrant-card-sheet-v2";
export const ENTRANT_CARD_SHEET_SIZE = Object.freeze({ width: 1705, height: 922 });
export type EntrantCardVisualState = "default" | "focus" | "selected";

export const ENTRANT_CARD_REGIONS = Object.freeze([
  { key: "default", sourceRect: { x: 25, y: 208, width: 516, height: 507 } },
  { key: "focus", sourceRect: { x: 592, y: 208, width: 519, height: 507 } },
  { key: "selected", sourceRect: { x: 1162, y: 208, width: 519, height: 507 } },
]);

export function registerEntrantChromeTextureFrames(scene: Phaser.Scene): void {
  const texture = scene.textures.get(ENTRANT_CARD_TEXTURE_KEY);
  if (!texture || texture.key === "__MISSING") return;
  ENTRANT_CARD_REGIONS.forEach(({ key, sourceRect }) => {
    if (!texture.has(key)) {
      texture.add(key, 0, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
    }
  });
}

export function createEntrantCardFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  state: EntrantCardVisualState,
  width: number,
  height: number,
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(ENTRANT_CARD_TEXTURE_KEY)) return null;
  // Character cards render at one fixed compact size. Scaling the whole frame
  // keeps the generated trim thin; nine-slice corner caps overwhelm a card
  // this small and create the chunky protrusions seen in the UI.
  return scene.add.image(x, y, ENTRANT_CARD_TEXTURE_KEY, state)
    .setDisplaySize(width, height)
    .setOrigin(0.5);
}
