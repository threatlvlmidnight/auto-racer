import Phaser from "phaser";
import { entrantById } from "../content/entrants";
import {
  acceptReward,
  declineReward,
  leaveSupplier,
  purchaseStock,
  restockSupplier,
  sellHeldItem,
  toggleLock,
  type PartsSupplierPayload,
  type RewardDraftPayload,
  type CrossPollinationPayload,
  type StockEntry,
} from "../simulation/encounters";
import { RunTransitionError, type Run } from "../simulation/run";
import {
  commitGarageCommand,
  previewGarageCommand,
  type GarageDestination,
  type GarageReplacement,
  type GarageSource,
} from "../simulation/garage";
import type { OfferedItem, SlotType } from "../simulation/types";
import type { PracticeOriginInput, ProtectedPreparationOrigin } from "../simulation/practice";
import type { DuplicateResolution } from "../simulation/tiering";
import {
  garageItemInspector,
  garageSlotModels,
  garageStorageModels,
  garageVehicleHeader,
  previewAcquisitionResolution,
  type GarageItemInspector,
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

/** Pre-commit outcome text for an offer that duplicates a held item (016-duplicate-item-tiering FR-011). */
function resolutionOutcomeLabel(resolution: DuplicateResolution): string | null {
  if (resolution.kind === "tier-upgrade") return `Upgrades to ★${resolution.toTier}`;
  if (resolution.kind === "max-tier-convert") return `Converts to +${resolution.creditsGained} credits`;
  return null;
}

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
    if (run.activeEncounter.type !== "reward-draft"
      && run.activeEncounter.type !== "cross-pollination"
      && run.activeEncounter.type !== "parts-supplier") {
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
    const guestPayload = encounter.type === "cross-pollination"
      ? encounter.payload as CrossPollinationPayload
      : null;
    const guestName = guestPayload ? entrantById(guestPayload.guestEntrantId)?.name : null;
    const title = supplier ? "Parts Supplier"
      : guestPayload ? `Guest Workshop · ${guestName ?? guestPayload.guestEntrantId}` : "Reward Draft";
    this.track(this.add.text(this.scale.width / 2, 54, title, {
      fontSize: "22px",
      fontFamily: DISPLAY_FONT,
      fontStyle: "bold",
      color: "#f3e5bd",
    }).setOrigin(0.5).setDepth(20));

    if (supplier) this.renderSupplier(encounter.payload as PartsSupplierPayload);
    else this.renderReward(encounter.payload as RewardDraftPayload | CrossPollinationPayload);
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

  private renderReward(payload: RewardDraftPayload | CrossPollinationPayload): void {
    payload.offers.forEach((offer, index) => {
      const resolution = previewAcquisitionResolution(this.run!.build, offer.item);
      this.createDraggableOffer(170 + index * 230, 95, offer.id, offer.item, true, false, resolution);
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
      const x = 170 + index * 230;
      const affordable = entry.item.price <= this.run!.credits;
      const resolution = previewAcquisitionResolution(this.run!.build, entry.item);
      this.createDraggableOffer(x, 95, entry.id, entry.item, entry.state === "available" && affordable, entry.state === "purchased", resolution);
      if (entry.state === "available") this.createLockToggle(x, entry);
    });
    this.createControl(300, 170, payload.restockUsed ? "Restock used" : "Restock · 1 credit", () => {
      this.run = restockSupplier(this.run!, this.run!.activeEncounter!.id, Math.random);
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
    resolution: DuplicateResolution,
  ): void {
    const background = this.add.rectangle(0, 0, SLOT_WIDTH, 84, purchased ? 0x26352f : 0x433b24)
      .setStrokeStyle(2, enabled ? 0xffdd77 : 0x5d666b);
    const itemCard = createItemCard(this, 0, -10, item, { width: SLOT_WIDTH - 18, height: 48, iconSize: 40 });
    const outcome = resolutionOutcomeLabel(resolution);
    const status = purchased ? "Purchased" : `${item.price} credits${enabled ? "" : " · unavailable"}`;
    const label = this.add.text(0, 29, outcome ? `${status} · ${outcome}` : status, {
      fontSize: "11px",
      fontFamily: UI_FONT,
      color: purchased ? "#74c69d" : enabled ? "#ffe39a" : "#858f95",
    }).setOrigin(0.5);
    const card = this.add.container(x, y, [background, itemCard, label]).setSize(SLOT_WIDTH, 84);
    this.track(card);
    enableItemTooltip(this, card, item, this.offerInspectorText(item));
    if (!enabled) return;
    card.setInteractive({ useHandCursor: true });
    card.on("pointerdown", () => { this.selectedOfferId = offerId; });
    if (resolution.kind === "new") {
      this.input.setDraggable(card);
      card.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => card.setPosition(dragX, dragY));
      card.on("drop", (_pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Zone) => {
        const destination = zone.getData("destination") as GarageDestination;
        this.acquireOffer(offerId, destination);
      });
      card.on("dragend", () => {
        if (card.active) card.setPosition(x, y);
      });
    } else {
      // A tier-upgrade/max-tier-convert resolution has no destination
      // (016-duplicate-item-tiering contract §5) — a tap resolves it directly.
      card.on("pointerup", () => this.acquireOffer(offerId));
    }
  }

  /** Reroll-scoping toggle (015-economy-depth US4) — only meaningful for a
   *  still-available offer; a purchased one is already reroll-exempt. */
  private createLockToggle(x: number, entry: StockEntry): void {
    const label = this.add
      .text(x + SLOT_WIDTH / 2 - 4, 95 - 42 + 3, entry.locked ? "LOCKED" : "LOCK", {
        fontSize: "8px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: entry.locked ? "#7cfc00" : "#d8b45a",
        backgroundColor: "#171d21",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.track(label);
    label.on("pointerdown", (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.run = toggleLock(this.run!, this.run!.activeEncounter!.id, entry.id);
      this.render();
    });
  }

  /** Acquisition only targets an open destination; a full replace/evict flow for
   *  offers is not yet implemented, so an occupied target is reported, not silently
   *  dropped. `destination` is omitted entirely for a tier-upgrade/max-tier-convert
   *  resolution (016-duplicate-item-tiering), which has no destination at all. */
  private acquireOffer(offerId: string, destination?: GarageDestination): void {
    const encounter = this.run!.activeEncounter!;
    try {
      if (encounter.type === "reward-draft" || encounter.type === "cross-pollination") {
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
        this.createHeldItem(x, BOARD_Y, item, { area: "vehicle", slotId: slot.slotId }, slotWidth, slot.installationLabel, slot.slotType, this.run!.build.slots[index].tier);
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
          null,
          this.run!.build.storage[index].tier,
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
    slotType: SlotType | null,
    tier: 1 | 2 | 3,
  ): void {
    const card = createItemCard(this, x, y, item, { width: slotWidth - 16, height: SLOT_HEIGHT - 8 })
      .setInteractive({ useHandCursor: true });
    this.track(card);
    enableItemTooltip(this, card, item, this.inspectorText(garageItemInspector(item, slotType, this.run!.credits, this.run!.build)));
    if (tier > 1) {
      this.track(this.add.text(x - slotWidth / 2 + 4, y - SLOT_HEIGHT / 2 + 3, `★${tier}`, {
        fontSize: "10px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#ffdd77",
        backgroundColor: "#171d21",
        padding: { x: 3, y: 1 },
      }).setOrigin(0, 0));
    }
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

    if (source.area === "vehicle" || source.area === "storage") {
      const sellLabel = this.add
        .text(x + slotWidth / 2 - 4, y - SLOT_HEIGHT / 2 + 3, `SELL +${Math.floor(item.price / 2)}`, {
          fontSize: "8px",
          fontFamily: UI_FONT,
          fontStyle: "bold",
          color: "#d8b45a",
          backgroundColor: "#171d21",
          padding: { x: 3, y: 1 },
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });
      this.track(sellLabel);
      sellLabel.on("pointerdown", (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.sellHeldItemAt(source);
      });
    }
  }

  private sellHeldItemAt(source: Extract<GarageSource, { area: "vehicle" | "storage" }>): void {
    try {
      this.run = sellHeldItem(this.run!, this.run!.activeEncounter!.id, source);
      this.statusMessage = null;
      this.render();
    } catch (error) {
      if (!(error instanceof RunTransitionError)) throw error;
      this.statusMessage = "That item could not be sold.";
      this.render();
    }
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

  /** Shared lines every inspector tooltip shows regardless of destination. */
  private inspectorText(inspector: GarageItemInspector): string {
    const effectLine = inspector.tier > 1
      ? `${inspector.effectiveEffectLabel} (★${inspector.tier}, base ${inspector.baseEffectLabel}) · ${inspector.cooldownLabel}`
      : `${inspector.baseEffectLabel} · ${inspector.cooldownLabel}`;
    const lines = [
      `${inspector.name} [${inspector.originLabel} · ${inspector.categoryLabel}]`,
      effectLine,
      `${inspector.priceLabel}${inspector.affordable ? "" : " · unaffordable"} · ${inspector.storageBehaviorLabel}`,
    ];
    if (inspector.installationState) {
      lines.push(`Installation: ${inspector.installationState}`);
      if (inspector.gainedBehaviorLabel) lines.push(inspector.gainedBehaviorLabel);
      if (inspector.lostBehaviorLabel) lines.push(`Loses: ${inspector.lostBehaviorLabel}`);
      if (inspector.noAdditionalConsequenceLabel) lines.push(inspector.noAdditionalConsequenceLabel);
    }
    inspector.synergyEffects.forEach((effect) => {
      lines.push(`${effect.targetLabel} synergy: ${effect.currentValueLabel}`);
    });
    return lines.join("\n");
  }

  /** An offer has no destination yet, so both possible installation outcomes
   *  are disclosed up front instead of resolving just one. */
  private offerInspectorText(item: OfferedItem): string {
    const base = this.inspectorText(garageItemInspector(item, null, this.run!.credits, this.run!.build));
    return `${base}\n${item.fittedBehavior.description}\n${item.improvisedBehavior.description}`;
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }
}
