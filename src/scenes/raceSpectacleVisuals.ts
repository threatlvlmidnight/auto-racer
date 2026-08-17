import Phaser from "phaser";
import type { Track } from "../simulation/tracks";
import type { CarProgress } from "../simulation/playback";
import type { RaceVisualProfile, RaceMarkerShape } from "../content/raceVisualProfiles";
import {
  markerPlacementAt,
  type CircuitVisualModel,
  type FocusPositionView,
  type FocusWindowDisplayModel,
  type SpectacleMomentModel,
} from "./raceSpectaclePresentation";
import { DISPLAY_FONT, UI_FONT } from "./demoTheme";

/**
 * Feature 036 thin Phaser rendering helpers (T016/T018/T030/T038). These draw
 * the retained circuit visual model, profile-aware markers, the bounded PiP
 * panel, and the focus window. All coordinates on the marker path still come
 * from `pointAtProgress` (contract §2); decoration never feeds coordinates
 * back into marker placement.
 */

function strokeClosedPath(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly { x: number; y: number }[],
): void {
  if (points.length < 2) return;
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);
  graphics.closePath();
  graphics.strokePath();
}

/**
 * Layered enhanced top-down circuit: outer shadow, verge, shoulder, road,
 * start/finish, and region-agnostic landmark labels (T016). Decorative only.
 */
export function createCircuitVisual(
  scene: Phaser.Scene,
  model: CircuitVisualModel,
  regionId?: string | null,
): Phaser.GameObjects.Graphics {
  const area = model.bounds;
  const cx = area.minX + area.width / 2;
  const cy = area.minY + area.height / 2;
  const regionPrefix = regionId ? `${String(regionId).toUpperCase()} ` : "";

  const g = scene.add.graphics();
  // Soft drop shadow under the road stack.
  g.lineStyle(Math.max(44, model.roadLayers[0]?.width ?? 42) + 7, 0x0c0f10, 0.45);
  strokeClosedPath(g, model.points);

  // Decorative road stack (verge -> shoulder -> road).
  for (const layer of model.roadLayers) {
    g.lineStyle(layer.width, parseInt(layer.color.replace("#", ""), 16), layer.alpha);
    strokeClosedPath(g, model.points);
  }

  // Start/finish derived from the retained first point.
  if (model.startFinish) {
    g.fillStyle(0xf1eee5, 0.85);
    g.fillRect(model.startFinish.x - 3, model.startFinish.y - 14, 6, 28);
    scene.add
      .text(model.startFinish.x, model.startFinish.y + 16, "S/F", {
        fontFamily: UI_FONT,
        fontSize: "8px",
        color: "#f1eee5",
      })
      .setOrigin(0.5);
  }

  // Decoration anchors relative to retained bounds (never movement).
  for (const landmark of model.landmarks) {
    scene.add
      .text(landmark.x, landmark.y, `${regionPrefix}${landmark.label.toUpperCase()}`, {
        fontFamily: UI_FONT,
        fontSize: "8px",
        color: "#5f6a6e",
      })
      .setOrigin(0.5);
  }

  // Local emphasis ring so the wide view stays readable without reframing.
  g.lineStyle(1, 0xffd447, 0.25);
  g.strokeCircle(cx, cy, Math.max(30, Math.min(area.width, area.height) / 2 + 12));
  return g;
}
function markPolygon(
  graphics: Phaser.GameObjects.Graphics,
  radius: number,
  sides: number,
  rotation: number,
): void {
  graphics.fillPoints(
    Array.from({ length: sides }, (_, i) => {
      const angle = rotation + (i / sides) * Math.PI * 2;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }),
    true,
  );
}

function fillFallbackShape(
  graphics: Phaser.GameObjects.Graphics,
  shape: RaceMarkerShape,
  color: number,
): void {
  graphics.fillStyle(color, 1);
  switch (shape) {
    case "round": graphics.fillCircle(0, 0, 9); break;
    case "square": graphics.fillRect(-8, -8, 16, 16); break;
    case "diamond": graphics.fillPoints(
      [{ x: 0, y: -10 }, { x: 9, y: 0 }, { x: 0, y: 10 }, { x: -9, y: 0 }], true); break;
    case "triangle": graphics.fillPoints(
      [{ x: 0, y: -9 }, { x: 8, y: 7 }, { x: -8, y: 7 }], true); break;
    case "pentagon": markPolygon(graphics, 9, 5, -Math.PI / 2); break;
    case "shield": markPolygon(graphics, 10, 5, -Math.PI / 2); break;
  }
}

