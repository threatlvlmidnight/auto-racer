import Phaser from "phaser";
import { BASELINE_CAR, ITEM_POOL } from "../content/sample-data";
import { drawItem } from "../simulation/draft";
import { addItem, evictAndAdd } from "../simulation/slots";
import {
  addItemToStorage,
  moveToBoard,
  moveToStorage,
  swapBoardStorage,
} from "../simulation/storage";
import {
  ACTIVE_IDENTITY_TAG,
  SLOT_CAPACITY,
  STORAGE_CAPACITY,
  TAG_WEIGHT,
  type Build,
  type OfferedItem,
} from "../simulation/types";
import { itemDetailsLabel } from "./resultFormatting";

const OFFER_ROUNDS = 5;
const SLOT_WIDTH = 190;
const SLOT_HEIGHT = 72;
const SLOT_GAP = 22;
const BOARD_Y = 250;
const STORAGE_Y = 365;

/**
 * Prepare phase: process a fixed sequence of offers before starting the
 * contest with the player's final build.
 */
export class PrepareScene extends Phaser.Scene {
  private build!: Build;
  private round = 0;
  private refreshesRemaining = 1;
  private currentOffer: OfferedItem | null = null;
  private storageVisible = false;
  private roundObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("PrepareScene");
  }

  create(): void {
    this.build = {
      car: BASELINE_CAR,
      board: Array(SLOT_CAPACITY).fill(null),
      storage: Array(STORAGE_CAPACITY).fill(null),
    };
    this.round = 0;
    this.refreshesRemaining = 1;
    this.currentOffer = this.drawOffer();
    this.storageVisible = false;
    this.renderRound();
  }

  private renderRound(): void {
    this.roundObjects.forEach((object) => object.destroy());
    this.roundObjects = [];

    if (this.round >= OFFER_ROUNDS) {
      this.scene.start("ContestScene", { build: this.build });
      return;
    }

    const { width } = this.scale;
    this.track(
      this.add
        .text(width / 2, 20, `Prepare · Round ${this.round + 1}/${OFFER_ROUNDS}`, {
          fontSize: "22px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
    );

    if (this.currentOffer) {
      this.createDraggableOffer(width / 2, 80, this.currentOffer);
    } else {
      this.track(
        this.add
          .text(width / 2, 80, "Offer placed · rearrange items or continue", {
            fontSize: "16px",
            color: "#8fd6b5",
          })
          .setOrigin(0.5)
      );
    }

    this.createControl(150, 150, this.storageVisible ? "Hide Storage" : "Show Storage", () => {
      this.storageVisible = !this.storageVisible;
      this.renderRound();
    });
    this.createControl(400, 150, `Refresh (${this.refreshesRemaining})`, () => this.refreshOffer(), {
      enabled: this.refreshesRemaining > 0 && this.currentOffer !== null,
    });
    this.createControl(650, 150, "Next", () => this.nextRound());

    this.renderSlotRow("BOARD · ACTIVE", this.build.board, BOARD_Y, "board");
    if (this.storageVisible) {
      this.renderSlotRow("STORAGE · INERT BY DEFAULT", this.build.storage, STORAGE_Y, "storage");
    }
  }

  private renderSlotRow(
    label: string,
    slots: (OfferedItem | null)[],
    y: number,
    area: "board" | "storage"
  ): void {
    const totalWidth = slots.length * SLOT_WIDTH + (slots.length - 1) * SLOT_GAP;
    const startX = (this.scale.width - totalWidth) / 2 + SLOT_WIDTH / 2;
    this.track(
      this.add.text(startX - SLOT_WIDTH / 2, y - SLOT_HEIGHT / 2 - 28, label, {
        fontSize: "14px",
        color: area === "board" ? "#ffdd77" : "#9eb5c9",
      })
    );

    slots.forEach((item, index) => {
      const x = startX + index * (SLOT_WIDTH + SLOT_GAP);
      const zone = this.add.zone(x, y, SLOT_WIDTH, SLOT_HEIGHT).setRectangleDropZone(SLOT_WIDTH, SLOT_HEIGHT);
      zone.setData("area", area);
      zone.setData("index", index);
      this.track(zone);
      this.track(
        this.add
          .rectangle(x, y, SLOT_WIDTH, SLOT_HEIGHT, item ? 0x263640 : 0x171d21, 1)
          .setStrokeStyle(2, item ? 0x6f91a8 : 0x45515a)
      );
      if (item) {
        this.createDraggableHeldItem(x, y, item, area, index);
      } else {
        this.track(
          this.add
            .text(x, y, `Empty ${area} slot ${index + 1}`, {
              fontSize: "12px",
              color: "#71808a",
            })
            .setOrigin(0.5)
        );
      }
    });
  }

  private createDraggableHeldItem(
    x: number,
    y: number,
    item: OfferedItem,
    sourceArea: "board" | "storage",
    sourceIndex: number
  ): Phaser.GameObjects.Text {
    const card = this.add
      .text(x, y, itemDetailsLabel(item), {
        fontSize: "12px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: SLOT_WIDTH - 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.input.setDraggable(card);
    card.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      card.setPosition(dragX, dragY);
    });
    card.on("drop", (_pointer: Phaser.Input.Pointer, dropZone: Phaser.GameObjects.Zone) => {
      this.handleHeldItemDrop(sourceArea, sourceIndex, dropZone);
    });
    card.on("dragend", () => {
      if (card.active) card.setPosition(x, y);
    });
    return this.track(card);
  }

  private createDraggableOffer(
    x: number,
    y: number,
    item: OfferedItem
  ): Phaser.GameObjects.Container {
    const background = this.add
      .rectangle(0, 0, SLOT_WIDTH, SLOT_HEIGHT, 0x433b24, 1)
      .setStrokeStyle(2, 0xffdd77);
    const text = this.add
      .text(0, -8, itemDetailsLabel(item), {
        fontSize: "12px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: SLOT_WIDTH - 16 },
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(0, 25, "Drag to board or storage", { fontSize: "9px", color: "#c5b777" })
      .setOrigin(0.5);
    const card = this.add
      .container(x, y, [background, text, hint])
      .setSize(SLOT_WIDTH, SLOT_HEIGHT);
    card.setInteractive({ useHandCursor: true });
    this.input.setDraggable(card);
    card.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      card.setPosition(dragX, dragY);
    });
    card.on("drop", (_pointer: Phaser.Input.Pointer, dropZone: Phaser.GameObjects.Zone) => {
      this.handleOfferDrop(item, dropZone);
    });
    card.on("dragend", () => {
      if (card.active) card.setPosition(x, y);
    });
    return this.track(card);
  }

  private handleOfferDrop(item: OfferedItem, dropZone: Phaser.GameObjects.Zone): void {
    if (this.currentOffer !== item) return;
    const area = dropZone.getData("area") as "board" | "storage";
    const index = dropZone.getData("index") as number;

    if (area === "storage") {
      if (this.build.storage[index] !== null) return;
      this.build = addItemToStorage(this.build, item, index);
    } else {
      this.build = this.build.board[index]
        ? evictAndAdd(this.build, index, item)
        : addItem(this.build, item, index);
    }
    this.currentOffer = null;
    this.renderRound();
  }

  private handleHeldItemDrop(
    sourceArea: "board" | "storage",
    sourceIndex: number,
    dropZone: Phaser.GameObjects.Zone
  ): void {
    const targetArea = dropZone.getData("area") as "board" | "storage";
    const targetIndex = dropZone.getData("index") as number;
    if (sourceArea === targetArea) return;

    if (sourceArea === "board") {
      if (this.build.storage[targetIndex] !== null) return;
      this.build = moveToStorage(this.build, sourceIndex, targetIndex);
    } else if (this.build.board[targetIndex] === null) {
      this.build = moveToBoard(this.build, sourceIndex, targetIndex);
    } else {
      this.build = swapBoardStorage(this.build, targetIndex, sourceIndex);
    }
    this.renderRound();
  }

  private refreshOffer(): void {
    if (this.refreshesRemaining <= 0 || !this.currentOffer) return;
    this.refreshesRemaining -= 1;
    this.currentOffer = this.drawOffer();
    this.renderRound();
  }

  private nextRound(): void {
    this.round += 1;
    this.refreshesRemaining = 1;
    this.currentOffer = this.round < OFFER_ROUNDS ? this.drawOffer() : null;
    this.renderRound();
  }

  private drawOffer(): OfferedItem {
    return drawItem(ITEM_POOL, ACTIVE_IDENTITY_TAG, TAG_WEIGHT, Math.random);
  }

  private createControl(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    options: { enabled?: boolean } = {}
  ): Phaser.GameObjects.Text {
    const enabled = options.enabled ?? true;
    const control = this.add
      .text(x, y, label, {
        fontSize: "15px",
        color: enabled ? "#ffffff" : "#69737a",
        backgroundColor: enabled ? "#303a40" : "#20262a",
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5);
    if (enabled) {
      control.setInteractive({ useHandCursor: true });
      control.on("pointerdown", onClick);
    }
    return this.track(control);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.roundObjects.push(object);
    return object;
  }
}
