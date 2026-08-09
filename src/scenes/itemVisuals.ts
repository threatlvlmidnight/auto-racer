import Phaser from "phaser";
import type { OfferedItem } from "../simulation/types";
import { itemVisualDescriptor } from "./itemVisualDescriptor";
import { itemDetailsLabel } from "./resultFormatting";
import { DEMO_COLORS, UI_FONT } from "./demoTheme";

export function createItemIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  item: OfferedItem,
  size = 52,
): Phaser.GameObjects.Container {
  const descriptor = itemVisualDescriptor(item);
  const background = scene.add
    .rectangle(0, 0, size, size, DEMO_COLORS.ink)
    .setStrokeStyle(2, descriptor.performance ? DEMO_COLORS.brass : DEMO_COLORS.steel);
  const graphics = scene.add.graphics();
  const accent = descriptor.performance ? DEMO_COLORS.brass : DEMO_COLORS.steel;
  const directionColor = descriptor.improvesTime ? 0x74b893 : 0xc95d61;
  const radius = size * 0.2;

  graphics.lineStyle(3, accent, 1);
  graphics.strokeCircle(-5, 0, radius);
  graphics.lineBetween(-5, -radius - 5, -5, -radius);
  graphics.lineBetween(-10, -radius - 5, 0, -radius - 5);
  graphics.lineBetween(-5, 0, 1, -6);
  graphics.lineBetween(-5, 0, -5, -7);

  graphics.lineStyle(3, directionColor, 1);
  if (descriptor.kind === "direct") {
    const direction = descriptor.improvesTime ? 1 : -1;
    graphics.lineBetween(13, -7 * direction, 13, 7 * direction);
    graphics.lineBetween(13, 7 * direction, 8, 2 * direction);
    graphics.lineBetween(13, 7 * direction, 18, 2 * direction);
  } else {
    graphics.lineBetween(13, 8, 13, -8);
    graphics.lineBetween(13, -8, 8, -3);
    graphics.lineBetween(13, -8, 18, -3);
  }

  if (descriptor.kind === "stacking-buff") {
    graphics.fillStyle(accent, 1);
    graphics.fillRect(5, 11, 4, 3);
    graphics.fillRect(11, 8, 4, 6);
    graphics.fillRect(17, 5, 4, 9);
  } else if (descriptor.kind === "count-synergy") {
    graphics.fillStyle(accent, 1);
    graphics.fillCircle(7, 12, 2.5);
    graphics.fillCircle(13, 12, 2.5);
    graphics.fillCircle(19, 12, 2.5);
  }

  const cooldown = scene.add
    .text(size / 2 - 8, size / 2 - 8, String(descriptor.cooldown), {
      fontSize: "10px",
      fontFamily: UI_FONT,
      color: "#172426",
      backgroundColor: "#eadcb5",
      padding: { x: 3, y: 1 },
    })
    .setOrigin(0.5);

  const children: Phaser.GameObjects.GameObject[] = [background, graphics, cooldown];
  if (descriptor.activeWhileStored) {
    const storageMark = scene.add.graphics();
    storageMark.fillStyle(0x65c7f7, 1);
    storageMark.fillRect(-size / 2 + 5, size / 2 - 11, 11, 7);
    storageMark.lineStyle(1, 0x101619, 1);
    storageMark.lineBetween(-size / 2 + 3, size / 2 - 13, -size / 2 + 18, size / 2 - 13);
    children.push(storageMark);
  }

  return scene.add.container(x, y, children).setSize(size, size);
}

export function createItemCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  item: OfferedItem,
  options: {
    width: number;
    height: number;
    iconSize?: number;
    layout?: "row" | "column";
  },
): Phaser.GameObjects.Container {
  const iconSize = options.iconSize ?? 46;
  const layout = options.layout ?? "row";
  const iconX = layout === "row" ? -options.width / 2 + iconSize / 2 : 0;
  const iconY = layout === "column" ? -12 : 0;
  const icon = createItemIcon(scene, iconX, iconY, item, iconSize);
  const name = scene.add
    .text(
      layout === "row" ? iconX + iconSize / 2 + 8 : 0,
      layout === "row" ? 0 : iconSize / 2 + 2,
      item.name,
      {
        fontSize: layout === "row" ? "11px" : "10px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#f3e5bd",
        align: layout === "row" ? "left" : "center",
        wordWrap: {
          width: layout === "row" ? options.width - iconSize - 12 : options.width,
        },
      },
    )
    .setOrigin(layout === "row" ? 0 : 0.5, 0.5);

  return scene.add.container(x, y, [icon, name]).setSize(options.width, options.height);
}

export function enableItemTooltip(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform,
  item: OfferedItem,
): void {
  let tooltip: Phaser.GameObjects.Text | undefined;

  const hide = () => {
    tooltip?.destroy();
    tooltip = undefined;
  };

  target.on("pointerover", (pointer: Phaser.Input.Pointer) => {
    hide();
    tooltip = scene.add
      .text(pointer.x, pointer.y - 16, itemDetailsLabel(item), {
        fontSize: "11px",
        fontFamily: UI_FONT,
        color: "#f3e5bd",
        backgroundColor: "#172426",
        padding: { x: 9, y: 7 },
        align: "center",
        wordWrap: { width: 220 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100);
    tooltip.x = Phaser.Math.Clamp(
      tooltip.x,
      tooltip.width / 2 + 8,
      scene.scale.width - tooltip.width / 2 - 8,
    );
    if (tooltip.y - tooltip.height < 8) tooltip.setOrigin(0.5, 0).setY(pointer.y + 16);
  });
  target.on("pointerout", hide);
  target.on("pointerdown", hide);
  target.once("destroy", hide);
}