export interface VehicleMarkerHandle {
  kind: "texture" | "fallback";
  textureKey?: string;
  container: Phaser.GameObjects.Container;
}

/** Renders a small deterministic glyph so pattern is visible, not just textual. */
function drawPatternGlyph(
  graphics: Phaser.GameObjects.Graphics,
  pattern: string,
  x: number,
  y: number,
  color: number,
  scale = 1,
): void {
  graphics.fillStyle(color, 1);
  switch (pattern) {
    case "pinstripe": graphics.fillRect(x - 0.5 * scale, y - 4 * scale, 1 * scale, 8 * scale); break;
    case "dash": graphics.fillRect(x - 4 * scale, y - 1 * scale, 8 * scale, 2 * scale); break;
    case "stripe": graphics.fillRect(x - 5 * scale, y - 2 * scale, 10 * scale, 4 * scale); break;
    case "pinion":
      graphics.fillRect(x - scale, y - 3 * scale, 2 * scale, 6 * scale);
      graphics.fillRect(x - 3 * scale, y - scale, 6 * scale, 2 * scale);
      break;
    case "hash":
      graphics.fillRect(x - 2 * scale, y - 3 * scale, 4 * scale, 1.5 * scale);
      graphics.fillRect(x - 2 * scale, y + 1.5 * scale, 4 * scale, 1.5 * scale);
      break;
    case "grate":
      graphics.fillCircle(x - 3 * scale, y, 1.2 * scale);
      graphics.fillCircle(x, y, 1.2 * scale);
      graphics.fillCircle(x + 3 * scale, y, 1.2 * scale);
      break;
    case "split":
      graphics.fillCircle(x - 2 * scale, y, 1.5 * scale);
      graphics.fillCircle(x + 2 * scale, y, 1.5 * scale);
      break;
    case "ring":
      graphics.lineStyle(2 * scale, color, 1);
      graphics.strokeCircle(x, y, 3 * scale);
      break;
    case "chevron":
      graphics.lineStyle(2 * scale, color, 1);
      graphics.beginPath();
      graphics.moveTo(x - 3 * scale, y - 2 * scale);
      graphics.lineTo(x, y + 2 * scale);
      graphics.lineTo(x + 3 * scale, y - 2 * scale);
      graphics.strokePath();
      break;
    case "cross":
      graphics.lineStyle(2 * scale, color, 1);
      graphics.beginPath();
      graphics.moveTo(x - 3 * scale, y - 3 * scale);
      graphics.lineTo(x + 3 * scale, y + 3 * scale);
      graphics.moveTo(x - 3 * scale, y + 3 * scale);
      graphics.lineTo(x + 3 * scale, y - 3 * scale);
      graphics.strokePath();
      break;
    default:
      graphics.fillCircle(x, y, 1.5 * scale);
  }
}

/**
 * Profile-aware vehicle marker (T018/T047): texture-backed body when the art
 * loads, otherwise a geometric, labeled no-asset fallback. Every marker renders
 * the profile's number (on a plate) plus a deterministic pattern glyph so
 * identity never depends on color alone, in both marker paths.
 */
export function createVehicleMarker(
  scene: Phaser.Scene,
  profile: RaceVisualProfile,
  textureKey: string | undefined,
  colorHex: number,
): VehicleMarkerHandle {
  const container = scene.add.container(0, 0);
  if (textureKey) {
    const image = scene.add.image(0, 0, textureKey).setDisplaySize(30, 19);
    container.add(image);
    const plate = scene.add.rectangle(-12, 8, 14, 8, 0xf1eee5, 0.92).setOrigin(0.5, 0.5);
    const number = scene.add
      .text(-12, 8, profile.number, { fontFamily: UI_FONT, fontSize: "6px", color: "#0c0f10" })
      .setOrigin(0.5);
    const patternGraphics = scene.add.graphics();
    drawPatternGlyph(patternGraphics, profile.pattern, 12, 7, 0xf1eee5, 0.9);
    container.add([image, plate, number, patternGraphics]);
    return { kind: "texture", textureKey, container };
  }
  const graphics = scene.add.graphics();
  fillFallbackShape(graphics, profile.fallback.shape, colorHex);
  drawPatternGlyph(graphics, profile.fallback.pattern, 0, -13, 0xf1eee5, 0.9);
  const number = scene.add.text(0, 0, profile.number, {
    fontFamily: UI_FONT,
    fontSize: "7px",
    color: "#0c0f10",
  }).setOrigin(0.5);
  const label = scene.add.text(0, 13, profile.fallback.label, {
    fontFamily: UI_FONT,
    fontSize: "7px",
    color: "#f1eee5",
  }).setOrigin(0.5);
  container.add([graphics, number, label]);
  return { kind: "fallback", container };
}

