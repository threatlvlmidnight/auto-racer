import Phaser from "phaser";
import { ITEM_POOL } from "../content/sample-data";
import {
  acceptReward,
  declineReward,
  leaveSupplier,
  purchaseStock,
  restockSupplier,
  type PartsSupplierPayload,
  type PlacementCommand,
  type RewardDraftPayload,
} from "../simulation/encounters";
import type { Run } from "../simulation/run";
import { moveToBoard, moveToStorage, swapBoardStorage } from "../simulation/storage";
import type { OfferedItem } from "../simulation/types";
import type { PracticeOriginInput, ProtectedPreparationOrigin } from "../simulation/practice";
import { installedItems, storedItems } from "../simulation/slots";
import { vehicleById } from "../content/entrants";
import { createItemCard, enableItemTooltip } from "./itemVisuals";
import {
  addDemoBackdrop,
  addHeaderBand,
  addRunStamp,
  createDemoButton,
  DISPLAY_FONT,
  UI_FONT,
} from "./demoTheme";

const SLOT_WIDTH = 190;
const SLOT_HEIGHT = 66;
const SLOT_GAP = 22;
const BOARD_Y = 255;
const STORAGE_Y = 365;

export class PrepareScene extends Phaser.Scene {
  private run?: Run;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private selectedOfferId: string | null = null;

  constructor() {
    super("PrepareScene");
  }

  create(data: { run?: Run; originState?: ProtectedPreparationOrigin }): void {
    const run = data.run;
    if (!run?.activeEncounter) {
      this.scene.start("RunScene", { unavailable: true });
      return;
    }
    this.run = run;
    this.selectedOfferId = data.originState?.selection ?? null;
    if (run.activeEncounter.type !== "reward-draft" && run.activeEncounter.type !== "parts-supplier") {
      this.scene.start("RunScene", { run });
      return;
    }
    addDemoBackdrop(this, "workshop", 0.7);
    addHeaderBand(this);
    this.add.image(400, 303, "player-vehicle").setDisplaySize(360, 180).setAlpha(0.08);
    this.render();
  }

  private render(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
    const run = this.run!;
    const encounter = run.activeEncounter!;
    const supplier = encounter.type === "parts-supplier";
    // Purchases and restocks mutate credits in place and then re-render, so the
    // stamp is tracked here rather than drawn once in create() — otherwise the
    // header keeps the credit count the scene was entered with.
    addRunStamp(this, run).forEach((object) => this.track(object));
    this.track(this.add.text(this.scale.width / 2, 54, supplier ? "Parts Supplier" : "Reward Draft", {
      fontSize: "22px",
      fontFamily: DISPLAY_FONT,
      fontStyle: "bold",
      color: "#f3e5bd",
    }).setOrigin(0.5));

    if (supplier) this.renderSupplier(encounter.payload as PartsSupplierPayload);
    else this.renderReward(encounter.payload as RewardDraftPayload);
    this.createControl(680, 170, "TEST DAY", () => this.openTestDay());
    this.renderSlotRow(installedRowLabel(run), installedItems(run.build), BOARD_Y, "board");
    this.renderSlotRow("WORKSHOP STORAGE · INERT BY DEFAULT", storedItems(run.build), STORAGE_Y, "storage");
  }

  private renderReward(payload: RewardDraftPayload): void {
    payload.offers.forEach((offer, index) => {
      this.createDraggableOffer(170 + index * 230, 95, offer.id, offer.item, true, false);
    });
    this.createControl(400, 170, "Decline all", () => {
      const next = declineReward(this.run!, this.run!.activeEncounter!.id, Math.random);
      this.scene.start("RunScene", { run: next });
    });
  }

  private renderSupplier(payload: PartsSupplierPayload): void {
    if (payload.unavailable) {
      this.track(this.add.text(400, 95, "No compatible stock available", {
        fontSize: "16px",
        color: "#d9a7a7",
      }).setOrigin(0.5));
    }
    payload.stock.forEach((entry, index) => {
      const affordable = entry.item.price <= this.run!.credits;
      this.createDraggableOffer(170 + index * 230, 95, entry.id, entry.item, entry.state === "available" && affordable, entry.state === "purchased");
    });
    this.createControl(300, 170, payload.restockUsed ? "Restock used" : "Restock · 1 credit", () => {
      this.run = restockSupplier(this.run!, this.run!.activeEncounter!.id, Math.random, ITEM_POOL);
      this.render();
    }, { enabled: !payload.restockUsed && !payload.unavailable && this.run!.credits >= 1 });
    this.createControl(500, 170, "Leave Supplier", () => {
      const next = leaveSupplier(this.run!, this.run!.activeEncounter!.id, Math.random);
      this.scene.start("RunScene", { run: next });
    });
  }

