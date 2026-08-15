import Phaser from "phaser";

export const RUN_LEG_STATUS_TEXTURE_KEY = "feature-032-leg-status-sheet-v2";
export const RUN_ENCOUNTER_CARD_TEXTURE_KEY = "feature-032-encounter-card-sheet-v2";

export const RUN_LEG_STATUS_SHEET_SIZE = Object.freeze({ width: 1942, height: 809 });
export const RUN_ENCOUNTER_CARD_SHEET_SIZE = Object.freeze({ width: 1774, height: 887 });

export type RunLegVisualState = "upcoming" | "active" | "completed" | "locked";
export type RunEncounterVisualState = "default" | "focus" | "selected";

interface ChromeRegion {
  key: string;
  sourceRect: { x: number; y: number; width: number; height: number };
}

export const RUN_LEG_STATUS_REGIONS: readonly ChromeRegion[] = Object.freeze([
  { key: "upcoming", sourceRect: { x: 52, y: 291, width: 420, height: 226 } },
  { key: "active", sourceRect: { x: 525, y: 291, width: 420, height: 226 } },
  { key: "completed", sourceRect: { x: 999, y: 291, width: 420, height: 226 } },
  { key: "locked", sourceRect: { x: 1471, y: 291, width: 420, height: 226 } },
]);

export const RUN_ENCOUNTER_CARD_REGIONS: readonly ChromeRegion[] = Object.freeze([
  { key: "default", sourceRect: { x: 48, y: 236, width: 540, height: 424 } },
  { key: "focus", sourceRect: { x: 616, y: 236, width: 540, height: 424 } },
  { key: "selected", sourceRect: { x: 1181, y: 236, width: 540, height: 424 } },
]);

export function runLegVisualState(globalOrdinal: number, currentStageIndex: number): RunLegVisualState {
  if (globalOrdinal <= currentStageIndex) return "completed";
  if (globalOrdinal === currentStageIndex + 1) return "active";
  if (globalOrdinal === currentStageIndex + 2) return "upcoming";
  return "locked";
}

export function registerRunChromeTextureFrames(scene: Phaser.Scene): void {
  registerFrames(scene, RUN_LEG_STATUS_TEXTURE_KEY, RUN_LEG_STATUS_REGIONS);
  registerFrames(scene, RUN_ENCOUNTER_CARD_TEXTURE_KEY, RUN_ENCOUNTER_CARD_REGIONS);
}

function registerFrames(scene: Phaser.Scene, textureKey: string, regions: readonly ChromeRegion[]): void {
  const texture = scene.textures.get(textureKey);
  if (!texture || texture.key === "__MISSING") return;
  regions.forEach(({ key, sourceRect }) => {
    if (!texture.has(key)) {
      texture.add(key, 0, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
    }
  });
}

export function createRunLegPlaque(
  scene: Phaser.Scene,
  x: number,
  y: number,
  state: RunLegVisualState,
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(RUN_LEG_STATUS_TEXTURE_KEY)) return null;
  // These tracker plaques only ever render at one compact size. Scaling the
  // complete sprite keeps its silhouette intact; a nine-slice cannot shrink
  // the source's tall corner caps into this 38px row without overlapping them.
  return scene.add.image(x, y, RUN_LEG_STATUS_TEXTURE_KEY, state)
    .setDisplaySize(82, 34)
    .setOrigin(0.5);
}

export function createRunEncounterCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  state: RunEncounterVisualState = "default",
): Phaser.GameObjects.NineSlice | null {
  if (!scene.textures.exists(RUN_ENCOUNTER_CARD_TEXTURE_KEY)) return null;
  return scene.add.nineslice(x, y, RUN_ENCOUNTER_CARD_TEXTURE_KEY, state, 308, 186, 84, 84, 76, 76)
    .setOrigin(0.5);
}