/** Place a vehicle marker at the retained placement; returns the point. */
export function positionVehicleMarker(
  container: Phaser.GameObjects.Container,
  track: Track,
  progress: CarProgress,
): { x: number; y: number } {
  const placement = markerPlacementAt(track, progress.lapProgress);
  container.setPosition(placement.x, placement.y);
  container.setRotation(placement.headingRadians);
  return { x: placement.x, y: placement.y };
}

export interface PipPanelOptions {
  x: number;
  y: number;
  width?: number;
}

/** Bounded picture-in-picture panel: a visual cut-in (T051) with labeled text. */
export function renderPipPanel(
  scene: Phaser.Scene,
  model: SpectacleMomentModel,
  options: PipPanelOptions,
): Phaser.GameObjects.Container {
  const width = options.width ?? 250;
  const hasVisual = model.featured.length > 0;
  const height = hasVisual ? 108 : 74;
  const container = scene.add.container(0, 0);
  const panel = scene.add
    .rectangle(0, 0, width, height, 0x0b1214, 0.94)
    .setStrokeStyle(2, 0xffd447, 1);
  container.add([panel]);
  const modeLabel = model.reducedMotion ? "CUT-IN · STATIC" : "CUT-IN";

  if (hasVisual) {
    // Mini scene strip: a road with the featured participant markers.
    const road = scene.add.graphics();
    road.lineStyle(2, 0x354a4e, 0.9);
    road.lineBetween(-(width / 2) + 16, -36, width / 2 - 16, -36);
    road.lineStyle(1, 0xf1eee5, 0.7);
    for (let x = -(width / 2) + 18; x < width / 2 - 18; x += 14) {
      road.lineBetween(x, -33, x + 6, -39);
    }
    container.add(road);

    const featured = model.featured.slice(0, 2);
    const xs = featured.length === 2 ? [width / 2 - 64, -(width / 2) + 64] : [0];
    featured.forEach((participant, index) => {
      const dot = scene.add.graphics();
      dot.fillStyle(participant.colorHex, 1);
      dot.fillCircle(0, 0, 9);
      dot.lineStyle(2, 0xf1eee5, 1);
      dot.strokeCircle(0, 0, 9);
      const number = scene.add.text(0, 0, participant.number, {
        fontFamily: UI_FONT, fontSize: "7px", color: "#0c0f10",
      }).setOrigin(0.5);
      const name = scene.add.text(0, 13, participant.label.toUpperCase(), {
        fontFamily: UI_FONT, fontSize: "7px", color: "#f1eee5",
      }).setOrigin(0.5);
      const slot = scene.add.container(xs[index], -36, [dot, number, name]);
      container.add(slot);
    });

    // Event arrow/symbol synthesised from the retained kind (decorative only).
    const arrow = scene.add.graphics();
    const forward = model.kind !== "defense" && model.kind !== "incident";
    arrow.fillStyle(0xffd447, 0.9);
    if (model.kind === "incident") {
      arrow.fillTriangle(width / 2 - 34, -40, width / 2 - 22, -40, width / 2 - 28, -30);
    } else if (model.kind === "defense") {
      arrow.lineStyle(3, 0xffd447, 1);
      arrow.lineBetween(-10, -36, 16, -36);
      arrow.fillStyle(0xffd447, 1);
      arrow.fillTriangle(-16, -40, -16, -32, -22, -36);
    } else if (forward) {
      arrow.fillTriangle(width / 2 - 22, -40, width / 2 - 22, -32, width / 2 - 14, -36);
    }
    container.add(arrow);
  }

  const driver = scene.add.text(12, hasVisual ? -16 : -26, model.driverLabel.toUpperCase(), {
    fontFamily: DISPLAY_FONT, fontSize: "13px", fontStyle: "bold",
    color: "#ffd447",
  }).setOrigin(0, 0);
  const headline = scene.add.text(12, hasVisual ? 0 : -10, model.headline, {
    fontFamily: UI_FONT, fontSize: "11px", fontStyle: "bold", color: "#f1eee5",
  }).setOrigin(0, 0);
  const badge = scene.add.text(width - 16, hasVisual ? -16 : -28, modeLabel, {
    fontFamily: UI_FONT, fontSize: "8px", color: "#9eb5c9",
  }).setOrigin(1, 0);
  const consequence = scene.add.text(12, hasVisual ? 14 : 4, model.consequence, {
    fontFamily: UI_FONT, fontSize: "10px", color: "#cfd8d6",
    wordWrap: { width: width - 24 },
  }).setOrigin(0, 0);
  container.add([driver, headline, badge, consequence]);
  container.setPosition(options.x, options.y);
  container.setDepth(85);
  return container;
}

