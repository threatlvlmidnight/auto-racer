import Phaser from "phaser";
import { entrantById } from "../content/entrants";
import {
  acceptReward,
  declineReward,
  leaveSupplier,
  purchaseStock,
  restockSupplier,
  sellHeldItem,
  sellInventoryItem,
  invalidateSaleUndo,
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
import type { InventoryHost, OfferedItem, SlotType } from "../simulation/types";
import type { PracticeOriginInput, ProtectedPreparationOrigin } from "../simulation/practice";
import { prepareTestDayControlVisible } from "./practicePresentation";
import type { DuplicateResolution } from "../simulation/tiering";
import {
  garageInstallationPresentation,
  garageSlotModels,
  garageStorageModels,
  garageVehicleHeader,
  previewAcquisitionResolution,
} from "./garagePresentation";
import { createItemCard, createItemInspector, createPlacementComparisonInspector } from "./itemVisuals";
import { placementComparisonModel, type ItemPresentationContext } from "./itemPresentation";
import { adjustablePresentation } from "./adjustablePresentation";
import { deriveEligibleSetupControls } from "../simulation/raceSetup";
import {
  addDemoBackdrop,
  addHeaderBand,
  addRunStamp,
  createDemoButton,
  DISPLAY_FONT,
  UI_FONT,
} from "./demoTheme";
import { GARAGE_BACKDROP_BY_ENTRANT } from "./visualAssets";
import { configureHiDpiScene, LOGICAL_WIDTH } from "./layout";
import {
  currentVehicleStatModel,
  prospectiveVehicleStatModel,
  type VehicleStatPanelModel,
} from "./vehicleStatPresentation";
import { STOCK_PHYSICAL_STATS } from "../simulation/tracks";

/** Pre-commit outcome text for an offer that duplicates a held item (016-duplicate-item-tiering FR-011). */
function resolutionOutcomeLabel(resolution: DuplicateResolution): string | null {
  if (resolution.kind === "tier-upgrade") return `Upgrades to ★${resolution.toTier}`;
  if (resolution.kind === "max-tier-convert") return `Converts to +${resolution.creditsGained} credits`;
  return null;
}

const SLOT_WIDTH = 190;
const OFFER_WIDTH = 220;
const OFFER_HEIGHT = 116;
const SLOT_HEIGHT = 52;
const SLOT_GAP = 22;
const BOARD_Y = 350;
const STORAGE_Y = 420;
const INSPECTOR_Y = 260;
const INSPECTOR_HEIGHT = 92;

export class PrepareScene extends Phaser.Scene {
  private run?: Run;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private selectedOfferId: string | null = null;
  private selectedItemId: string | null = null;
  private selectedContext: ItemPresentationContext | null = null;
  private selectedSource: GarageSource | null = null;
  private statusMessage: string | null = null;
  private receiptDismissed = false;
  private keyboardItems: { card: Phaser.GameObjects.Container; activate: () => void }[] = [];
  private keyboardDestinations: { destination: GarageDestination; slotType: SlotType | null }[] = [];
  private keyboardItemIndex = -1;
  private keyboardDestinationIndex = -1;
  /** False for Cross-Pollination, whose subtitle already occupies the only gap this compact readout would use. */
  private vehicleStatSummaryVisible = false;
  private inventoryOnly = false;
  private inventoryHost: InventoryHost = "run-hub";
  private returnScene = "RunScene";
  private returnData: Readonly<Record<string, unknown>> = {};

  constructor() {
    super("PrepareScene");
  }

  create(data: {
    run?: Run;
    originState?: ProtectedPreparationOrigin;
    inventoryOnly?: boolean;
    inventoryHost?: InventoryHost;
    returnScene?: string;
    returnData?: Readonly<Record<string, unknown>>;
  }): void {
    configureHiDpiScene(this);
    const run = data.run;
    this.inventoryOnly = data.inventoryOnly === true;
    this.inventoryHost = data.inventoryHost ?? "run-hub";
    this.returnScene = data.returnScene ?? "RunScene";
    this.returnData = data.returnData ?? {};
    if (!run || (!this.inventoryOnly && !run.activeEncounter)) {
      this.scene.start("RunScene", { unavailable: true });
      return;
    }
    this.run = run;
    // Acquisition surfaces always open unselected. Returning from Test Day or
    // entering a new shop must not force the inspector over the board.
    this.selectedOfferId = null;
    this.selectedItemId = null;
    this.selectedSource = null;
    this.selectedContext = null;
    this.statusMessage = null;
    if (!this.inventoryOnly && run.activeEncounter!.type !== "reward-draft"
      && run.activeEncounter!.type !== "cross-pollination"
      && run.activeEncounter!.type !== "parts-supplier") {
      this.scene.start("RunScene", { run });
      return;
    }
    addDemoBackdrop(this, GARAGE_BACKDROP_BY_ENTRANT[run.identity.entrantId], 0.52);
    addHeaderBand(this);
    this.add.image(400, 303, `vehicle-${run.identity.vehicleId}`).setDisplaySize(360, 180).setAlpha(0.1);
    this.render();
    this.input.keyboard?.on("keydown-TAB", (event: KeyboardEvent) => {
      event.preventDefault();
      if (this.keyboardItems.length === 0) return;
      this.keyboardItemIndex = (this.keyboardItemIndex + (event.shiftKey ? -1 : 1) + this.keyboardItems.length) % this.keyboardItems.length;
      this.keyboardItems.forEach(({ card }, index) => card.setAlpha(index === this.keyboardItemIndex ? 0.78 : 1));
      this.statusMessage = `FOCUS · ${this.keyboardItems[this.keyboardItemIndex].card.getData("accessibilityLabel")}`;
    });
    this.input.keyboard?.on("keydown-SPACE", (event: KeyboardEvent) => {
      event.preventDefault();
      this.keyboardItems[this.keyboardItemIndex]?.activate();
    });
    this.input.keyboard?.on("keydown-RIGHT", () => this.navigateDestination(1));
    this.input.keyboard?.on("keydown-LEFT", () => this.navigateDestination(-1));
    this.input.keyboard?.on("keydown-ENTER", () => {
      const entry = this.keyboardDestinations[this.keyboardDestinationIndex];
      if (entry && (this.selectedOfferId || this.selectedSource)) this.commitSelectedDestination(entry.destination);
    });
    this.input.keyboard?.on("keydown-ESC", () => this.inventoryOnly ? this.closeInventory() : this.clearSelection());
  }

  private render(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
    this.keyboardItems = [];
    this.keyboardDestinations = [];
    const run = this.run!;
    const encounter = run.activeEncounter;
    if (this.inventoryOnly) {
      const header = garageVehicleHeader(run.identity);
      addRunStamp(this, run).forEach((object) => this.track(object));
      this.track(this.add.text(LOGICAL_WIDTH / 2, 42, "Inventory · Vehicle Board", {
        fontSize: "22px", fontFamily: DISPLAY_FONT, fontStyle: "bold", color: "#f1eee5",
      }).setOrigin(0.5).setDepth(20));
      this.track(this.add.text(LOGICAL_WIDTH / 2, 67, `From ${this.inventoryHost.replace(/-/g, " ")} · drag items between equipped slots and storage`, {
        fontSize: "10px", fontFamily: UI_FONT, color: "#9eb5c9",
      }).setOrigin(0.5).setDepth(20));
      this.vehicleStatSummaryVisible = true;
      this.showVehicleStatModel(currentVehicleStatModel({ build: run.build, stock: STOCK_PHYSICAL_STATS }));
      this.createControl(400, 204, "RETURN", () => this.closeInventory());
      this.renderSlots(header.label, header.topologyLabel);
      this.renderStorage(header.storageLabel);
      this.renderSelectedInspector();
      if (this.statusMessage) {
        this.track(this.add.text(LOGICAL_WIDTH / 2, STORAGE_Y + SLOT_HEIGHT / 2 + 22, this.statusMessage, {
          fontSize: "12px", fontFamily: UI_FONT, color: "#d9a7a7", align: "center",
          wordWrap: { width: LOGICAL_WIDTH - 80 },
        }).setOrigin(0.5));
      }
      return;
    }
    if (!encounter) return;
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
      : guestPayload ? `Rival Intel · ${guestName ?? guestPayload.guestEntrantId}` : "Reward Draft";
    this.track(this.add.text(LOGICAL_WIDTH / 2, 42, title, {
      fontSize: "22px",
      fontFamily: DISPLAY_FONT,
      fontStyle: "bold",
      color: "#f1eee5",
    }).setOrigin(0.5).setDepth(20));
    this.vehicleStatSummaryVisible = !guestPayload;
    if (guestPayload) {
      this.track(this.add.text(LOGICAL_WIDTH / 2, 68, "Choose one experimental part from another origin", {
        fontSize: "10px", fontFamily: UI_FONT, color: "#9eb5c9",
      }).setOrigin(0.5).setDepth(20));
    } else {
      this.showVehicleStatModel(currentVehicleStatModel({ build: this.run!.build, stock: STOCK_PHYSICAL_STATS }));
    }

    if (supplier) this.renderSupplier(encounter.payload as PartsSupplierPayload);
    else this.renderReward(encounter.payload as RewardDraftPayload | CrossPollinationPayload);
    if (prepareTestDayControlVisible(encounter.type)) {
      this.createControl(680, 204, "TEST DAY", () => this.openTestDay());
    }
    this.renderSlots(header.label, header.topologyLabel);
    this.renderStorage(header.storageLabel);
    this.renderSelectedInspector();

    if (this.statusMessage) {
      this.track(this.add.text(LOGICAL_WIDTH / 2, STORAGE_Y + SLOT_HEIGHT / 2 + 22, this.statusMessage, {
        fontSize: "12px",
        fontFamily: UI_FONT,
        color: "#d9a7a7",
        align: "center",
        wordWrap: { width: LOGICAL_WIDTH - 80 },
      }).setOrigin(0.5));
    }
  }

  /**
   * The always-visible current-vehicle readout (025-vehicle-stat-display
   * US1, FR-003/FR-004), also used to show a placement preview's prospective
   * totals (US2, FR-007) without a full scene rebuild — mirrors the existing
   * feature-024 pattern of swapping a tagged object in place on hover.
   * Reward Draft/Parts Supplier have no free vertical band tall enough for
   * the full tile panel (createVehicleStatPanel) without a broader
   * responsive rework (contract §6 defers that reflow to feature 026's
   * responsive frame); this renders the same model as one compact line in
   * the gap between the title and the offer row.
   */
  private showVehicleStatModel(model: VehicleStatPanelModel): void {
    if (!this.vehicleStatSummaryVisible) return;
    this.objects.filter((object) => object.getData?.("vehicleStatSummary") === true).forEach((object) => object.destroy());
    this.objects = this.objects.filter((object) => object.active);
    const summary = model.lines.map((line) => {
      const abbrev = line.compactLabel.slice(0, 3).toUpperCase();
      const deltaLabel = line.comparisonDeltaLabel ?? (line.stockDelta ? line.stockDeltaLabel : null);
      return `${abbrev} ${line.currentLabel}${deltaLabel && deltaLabel !== "No change" ? ` (${deltaLabel})` : ""}`;
    }).join("   ");
    const conditionalNote = model.conditionalSources.length > 0
      ? `  ·  ${model.conditionalSources.length} conditional` : "";
    const isPreview = model.context.kind === "placement-preview";
    const text = this.add.text(LOGICAL_WIDTH / 2, 59, `${isPreview ? "PREVIEW  " : ""}${summary}${conditionalNote}`, {
      fontSize: "10px",
      fontFamily: UI_FONT,
      fontStyle: isPreview ? "bold" : "normal",
      color: isPreview ? "#f0ce73" : "#d7e4e7",
    }).setOrigin(0.5).setDepth(20);
    text.setData("accessibilityLabel", model.accessibilityLabel);
    text.setData("vehicleStatSummary", true);
    this.track(text);
  }

  private renderReward(payload: RewardDraftPayload | CrossPollinationPayload): void {
    payload.offers.forEach((offer, index) => {
      const resolution = previewAcquisitionResolution(this.run!.build, offer.item);
      this.createDraggableOffer(150 + index * 250, 124, offer.id, offer.item, true, false, resolution);
    });
    this.createControl(400, 204, "SKIP REWARDS", () => {
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
      const x = 150 + index * 250;
      const affordable = entry.item.price <= this.run!.credits;
      const resolution = previewAcquisitionResolution(this.run!.build, entry.item);
      this.createDraggableOffer(x, 124, entry.id, entry.item, entry.state === "available" && affordable, entry.state === "purchased", resolution);
      if (entry.state === "available") this.createLockToggle(x, entry);
    });
    const latestReceipt = payload.receipts?.[Math.max(0, payload.receipts.length - 1)];
    if (latestReceipt && !this.receiptDismissed) {
      const detail = latestReceipt.status === "upgraded"
        ? `${latestReceipt.itemName}: Tier ${latestReceipt.oldTier} → Tier ${latestReceipt.newTier}`
        : `${latestReceipt.itemName}: purchased`;
      this.track(this.add.rectangle(LOGICAL_WIDTH / 2, INSPECTOR_Y, LOGICAL_WIDTH - 48, 60, 0x101817, 0.97)
        .setStrokeStyle(2, 0x82c9aa, 0.85));
      this.track(this.add.text(40, INSPECTOR_Y - 21, `CONFIRMED · ${detail}`, {
        fontSize: "11px", fontFamily: UI_FONT, fontStyle: "bold", color: "#82c9aa",
      }));
      if (latestReceipt.changedEffects.length > 0) {
        this.track(this.add.text(40, INSPECTOR_Y, latestReceipt.changedEffects.map((effect: { label: string; oldValue: string; newValue: string }) => `${effect.label}: ${effect.oldValue} → ${effect.newValue}`).join(" · "), {
          fontSize: "9px", fontFamily: UI_FONT, color: "#d7e4e7",
        }));
      }
      const dismiss = this.add.text(LOGICAL_WIDTH - 42, INSPECTOR_Y - 21, "DISMISS ×", {
        fontSize: "10px", fontFamily: UI_FONT, fontStyle: "bold", color: "#f1eee5",
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      dismiss.on("pointerdown", () => { this.receiptDismissed = true; this.render(); });
      this.track(dismiss);
    }
    this.createControl(300, 204, payload.restockUsed ? "Restock used" : "Restock · 1 credit", () => {
      this.run = restockSupplier(this.run!, this.run!.activeEncounter!.id, Math.random);
      this.render();
    }, { enabled: !payload.restockUsed && !payload.unavailable && this.run!.credits >= 1 });
    this.createControl(500, 204, "Leave Supplier", () => {
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
    const background = this.add.rectangle(0, 0, OFFER_WIDTH, OFFER_HEIGHT, purchased ? 0x1f3a34 : 0x152522, 0.98)
      .setStrokeStyle(2, enabled ? 0x9aa7aa : 0x4c595b);
    const context: ItemPresentationContext = {
      surface: this.run!.activeEncounter!.type === "parts-supplier" ? "supplier-offer" : "reward-offer",
      tier: 1,
      priceVisible: true,
      credits: this.run!.credits,
    };
    const encourageUpgrade = resolution.kind === "tier-upgrade";
    const itemCard = createItemCard(this, 0, -6, item, {
      width: OFFER_WIDTH - 12,
      height: 92,
      iconSize: 34,
      context,
      selected: this.selectedOfferId === offerId,
      emphasis: "offer",
      role: "offer",
      availability: enabled ? "available" : "unavailable",
      upgradeEligible: encourageUpgrade,
      upgradeReason: encourageUpgrade ? `Held duplicate upgrades to Tier ${resolution.toTier}` : null,
    });
    const outcome = resolutionOutcomeLabel(resolution);
    const status = purchased ? "Purchased" : `${item.price} credits${enabled ? "" : " · unavailable"}`;
    const label = this.add.text(0, 45, outcome ? `${status} · ${outcome}` : status, {
      fontSize: "12px",
      fontFamily: UI_FONT,
      color: purchased ? "#82c9aa" : enabled ? "#f1eee5" : "#858f95",
    }).setOrigin(0.5);
    const card = this.add.container(x, y, [background, itemCard, label]).setSize(OFFER_WIDTH, OFFER_HEIGHT);
    this.track(card);
    if (!enabled) {
      if (!purchased) {
        card.setInteractive({ useHandCursor: true });
        card.on("pointerdown", () => {
          this.statusMessage = item.price > this.run!.credits
            ? `${item.name} costs ${item.price} credits; you have ${this.run!.credits}.`
            : `${item.name} is unavailable.`;
          this.render();
        });
      }
      return;
    }
    card.setInteractive({ useHandCursor: true });
    card.on("pointerdown", () => {
      if (this.selectedOfferId === offerId) {
        this.clearSelection();
        return;
      }
      this.selectedOfferId = offerId;
      this.selectedSource = null;
      this.selectedItemId = item.id;
      this.selectedContext = context;
      this.renderSelectedInspector();
    });
    this.keyboardItems.push({ card, activate: () => {
      if (this.selectedOfferId === offerId) {
        this.clearSelection();
        return;
      }
      this.selectedOfferId = offerId;
      this.selectedSource = null;
      this.selectedItemId = item.id;
      this.selectedContext = context;
      this.renderSelectedInspector();
    } });
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
      .text(x + OFFER_WIDTH / 2 - 4, 124 - OFFER_HEIGHT / 2 + 4, entry.locked ? "LOCKED" : "LOCK", {
        fontSize: "8px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: entry.locked ? "#82c9aa" : "#d9483f",
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
      this.receiptDismissed = false;
      this.selectedOfferId = null;
      this.selectedItemId = null;
      this.selectedSource = null;
      this.selectedContext = null;
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
    const available = LOGICAL_WIDTH - margin * 2;
    const slotWidth = Math.min(
      SLOT_WIDTH,
      Math.floor((available - (slots.length - 1) * SLOT_GAP) / slots.length),
    );
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * SLOT_GAP;
    const startX = (LOGICAL_WIDTH - totalWidth) / 2 + slotWidth / 2;
    this.track(this.add.text(startX - slotWidth / 2, BOARD_Y - SLOT_HEIGHT / 2 - 24, `${label} · ${topologyLabel}`, {
      fontSize: "13px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#d7e4e7",
    }));
    slots.forEach((slot, index) => {
      const x = startX + index * (slotWidth + SLOT_GAP);
      const destination: GarageDestination = { area: "vehicle", slotId: slot.slotId };
      const zone = this.add.zone(x, BOARD_Y, slotWidth, SLOT_HEIGHT).setRectangleDropZone(slotWidth, SLOT_HEIGHT);
      zone.setData("destination", destination);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => this.previewDestination(destination, slot.slotType));
      zone.on("pointerdown", () => this.commitSelectedDestination(destination));
      this.keyboardDestinations.push({ destination, slotType: slot.slotType });
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
    const available = LOGICAL_WIDTH - margin * 2;
    const slotWidth = Math.min(
      SLOT_WIDTH,
      Math.floor((available - (positions.length - 1) * SLOT_GAP) / positions.length),
    );
    const totalWidth = positions.length * slotWidth + (positions.length - 1) * SLOT_GAP;
    const startX = (LOGICAL_WIDTH - totalWidth) / 2 + slotWidth / 2;
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
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => this.previewDestination(destination, null));
      zone.on("pointerdown", () => this.commitSelectedDestination(destination));
      this.keyboardDestinations.push({ destination, slotType: null });
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
    source: Extract<GarageSource, { area: "vehicle" | "storage" }>,
    slotWidth: number,
    stateLabel: string | null,
    slotType: SlotType | null,
    tier: 1 | 2 | 3,
  ): void {
    const context: ItemPresentationContext = {
      surface: source.area === "storage" ? "storage" : "garage-slot",
      tier,
      priceVisible: false,
      installation: garageInstallationPresentation(item, slotType),
    };
    const adjustable = adjustablePresentation({
      item,
      heldLocation: source.area === "vehicle" ? { area: "vehicle", slotId: source.slotId } : { area: "storage", index: source.index },
      eligibleControls: deriveEligibleSetupControls(this.run!.build),
    });
    const card = createItemCard(this, x, y, item, {
      width: slotWidth - 10,
      height: SLOT_HEIGHT - 4,
      iconSize: 20,
      context,
      selected: this.selectedItemId === item.id,
      adjustable,
      role: source.area === "vehicle" ? "held" : "inventory",
      availability: "available",
    })
      .setInteractive({ useHandCursor: true });
    this.track(card);
    card.on("pointerdown", () => {
      if ((this.selectedOfferId || this.selectedSource) && JSON.stringify(this.selectedSource) !== JSON.stringify(source)) {
        const destination: GarageDestination = source.area === "vehicle"
          ? { area: "vehicle", slotId: source.slotId }
          : { area: "storage", index: source.index };
        this.commitSelectedDestination(destination);
        return;
      }
      this.selectedOfferId = null;
      this.selectedSource = source;
      this.selectedItemId = item.id;
      this.selectedContext = context;
      this.renderSelectedInspector();
    });
    this.keyboardItems.push({ card, activate: () => {
      this.selectedOfferId = null;
      this.selectedSource = source;
      this.selectedItemId = item.id;
      this.selectedContext = context;
      this.renderSelectedInspector();
    } });
    if (tier > 1) {
      this.track(this.add.text(x - slotWidth / 2 + 4, y - SLOT_HEIGHT / 2 + 3, `★${tier}`, {
        fontSize: "10px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#d7e4e7",
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
          color: "#d9483f",
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
      this.run = this.inventoryOnly
        ? sellInventoryItem(this.run!, source)
        : sellHeldItem(this.run!, this.run!.activeEncounter!.id, source);
      this.selectedItemId = null;
      this.selectedSource = null;
      this.selectedContext = null;
      this.statusMessage = null;
      this.render();
    } catch (error) {
      if (!(error instanceof RunTransitionError)) throw error;
      this.statusMessage = "That item could not be sold.";
      this.render();
    }
  }

  private closeInventory(): void {
    const run = invalidateSaleUndo(this.run!);
    this.scene.start(this.returnScene, { ...this.returnData, run });
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
    this.run = invalidateSaleUndo({ ...this.run!, build: result.build });
    this.selectedSource = destination.area === "vehicle"
      ? { area: "vehicle", slotId: destination.slotId }
      : { area: "storage", index: destination.index };
    const moved = this.selectedItem();
    if (moved) {
      const slotType = destination.area === "vehicle"
        ? this.run.build.slots.find((slot) => slot.slotId === destination.slotId)?.slotType ?? null : null;
      this.selectedContext = {
        surface: destination.area === "vehicle" ? "garage-slot" : "storage",
        tier: this.selectedContext?.tier ?? 1,
        installation: garageInstallationPresentation(moved, slotType),
      };
    }
    this.statusMessage = null;
    this.render();
  }

  private previewDestination(destination: GarageDestination, slotType: SlotType | null): void {
    const item = this.selectedItem();
    if (!item || (!this.selectedOfferId && !this.selectedSource)) return;
    this.selectedContext = {
      ...(this.selectedContext ?? { surface: "placement-preview" as const }),
      surface: "placement-preview",
      installation: garageInstallationPresentation(item, slotType),
    };
    const source: GarageSource = this.selectedSource ?? { area: "offer", offerId: this.selectedOfferId! };
    const garageContext = {
      build: this.run!.build,
      offers: source.area === "offer" ? [{ id: source.offerId, item }] : undefined,
    };
    let preview = previewGarageCommand(garageContext, { source, destination, replacement: "none" });
    if (this.selectedSource && preview.occupant) {
      preview = previewGarageCommand(garageContext, { source, destination, replacement: "swap" });
    }
    if (this.selectedSource) {
      this.statusMessage = preview.reason && preview.reason !== "requires-confirmation"
        ? "That destination is unavailable."
        : `${preview.disposition.toUpperCase()} · ${this.selectedContext.installation?.stateLabel ?? "Stored"}`;
    }
    this.objects.filter((object) => object.getData?.("feature024Inspector") === true).forEach((object) => object.destroy());
    const comparison = placementComparisonModel(preview, {
      preview, incomingItem: item, outgoingItem: preview.occupant,
      incomingContext: this.selectedContext,
      outgoingContext: { surface: "placement-preview", tier: 1 },
    });
    const inspector = createPlacementComparisonInspector(this, LOGICAL_WIDTH / 2, INSPECTOR_Y, comparison, {
      width: LOGICAL_WIDTH - 48, height: INSPECTOR_HEIGHT,
    }).setDepth(75);
    inspector.setData("feature024Inspector", true);
    this.updateVehicleStatPreview(garageContext, source, destination, preview);
    this.track(inspector);
  }

  /**
   * Prospective totals reuse the exact garage commit authority (025 contract
   * §4, research.md Decision 3) — never a duplicated placement/swap/tier
   * computation. A destination that can't actually be committed as previewed
   * (e.g. an offer onto an occupied slot, which still needs an explicit
   * confirm) falls back to the current authoritative totals rather than
   * guessing (FR-009).
   */
  private updateVehicleStatPreview(
    garageContext: { build: Run["build"]; offers?: readonly { id: string; item: OfferedItem }[] },
    source: GarageSource,
    destination: GarageDestination,
    preview: ReturnType<typeof previewGarageCommand>,
  ): void {
    const replacement: GarageReplacement = preview.disposition === "swap" ? "swap" : "none";
    const commit = commitGarageCommand(garageContext, { source, destination, replacement });
    if (commit.kind !== "committed") {
      this.showVehicleStatModel(currentVehicleStatModel({ build: this.run!.build, stock: STOCK_PHYSICAL_STATS }));
      return;
    }
    const destinationLabel = destination.area === "vehicle"
      ? `Vehicle slot ${destination.slotId}` : `Storage ${destination.index + 1}`;
    this.showVehicleStatModel(prospectiveVehicleStatModel({
      currentBuild: this.run!.build,
      preview,
      prospectiveBuild: commit.build,
      destinationLabel,
      stock: STOCK_PHYSICAL_STATS,
    }));
  }

  private commitSelectedDestination(destination: GarageDestination): void {
    if (this.selectedSource) this.moveHeldItem(this.selectedSource, destination);
    else if (this.selectedOfferId) this.acquireOffer(this.selectedOfferId, destination);
  }

  private navigateDestination(direction: -1 | 1): void {
    if ((!this.selectedOfferId && !this.selectedSource) || this.keyboardDestinations.length === 0) return;
    this.keyboardDestinationIndex = (this.keyboardDestinationIndex + direction + this.keyboardDestinations.length) % this.keyboardDestinations.length;
    const entry = this.keyboardDestinations[this.keyboardDestinationIndex];
    this.previewDestination(entry.destination, entry.slotType);
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

  private selectedItem(): OfferedItem | null {
    const encounter = this.run?.activeEncounter;
    if (this.selectedOfferId && encounter) {
      const offers = encounter.type === "parts-supplier"
        ? (encounter.payload as PartsSupplierPayload).stock
        : encounter.type === "reward-draft" || encounter.type === "cross-pollination"
          ? (encounter.payload as RewardDraftPayload | CrossPollinationPayload).offers
          : [];
      const offered = offers.find((entry) => entry.id === this.selectedOfferId)?.item;
      if (offered) return offered;
    }
    if (!this.selectedItemId) return null;
    return this.run!.build.slots.find((slot) => slot.item?.id === this.selectedItemId)?.item
      ?? this.run!.build.storage.find((position) => position.item?.id === this.selectedItemId)?.item
      ?? null;
  }

  private renderSelectedInspector(): void {
    this.objects.filter((object) => object.getData?.("feature024Inspector") === true)
      .forEach((object) => object.destroy());
    this.objects = this.objects.filter((object) => object.active);
    const item = this.selectedItem();
    if (!item || !this.selectedContext) return;
    const inspector = createItemInspector(this, LOGICAL_WIDTH / 2, INSPECTOR_Y, item, this.selectedContext, {
      width: LOGICAL_WIDTH - 48,
      height: INSPECTOR_HEIGHT,
    }).setDepth(75);
    inspector.setData("feature024Inspector", true);
    this.track(inspector);
  }

  private clearSelection(): void {
    this.selectedOfferId = null;
    this.selectedSource = null;
    this.selectedItemId = null;
    this.selectedContext = null;
    this.statusMessage = null;
    this.render();
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }
}
