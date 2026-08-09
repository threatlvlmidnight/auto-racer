import Phaser from "phaser";
import { ITEM_POOL } from "../content/sample-data";
import {
  acceptReward,
  declineReward,
  leaveSupplier,
  purchaseStock,
  restockSupplier,
  type PartsSupplierPayload,
  type RewardDraftPayload,
} from "../simulation/encounters";
import { RunTransitionError, type Run } from "../simulation/run";
import {
  commitGarageCommand,
  previewGarageCommand,
  type GarageDestination,
  type GarageReplacement,
  type GarageSource,
} from "../simulation/garage";
import type { OfferedItem } from "../simulation/types";
import type { PracticeOriginInput, ProtectedPreparationOrigin } from "../simulation/practice";
import {
  garageSlotModels,
  garageStorageModels,
  garageVehicleHeader,
} from "./garagePresentation";
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
  private statusMessage: string | null = null;

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
    this.statusMessage = null;
    if (run.activeEncounter.type !== "reward-draft" && run.activeEncounter.type !== "parts-supplier") {
      this.scene.start("RunScene", { run });
      return;
    }
    addDemoBackdrop(this, "workshop", 0.7);
    addHeaderBand(this);
    this.add.image(400, 303, `vehicle-${run.identity.vehicleId}`).setDisplaySize(360, 180).setAlpha(0.1);
    this.render();
  }

  private render(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
    const run = this.run!;
    const encounter = run.activeEncounter!;
    const supplier = encounter.type === "parts-supplier";
    const header = garageVehicleHeader(run.identity);
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
    this.renderSlots(header.label, header.topologyLabel);
    this.renderStorage(header.storageLabel);

    if (this.statusMessage) {
      this.track(this.add.text(this.scale.width / 2, STORAGE_Y + SLOT_HEIGHT / 2 + 22, this.statusMessage, {
        fontSize: "12px",
        fontFamily: UI_FONT,
        color: "#d9a7a7",
        align: "center",
        wordWrap: { width: this.scale.width - 80 },
      }).setOrigin(0.5));
    }
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
      const destination = zone.getData("destination") as GarageDestination;
      this.acquireOffer(offerId, destination);
    });
    card.on("dragend", () => {
      if (card.active) card.setPosition(x, y);
    });
  }

  /** Acquisition only targets an open destination; a full replace/evict flow for
   *  offers is not yet implemented, so an occupied target is reported, not silently
   *  dropped. */
  private acquireOffer(offerId: string, destination: GarageDestination): void {
    const encounter = this.run!.activeEncounter!;
    try {
      if (encounter.type === "reward-draft") {
        const next = acceptReward(this.run!, encounter.id, offerId, destination, Math.random);
        this.scene.start("RunScene", { run: next });
        return;
      }
      this.run = purchaseStock(this.run!, encounter.id, offerId, destination);
      this.statusMessage = null;
      this.render();
    } catch (error) {
      if (!(error instanceof RunTransitionError)) throw error;
      this.statusMessage = "That position is occupied — move or store the current item first.";
      this.render();
    }
  }

  private renderSlots(label: string, topologyLabel: string): void {
    const slots = garageSlotModels(this.run!.build);
    // The vehicle row holds four slots (feature 010), which no longer fit at the
    // original fixed width. Size slots to the available canvas so no slot is
    // clipped at either edge, capped so the three-slot storage row is unchanged.
    const margin = 24;
    const available = this.scale.width - margin * 2;
    const slotWidth = Math.min(
      SLOT_WIDTH,
      Math.floor((available - (slots.length - 1) * SLOT_GAP) / slots.length),
    );
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * SLOT_GAP;
    const startX = (this.scale.width - totalWidth) / 2 + slotWidth / 2;
    this.track(this.add.text(startX - slotWidth / 2, BOARD_Y - SLOT_HEIGHT / 2 - 24, `${label} · ${topologyLabel}`, {
      fontSize: "13px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#ffdd77",
    }));
    slots.forEach((slot, index) => {
      const x = startX + index * (slotWidth + SLOT_GAP);
      const destination: GarageDestination = { area: "vehicle", slotId: slot.slotId };
      const zone = this.add.zone(x, BOARD_Y, slotWidth, SLOT_HEIGHT).setRectangleDropZone(slotWidth, SLOT_HEIGHT);
      zone.setData("destination", destination);
      this.track(zone);
      this.track(this.add.rectangle(x, BOARD_Y, slotWidth, SLOT_HEIGHT, slot.occupied ? 0x263640 : 0x171d21)
        .setStrokeStyle(2, slot.occupied ? 0x6f91a8 : 0x45515a));
      this.track(this.add.text(x - slotWidth / 2 + 6, BOARD_Y - SLOT_HEIGHT / 2 - 9, slot.typeLabel, {
        fontSize: "9px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#9eb5c9",
      }));
      const item = this.run!.build.slots[index].item;
      if (item) {
        this.createHeldItem(x, BOARD_Y, item, { area: "vehicle", slotId: slot.slotId }, slotWidth, slot.installationLabel);
      } else {
        this.track(this.add.text(x, BOARD_Y, `Empty ${slot.typeLabel.toLowerCase()} slot`, {
          fontSize: "11px",
          fontFamily: UI_FONT,
          color: "#839b98",
        }).setOrigin(0.5));
      }
    });
  }

  private renderStorage(label: string): void {
    const positions = garageStorageModels(this.run!.build);
    const margin = 24;
    const available = this.scale.width - margin * 2;
    const slotWidth = Math.min(
      SLOT_WIDTH,
      Math.floor((available - (positions.length - 1) * SLOT_GAP) / positions.length),
    );
    const totalWidth = positions.length * slotWidth + (positions.length - 1) * SLOT_GAP;
    const startX = (this.scale.width - totalWidth) / 2 + slotWidth / 2;
    this.track(this.add.text(startX - slotWidth / 2, STORAGE_Y - SLOT_HEIGHT / 2 - 24, label, {
      fontSize: "13px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#9eb5c9",
    }));
    positions.forEach((position, index) => {
      const x = startX + index * (slotWidth + SLOT_GAP);
      const destination: GarageDestination = { area: "storage", index: position.index };
      const zone = this.add.zone(x, STORAGE_Y, slotWidth, SLOT_HEIGHT).setRectangleDropZone(slotWidth, SLOT_HEIGHT);
      zone.setData("destination", destination);
      this.track(zone);
      this.track(this.add.rectangle(x, STORAGE_Y, slotWidth, SLOT_HEIGHT, position.occupied ? 0x263640 : 0x171d21)
        .setStrokeStyle(2, position.occupied ? 0x6f91a8 : 0x45515a));
      const item = this.run!.build.storage[index].item;
      if (item) {
        this.createHeldItem(
          x,
          STORAGE_Y,
          item,
          { area: "storage", index: position.index },
          slotWidth,
          position.storageActive ? "Active while stored" : null,
        );
      } else {
        this.track(this.add.text(x, STORAGE_Y, `Empty storage ${index + 1}`, {
          fontSize: "11px",
          fontFamily: UI_FONT,
          color: "#839b98",
        }).setOrigin(0.5));
      }
    });
  }

  private createHeldItem(
    x: number,
    y: number,
    item: OfferedItem,
    source: GarageSource,
    slotWidth: number,
    stateLabel: string | null,
  ): void {
    const card = createItemCard(this, x, y, item, { width: slotWidth - 16, height: SLOT_HEIGHT - 8 })
      .setInteractive({ useHandCursor: true });
    this.track(card);
    enableItemTooltip(this, card, item);
    if (stateLabel) {
      this.track(this.add.text(x, y + SLOT_HEIGHT / 2 - 3, stateLabel, {
        fontSize: "9px",
        fontFamily: UI_FONT,
        color: "#9eb5c9",
      }).setOrigin(0.5, 1));
    }
    this.input.setDraggable(card);
    card.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => card.setPosition(dragX, dragY));
    card.on("drop", (_pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Zone) => {
      const destination = zone.getData("destination") as GarageDestination;
      this.moveHeldItem(source, destination);
    });
    card.on("dragend", () => {
      if (card.active) card.setPosition(x, y);
    });
  }

  /** Rearranging items already on the vehicle or in storage never loses one —
   *  an occupied destination swaps rather than requiring a replace/evict choice. */
  private moveHeldItem(source: GarageSource, destination: GarageDestination): void {
    const build = this.run!.build;
    const preview = previewGarageCommand({ build }, { source, destination, replacement: "none" });
    if (preview.reason && preview.reason !== "requires-confirmation") return;
    const replacement: GarageReplacement = preview.occupant ? "swap" : "none";
    const result = commitGarageCommand({ build }, { source, destination, replacement });
    if (result.kind !== "committed") return;
    this.run = { ...this.run!, build: result.build };
    this.statusMessage = null;
    this.render();
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