export interface FocusSelectorOption {
  carId: string;
  label: string;
  number: string;
}

/** Persistent focus window: a visual track mini-map + named-car selector (T054). */
export function renderFocusWindow(
  scene: Phaser.Scene,
  model: FocusWindowDisplayModel,
  options: FocusSelectorOption[],
  onSelect: (carId: string) => void,
  positions: readonly FocusPositionView[] = [],
  circuit?: CircuitVisualModel,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const width = 138;
  const hasMap = positions.length > 0 && circuit !== undefined;
  const mapHeight = hasMap ? 46 : 0;
  const top = mapHeight;

  if (hasMap && circuit) {
    const g = scene.add.graphics();
    const b = circuit.bounds;
    const pad = 6;
    const sw = width - pad * 2;
    const sh = mapHeight - pad * 2;
    const sx = (px: number) => pad + ((px - b.minX) / Math.max(b.width, 1)) * sw;
    const sy = (py: number) => pad + ((py - b.minY) / Math.max(b.height, 1)) * sh;
    g.lineStyle(3, 0x2a3336, 1);
    g.beginPath();
    circuit.points.forEach((point, index) => {
      if (index === 0) g.moveTo(sx(point.x), sy(point.y));
      else g.lineTo(sx(point.x), sy(point.y));
    });
    g.closePath();
    g.strokePath();
    container.add(g);
    positions.forEach((pos) => {
      const dot = scene.add.graphics();
      dot.fillStyle(0xffd447, 1);
      dot.fillCircle(sx(pos.position.x), sy(pos.position.y), 3);
      dot.lineStyle(1, 0xf1eee5, 1);
      dot.strokeCircle(sx(pos.position.x), sy(pos.position.y), 3);
      container.add(dot);
    });
  }

  const header = scene.add.text(0, top + 0, "FOCUS", {
    fontFamily: UI_FONT, fontSize: "9px", fontStyle: "bold", color: "#ffd447",
  }).setOrigin(0, 0);
  const selected = model.hasActiveMoment ? "EVENT" : model.selectedLabel.toUpperCase();
  const name = scene.add.text(0, top + 12, selected, {
    fontFamily: DISPLAY_FONT, fontSize: "13px", color: "#f1eee5",
  }).setOrigin(0, 0);
  const carText = model.displayedLabels.join(" · ").toUpperCase();
  const cars = scene.add.text(0, top + 26, carText, {
    fontFamily: UI_FONT, fontSize: "9px", color: "#cfd8d6",
    wordWrap: { width },
  }).setOrigin(0, 0);
  const line = scene.add.rectangle(width / 2, top + 40, width, 1, 0x3b4e4c, 1);
  container.add([header, name, cars, line]);

  options.forEach((option, index) => {
    const y = top + 48 + index * 15;
    const label = scene.add
      .text(0, y, `${option.number} ${option.label.toUpperCase()}`, {
        fontFamily: UI_FONT, fontSize: "9px",
        color: option.carId === model.selectedCarId ? "#ffd447" : "#9eb5c9",
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    label.on("pointerdown", () => onSelect(option.carId));
    container.add(label);
  });

  const height = top + 48 + options.length * 15;
  const backing = scene.add
    .rectangle(width / 2, height / 2, width + 8, height + 6, 0x0b1214, 0.7)
    .setStrokeStyle(1, 0x3b4e4c, 1);
  backing.setData("focus", true);
  container.addAt(backing, 0);
  container.setDepth(83);
  container.setPosition(20, 24);
  return container;
}