  private createDraggableOffer(
    x: number,
    y: number,
    offerId: string,
    item: OfferedItem,
    enabled: boolean,
    purchased: boolean,
  ): void {
    const background = this.add.rectangle(0, 0, SLOT_WIDTH, 84, purchased ? 0x26352f : 0x433b24)
      .setStrokeStyle(2, enabled ? 0xffdd77 : 0x5d666b);
    const itemCard = createItemCard(this, 0, -10, item, { width: SLOT_WIDTH - 18, height: 48, iconSize: 40 });
    const status = purchased ? "Purchased" : `${item.price} credits${enabled ? "" : " · unavailable"}`;
    const label = this.add.text(0, 29, status, {
      fontSize: "11px",
      fontFamily: UI_FONT,
      color: purchased ? "#74c69d" : enabled ? "#ffe39a" : "#858f95",
    }).setOrigin(0.5);
    const card = this.add.container(x, y, [background, itemCard, label]).setSize(SLOT_WIDTH, 84);
    this.track(card);
    enableItemTooltip(this, card, item);
    if (!enabled) return;
    card.setInteractive({ useHandCursor: true });
    card.on("pointerdown", () => { this.selectedOfferId = offerId; });
    this.input.setDraggable(card);
    card.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => card.setPosition(dragX, dragY));
    card.on("drop", (_pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Zone) => {
      // Drop zones still carry the legacy area/index pair; translate it into the
      // garage's stable slot-id destination. The full garage rewrite is US2
      // T028/T030 — this keeps acquisition working against the new contract.
      const zoneArea = zone.getData("area") as "board" | "storage";
      const zoneIndex = zone.getData("index") as number;
      const placement: PlacementCommand = zoneArea === "storage"
        ? { area: "storage", index: zoneIndex }
        : { area: "vehicle", slotId: this.run!.build.slots[zoneIndex]?.slotId ?? "" };
      const encounter = this.run!.activeEncounter!;
      if (encounter.type === "reward-draft") {
        const next = acceptReward(this.run!, encounter.id, offerId, placement, Math.random);
        this.scene.start("RunScene", { run: next });
      } else {
        this.run = purchaseStock(this.run!, encounter.id, offerId, placement);
        this.render();
      }
    });
    card.on("dragend", () => {
      if (card.active) card.setPosition(x, y);
    });
  }

  private renderSlotRow(label: string, slots: (OfferedItem | null)[], y: number, area: "board" | "storage"): void {
    // The vehicle row now holds four slots (feature 010), which no longer fit at
    // the original fixed width. Size slots to the available canvas so no slot is
    // clipped at either edge, capped so the three-slot storage row is unchanged.
    const margin = 24;
    const available = this.scale.width - margin * 2;
    const slotWidth = Math.min(
      SLOT_WIDTH,
      Math.floor((available - (slots.length - 1) * SLOT_GAP) / slots.length),
    );
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * SLOT_GAP;
    const startX = (this.scale.width - totalWidth) / 2 + slotWidth / 2;
    this.track(this.add.text(startX - slotWidth / 2, y - SLOT_HEIGHT / 2 - 24, label, {
      fontSize: "13px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: area === "board" ? "#ffdd77" : "#9eb5c9",
    }));
    slots.forEach((item, index) => {
      const x = startX + index * (slotWidth + SLOT_GAP);
      const zone = this.add.zone(x, y, slotWidth, SLOT_HEIGHT).setRectangleDropZone(slotWidth, SLOT_HEIGHT);
      zone.setData("area", area).setData("index", index);
      this.track(zone);
      this.track(this.add.rectangle(x, y, slotWidth, SLOT_HEIGHT, item ? 0x263640 : 0x171d21)
        .setStrokeStyle(2, item ? 0x6f91a8 : 0x45515a));
      if (item) this.createHeldItem(x, y, item, area, index, slotWidth);
      else this.track(this.add.text(x, y, `Empty ${area === "board" ? "vehicle" : "storage"} slot ${index + 1}`, {
        fontSize: "11px",
        fontFamily: UI_FONT,
        color: "#839b98",
      }).setOrigin(0.5));
    });
  }

  private createHeldItem(
    x: number,
    y: number,
    item: OfferedItem,
    sourceArea: "board" | "storage",
    sourceIndex: number,
    slotWidth: number = SLOT_WIDTH,
  ): void {
    const card = createItemCard(this, x, y, item, { width: slotWidth - 16, height: SLOT_HEIGHT - 8 })
      .setInteractive({ useHandCursor: true });
    this.track(card);
    enableItemTooltip(this, card, item);
    this.input.setDraggable(card);
    card.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => card.setPosition(dragX, dragY));
    card.on("drop", (_pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Zone) => {
      const targetArea = zone.getData("area") as "board" | "storage";
      const targetIndex = zone.getData("index") as number;
      if (sourceArea === targetArea) return;
      let build = this.run!.build;
      if (sourceArea === "board") {
        if (build.storage[targetIndex]?.item != null) return;
        build = moveToStorage(build, sourceIndex, targetIndex);
      } else if (build.slots[targetIndex]?.item == null) {
        build = moveToBoard(build, sourceIndex, targetIndex);
      } else {
        build = swapBoardStorage(build, targetIndex, sourceIndex);
      }
      this.run = { ...this.run!, build };
      this.render();
    });
    card.on("dragend", () => {
      if (card.active) card.setPosition(x, y);
    });
  }

  private createControl(x: number, y: number, label: string, action: () => void, options: { enabled?: boolean } = {}): void {
    const enabled = options.enabled ?? true;
    const control = createDemoButton(this, x, y, label, action, enabled);
    this.track(control);
  }

  private openTestDay(): void {
    const encounter = this.run!.activeEncounter!;
    const context = encounter.type === "parts-supplier" ? "supplier" : "reward-draft";
    const origin: PracticeOriginInput = {
      context,
      selection: this.selectedOfferId,
      navigation: {
        viewToken: context,
        focusToken: "test-day-control",
        scrollToken: "top",
      },
    };
    this.scene.start("TestDayScene", { run: this.run, origin });
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }
}

/**
 * Names the active-build row after the run's actual named vehicle. The full
 * garage surface is feature 010 US2 (Phase 4); this keeps the label truthful
 * for whichever entrant is running rather than hardcoding one vehicle.
 */
function installedRowLabel(run: Run): string {
  const vehicle = vehicleById(run.identity.vehicleId);
  return `${(vehicle?.name ?? "VEHICLE").toUpperCase()} · INSTALLED`;
}
