import Phaser from "phaser";
import { DEMO_COLORS, DISPLAY_FONT, UI_FONT } from "./demoTheme";
import type { BuildTrackFitPresentation } from "./trackSummaryPresentation";
import { trackFitChartLayout } from "./trackFitLayout";

export const TRACK_DEMAND_COLOR = 0xd8aa4d;
export const VEHICLE_FIT_COLOR = 0x74c8d6;

function polygonPoints(cx: number, cy: number, radius: number, values: readonly number[]): Phaser.Geom.Point[] {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 2;
    const distance = radius * value / 100;
    return new Phaser.Geom.Point(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance);
  });
}

function drawPolygon(graphics: Phaser.GameObjects.Graphics, points: readonly Phaser.Geom.Point[], color: number): void {
  graphics.fillStyle(color, 0.2);
  graphics.lineStyle(2, color, 1);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  points.forEach((point) => graphics.fillCircle(point.x, point.y, 2.5));
}

export function createBuildTrackFitPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  model: BuildTrackFitPresentation,
  options: { width: number; height: number },
): Phaser.GameObjects.Container {
  const { width, height } = options;
  const children: Phaser.GameObjects.GameObject[] = [];
  const panel = scene.add.rectangle(0, 0, width, height, DEMO_COLORS.ink, 0.94)
    .setOrigin(0, 0)
    .setStrokeStyle(1, DEMO_COLORS.silver, 0.75);
  children.push(panel);

  if (model.status === "unavailable") {
    children.push(scene.add.text(width / 2, height / 2, model.reason, {
      fontSize: "10px", fontFamily: UI_FONT, fontStyle: "italic", color: "#b8c0c2",
      align: "center", wordWrap: { width: width - 24 },
    }).setOrigin(0.5));
    return scene.add.container(x, y, children).setSize(width, height);
  }

  const layout = trackFitChartLayout(width, height);
  children.push(
    scene.add.text(10, 7, model.title, { fontSize: "15px", fontFamily: DISPLAY_FONT, fontStyle: "bold", color: "#e8b95f" }),
    scene.add.text(10, 23, model.subtitle, { fontSize: "9px", fontFamily: UI_FONT, color: "#cddbd2" }),
  );
  const legendY = 12;
  children.push(
    scene.add.rectangle(width - 104, legendY, 8, 3, TRACK_DEMAND_COLOR).setOrigin(0, 0.5),
    scene.add.text(width - 92, legendY - 5, "DEMAND", { fontSize: "8px", fontFamily: UI_FONT, color: "#e8b95f" }),
    scene.add.rectangle(width - 55, legendY, 8, 3, VEHICLE_FIT_COLOR).setOrigin(0, 0.5),
    scene.add.text(width - 43, legendY - 4, "VEHICLE", { fontSize: "7px", fontFamily: UI_FONT, color: "#8fd8e2" }),
  );

  const chart = scene.add.graphics();
  [25, 50, 75, 100].forEach((percent) => {
    const ring = polygonPoints(layout.centerX, layout.centerY, layout.radius, [percent, percent, percent, percent]);
    chart.lineStyle(1, DEMO_COLORS.silver, percent === 100 ? 0.65 : 0.28);
    chart.strokePoints(ring, true);
  });
  chart.lineStyle(1, DEMO_COLORS.silver, 0.35);
  for (let index = 0; index < 4; index += 1) {
    const point = polygonPoints(layout.centerX, layout.centerY, layout.radius, [100, 100, 100, 100])[index];
    chart.lineBetween(layout.centerX, layout.centerY, point.x, point.y);
  }
  drawPolygon(chart, polygonPoints(layout.centerX, layout.centerY, layout.radius, model.axes.map((axis) => axis.demandPlot)), TRACK_DEMAND_COLOR);
  drawPolygon(chart, polygonPoints(layout.centerX, layout.centerY, layout.radius, model.axes.map((axis) => axis.vehiclePlot)), VEHICLE_FIT_COLOR);
  children.push(chart);

  const labelPositions = [
    { x: layout.centerX, y: layout.centerY - layout.radius - 10, ox: 0.5, oy: 1 },
    { x: layout.centerX + layout.radius + 7, y: layout.centerY, ox: 0, oy: 0.5 },
    { x: layout.centerX, y: layout.centerY + layout.radius + 7, ox: 0.5, oy: 0 },
    { x: layout.centerX - layout.radius - 7, y: layout.centerY, ox: 1, oy: 0.5 },
  ];
  model.axes.forEach((axis, index) => {
    const position = labelPositions[index];
    children.push(scene.add.text(position.x, position.y, axis.label, {
      fontSize: "8px", fontFamily: UI_FONT, color: "#f1eee5",
    }).setOrigin(position.ox, position.oy));
  });

  const barsTop = height - 58;
  model.axes.forEach((axis, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const left = 10 + column * (layout.barWidth + 14);
    const top = barsTop + row * 21;
    const valueX = left + layout.barWidth - 2;
    const trackWidth = Math.max(0, (layout.barWidth - 5) * axis.demandPlot / 100);
    const vehicleWidth = Math.max(0, (layout.barWidth - 5) * axis.vehiclePlot / 100);
    children.push(
      scene.add.text(left, top, axis.label, { fontSize: "8px", fontFamily: UI_FONT, color: "#f1eee5" }),
      scene.add.text(valueX - 27, top, `${axis.demand}`, { fontSize: "8px", fontFamily: UI_FONT, color: "#e8b95f" }).setOrigin(1, 0),
      scene.add.text(valueX, top, `${axis.vehicle}`, { fontSize: "8px", fontFamily: UI_FONT, color: "#8fd8e2" }).setOrigin(1, 0),
      scene.add.rectangle(left, top + 11, layout.barWidth, 2, 0x52605f, 0.55).setOrigin(0, 0),
      scene.add.rectangle(left, top + 10, trackWidth, 2, TRACK_DEMAND_COLOR, 1).setOrigin(0, 0),
      scene.add.rectangle(left, top + 13, vehicleWidth, 2, VEHICLE_FIT_COLOR, 1).setOrigin(0, 0),
    );
  });

  children.push(scene.add.text(width / 2, height - 5, model.factsLine, {
    fontSize: "7px", fontFamily: UI_FONT, color: "#c7aa70",
  }).setOrigin(0.5, 1));
  const container = scene.add.container(x, y, children).setSize(width, height);
  container.setData("accessibilityLabel", model.accessibilityLabel);
  container.setData("trackFitModel", model);
  return container;
}
