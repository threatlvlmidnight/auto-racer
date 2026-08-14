import Phaser from "phaser";
import { DEMO_COLORS, UI_FONT } from "./demoTheme";
import {
  buildVehicleStatLayout,
  type VehicleStatPanelModel,
} from "./vehicleStatPresentation";

/** Text/structural marker so state reads without relying on color alone (FR-015). */
function stateMarker(state: "improved" | "reduced" | "unchanged" | "unavailable"): string {
  return state === "improved" ? "▲" : state === "reduced" ? "▼" : state === "unavailable" ? "?" : "◆";
}

function stateColor(state: "improved" | "reduced" | "unchanged" | "unavailable"): number {
  return state === "improved" ? 0x74b893 : state === "reduced" ? 0xc95d61 : DEMO_COLORS.silver;
}

/**
 * One shared renderer for every context (current build, placement preview,
 * race lap, result, Test Day) — a model-driven container so no scene defines
 * its own vocabulary or layout (025 contract §6). Callers own interactivity
 * and keyboard focus (matching itemVisuals.ts's existing convention); this
 * function only builds the static display and stamps accessibility data.
 */
export function createVehicleStatPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  model: VehicleStatPanelModel,
  options: { viewport: { width: number; height: number } },
): Phaser.GameObjects.Container {
  const layout = buildVehicleStatLayout(options.viewport, model.conditionalSources.length);
  const children: Phaser.GameObjects.GameObject[] = [];
  const originX = -layout.totalWidth / 2;
  const originY = -layout.totalHeight / 2;

  layout.tiles.forEach((tile) => {
    const line = model.lines.find((candidate) => candidate.key === tile.id);
    if (!line) return;
    const tileX = originX + tile.x;
    const tileY = originY + tile.y;
    const background = scene.add.rectangle(tileX, tileY, tile.width, tile.height, DEMO_COLORS.ink, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, stateColor(line.state), 0.8);
    const marker = stateMarker(line.state);
    const deltaLabel = line.comparisonDeltaLabel ?? line.stockDeltaLabel;
    const body = scene.add.text(tileX + 5, tileY + 2,
      [
        line.compactLabel,
        `${marker} ${line.currentLabel}${deltaLabel ? ` (${deltaLabel})` : ""}`,
      ].join("\n"), {
        fontSize: `${tile.textPx}px`, fontFamily: UI_FONT, color: "#f1eee5", lineSpacing: 0,
        wordWrap: { width: tile.width - 8 },
      });
    background.setData("statLine", line);
    children.push(background, body);
  });

  if (layout.conditionalRegion && model.conditionalSources.length > 0) {
    const region = layout.conditionalRegion;
    const regionX = originX + region.x;
    const regionY = originY + region.y;
    const summary = scene.add.text(regionX, regionY,
      `◆ ${model.conditionalSources.length} effect${model.conditionalSources.length === 1 ? "" : "s"} need a track or lap`, {
        fontSize: `${region.textPx}px`, fontFamily: UI_FONT, fontStyle: "italic", color: "#b8c0c2",
        wordWrap: { width: region.width },
      });
    children.push(summary);
  }

  if (model.status !== "available" && model.unavailableReason) {
    const notice = scene.add.text(originX, originY + layout.totalHeight - 2, model.unavailableReason, {
      fontSize: "9px", fontFamily: UI_FONT, fontStyle: "italic", color: "#c95d61",
      wordWrap: { width: layout.totalWidth },
    });
    children.push(notice);
  }

  const container = scene.add.container(x, y, children).setSize(layout.totalWidth, layout.totalHeight);
  container.setData("accessibilityLabel", model.accessibilityLabel);
  container.setData("statPanelModel", model);
  container.setData("layoutModel", layout);
  return container;
}
