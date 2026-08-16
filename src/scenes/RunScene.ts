import Phaser from "phaser";
import {
  chooseEncounter,
  confirmVarietyEncounterAction,
  previewVarietyEncounterAction,
  restockTagSpecialist,
  selectTagSpecialistTag,
  type TagSpecialistPayloadData,
  selectSponsorOption,
  type SponsorMeetingPayload,
  type SponsorOption,
} from "../simulation/encounters";
import { allItemDefinitions } from "../simulation/itemPools";
import { offeredModificationsFor } from "../simulation/itemModifications";
import {
  canEnterEntrantSelection,
  createUnavailableRun,
  runIdentityForEntrant,
  validateRunScheduleCompatibility,
  type Run,
  type RunHistorySummary,
} from "../simulation/run";
import { createEmptyVehicleBuild } from "../simulation/build";
import type { RunIdentity } from "../simulation/types";

/**
 * Identity used only to construct the *unavailable* placeholder run, which
 * exists to render a recovery screen and is never played. Real runs always
 * carry the entrant the player confirmed.
 */
const UNAVAILABLE_IDENTITY: RunIdentity = runIdentityForEntrant("evelyn-mercer")!;
import type { PracticeOriginInput } from "../simulation/practice";
import { runPresentation, runRoute } from "./runPresentation";
import {
  addDemoBackdrop,
  createDemoButton,
  DISPLAY_FONT,
  UI_FONT,
  type DemoButtonOptions,
} from "./demoTheme";
import { configureHiDpiScene, LOGICAL_WIDTH } from "./layout";
import { championshipProgressModel, worldTourItineraryModel } from "./worldTourPresentation";
import { createRunEncounterCard, createRunLegPlaque, runLegVisualState } from "./runChrome";
import { encounterTypeView } from "./encounterPresentation";

export class RunScene extends Phaser.Scene {
  private run!: Run;

  constructor() {
    super("RunScene");
  }

  create(data: { run?: Run; unavailable?: boolean } = {}): void {
    configureHiDpiScene(this);
    // A run only ever arrives here already created by entrant confirmation
    // (feature 010 US1). Reaching the hub with no run is not a cue to invent
    // one — it routes back to deliberate selection.
    if (!data.unavailable && !data.run) {
      this.scene.start("EntrantSelectScene");
      return;
    }

    this.run = data.unavailable || (data.run && !this.isUsableRun(data.run))
      ? createUnavailableRun({
          runId: "unavailable-run",
          seed: 0,
          identityTag: "performance",
          identity: UNAVAILABLE_IDENTITY,
          build: createEmptyVehicleBuild(UNAVAILABLE_IDENTITY.vehicleId),
        })
      : data.run!;
    this.render();
  }

  /**
   * The only route back to a new run: an explicit player action that leads to
   * entrant selection. Completing or abandoning a run never creates or
   * preselects a replacement entrant (spec FR-033).
   */
  private startNewRun(): void {
    const guard = canEnterEntrantSelection(this.run.status === "active" ? this.run : null);
    if (guard.kind === "blocked") return;
    this.scene.start("EntrantSelectScene");
  }

  private isUsableRun(run: Run): boolean {
    const schedule = validateRunScheduleCompatibility(run);
    return schedule.kind === "compatible"
      && Array.isArray(run.stages)
      && (run.worldTour?.selectedRegions.length === 0 || (run.stages.length >= 8 && run.stages.length <= 40 && run.stages.length % 8 === 0))
      && Array.isArray(run.history);
  }

  private render(): void {
    const model = runPresentation(this.run);
    const width = LOGICAL_WIDTH;
    addDemoBackdrop(this, this.run.activeEncounter?.type === "sponsor-meeting"
      ? "scene-sponsor-negotiation" : "scene-route-headquarters", 0.58);
    this.add.text(width / 2, 36, "1901 Auto Race Championship", {
      fontSize: "24px",
      fontFamily: DISPLAY_FONT,
      fontStyle: "bold",
      color: "#f4d58d",
    }).setOrigin(0.5);
    const itineraryHeader = worldTourItineraryModel(this.run)?.header;
    const progress = championshipProgressModel(this.run);
    this.add.text(width / 2, 78, `${progress.label}  ·  ${model.creditsLabel}  ·  ${model.reputationLabel}${itineraryHeader ? `  ·  ${itineraryHeader.championshipPoints}` : ""}`, {
      fontSize: "18px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#f1eee5",
    }).setOrigin(0.5);

    this.add.text(width - 24, 24, model.statusLabel, {
      fontSize: "12px",
      fontFamily: UI_FONT,
      color: model.status === "unavailable" || model.status === "failed" ? "#d9a7a7" : "#9eb5c9",
    }).setOrigin(1, 0);
    if (this.run.worldTour?.lastChanceStatus === "active") {
      this.add.text(width / 2, 101, "LAST CHANCE · THE NEXT RACE MUST RESTORE YOUR REPUTATION", {
        fontSize: "12px", fontFamily: UI_FONT, fontStyle: "bold", color: "#ffd447",
      }).setOrigin(0.5);
    } else if (this.run.reputation <= 4 && this.run.status === "active") {
      this.add.text(width / 2, 101, "LOW REPUTATION · ELIMINATION RISK", {
        fontSize: "11px", fontFamily: UI_FONT, fontStyle: "bold", color: "#e6c1bd",
      }).setOrigin(0.5);
    }

    if (this.run.status === "unavailable") {
      this.add.text(width / 2, 190, "Run unavailable", {
        fontSize: "26px",
        color: "#d9a7a7",
      }).setOrigin(0.5);
      this.add.text(width / 2, 235, "The previous run context could not be recovered.", {
        fontSize: "14px",
        color: "#c8d2d8",
      }).setOrigin(0.5);
      this.addControl(width / 2, 300, "Choose Entrant · New Run", () => this.startNewRun());
      return;
    }

    if (this.run.status === "completed") {
      const classification = this.run.worldTour?.classification;
      const classificationLabel = classification === "world-champion"
        ? "WORLD CHAMPION"
        : classification === "podium" ? "CHAMPIONSHIP PODIUM" : "CHAMPIONSHIP CLASSIFIED";
      this.add.text(width / 2, 115, classification ? classificationLabel : "Run Summary", {
        fontSize: "21px",
        color: "#ffffff",
      }).setOrigin(0.5);
      const recentHistory = model.history.slice(-7);
      recentHistory.forEach((entry, index) => {
        this.add.text(70, 150 + index * 36, this.historyEntryLabel(entry), {
          fontSize: "11px",
          color: entry.type === "pvp" ? "#8fd8ff" : "#d7e1e6",
          wordWrap: { width: width - 140 },
        });
      });
      this.addControl(width / 2, 405, "Choose Entrant · New Run", () => this.startNewRun());
      return;
    }

    if (this.run.status === "failed") {
      this.add.text(width / 2, 115, "Run Failed — Reputation Lost", {
        fontSize: "20px",
        color: "#d9a7a7",
      }).setOrigin(0.5);
      this.add.text(width / 2, 140, "The season ended early. Everything up to this point is still on record.", {
        fontSize: "12px",
        color: "#c8d2d8",
      }).setOrigin(0.5);
      model.history.slice(-7).forEach((entry, index) => {
        this.add.text(70, 165 + index * 36, this.historyEntryLabel(entry), {
          fontSize: "11px",
          color: entry.type === "pvp" ? "#8fd8ff" : "#d7e1e6",
          wordWrap: { width: width - 140 },
        });
      });
      this.addControl(width / 2, 405, "Choose Entrant · New Run", () => this.startNewRun());
      return;
    }

    this.addControl(width - 70, 396, "INVENTORY", () => {
      this.scene.start("InventoryScene", { run: this.run, host: "run-hub", returnScene: "RunScene", returnData: {} });
    }, { width: 112, height: 30, fontSize: "11px" });

    const itinerary = worldTourItineraryModel(this.run);
    if (this.run.worldTour?.phase === "awaiting-destination" && itinerary) {
      this.add.text(width / 2, 150, "WORLD CHAMPIONSHIP ITINERARY", {
        fontSize: "22px", fontFamily: DISPLAY_FONT, fontStyle: "bold", color: "#f1eee5",
      }).setOrigin(0.5);
      this.add.text(width / 2, 195, "Paris International Exhibition · FINALE LOCKED", {
        fontSize: "14px", fontFamily: UI_FONT, color: "#9eb5c9",
      }).setOrigin(0.5);
      this.add.text(width / 2, 235, "Choose from two unvisited destinations to begin the next leg.", {
        fontSize: "14px", fontFamily: UI_FONT, color: "#cddbd2",
      }).setOrigin(0.5);
      this.addControl(width / 2, 310, "CHOOSE DESTINATION", () => this.scene.start("DestinationScene", { run: this.run }));
      return;
    }

    if (itinerary && this.run.worldTour?.selectedRegions.length) {
      const currentLeg = this.run.worldTour.legs[this.run.worldTour.legs.length - 1];
      const currentLegModel = itinerary.legs.find((leg) => leg.state === "current") ?? itinerary.legs[itinerary.legs.length - 1];
      this.add.text(width / 2, 110, `CURRENT LEG · ${currentLegModel?.ordinal ?? currentLeg.ordinal}. ${currentLegModel?.name ?? currentLeg.regionId}`, {
        fontSize: "10px", fontFamily: UI_FONT, fontStyle: "bold", color: "#cddbd2",
      }).setOrigin(0.5);
      currentLeg.stages.forEach((stage, index) => {
        const x = 48 + index * 100.5;
        const visualState = runLegVisualState(stage.globalOrdinal, this.run.stageIndex);
        const label = stage.kind === "race"
          ? stage.raceKind === "local" ? "LOCAL" : "CHAMP."
          : stage.kind === "arrival" ? "ARRIVAL" : "PREP";
        const plaque = createRunLegPlaque(this, x, 137, visualState);
        if (!plaque) {
          this.add.rectangle(x, 137, 82, 34, 0xf1eee5, 0.96).setStrokeStyle(2, 0x34444a, 0.9);
        }
        this.add.text(x, 137, `${index + 1} · ${label}`, {
          fontSize: "8px", fontFamily: UI_FONT, fontStyle: "bold",
          color: visualState === "active" ? "#5a421d"
            : visualState === "completed" ? "#254838"
              : visualState === "locked" ? "#586267" : "#243238",
          align: "center",
        }).setOrigin(0.5);
      });
    } else {
      this.run.stages.forEach((stage, index) => {
        this.add.text(75 + index * 55, 132, `${stage.position}. ${stage.kind.toUpperCase()}\n${stage.state}`, {
          fontSize: "9px", fontFamily: UI_FONT, fontStyle: "bold",
          color: stage.state === "completed" ? "#82c9aa" : stage.state === "unavailable" ? "#68747c" : "#d9483f",
          align: "center",
        }).setOrigin(0.5);
      });
    }

    if (model.pendingSponsorLabel) {
      this.add.text(width / 2, 405, model.pendingSponsorLabel, {
        fontSize: "12px",
        color: "#8fd8ff",
        align: "center",
        wordWrap: { width: width - 80 },
      }).setOrigin(0.5);
    }

    if (this.run.activeEncounter?.type === "pvp") {
      const stage = this.run.stages[this.run.stageIndex];
      const raceLabel = stage.raceKind === "local" ? "LOCAL RACE" : "CHAMPIONSHIP RACE";
      this.addControl(width / 2, 245, `ENTER ${stage.lapCount}-LAP ${raceLabel}`, () => {
        this.scene.start("PreRaceScene", { run: this.run, encounterId: this.run.activeEncounter!.id });
      });
      this.addControl(width / 2, 305, "TEST DAY · UNSCORED", () => this.openTestDay("pvp-briefing"));
      return;
    }

    if (this.run.activeEncounter?.type === "sponsor-meeting") {
      const payload = this.run.activeEncounter.payload as SponsorMeetingPayload;
      this.add.text(width / 2, 170, "Sponsor Meeting", { fontSize: "22px", color: "#ffffff" }).setOrigin(0.5);
      payload.options.forEach((option, index) => {
        const x = 150 + index * 250;
        this.add.text(x, 225, this.sponsorOptionLabel(option), {
          fontSize: "13px",
          color: "#d7e1e6",
          align: "center",
          wordWrap: { width: 210 },
        }).setOrigin(0.5);
        this.addControl(x, 310, option.kind === "immediate" ? "Take 2 credits" : "Accept contract", () => {
          const next = selectSponsorOption(this.run, this.run.activeEncounter!.id, option.id, Math.random);
          this.scene.restart({ run: next });
        });
      });
      return;
    }

    if (this.run.activeEncounter) {
      this.renderVarietyEncounter();
      return;
    }

    model.choices.forEach((choice, index) => {
      const x = width * (index === 0 ? 0.3 : 0.7);
      const card = createRunEncounterCard(this, x, 250);
      if (!card) {
        this.add.rectangle(x, 250, 308, 186, 0x101b1b, 0.92).setStrokeStyle(2, 0xaab7b8, 0.85);
      }
      const choiceLabel = choice.type === "cross-pollination"
        ? "RIVAL INTEL"
        : choice.type.replace(/-/g, " ").toUpperCase();
      this.add.text(x, 200, choiceLabel, {
        fontSize: "18px",
        fontFamily: DISPLAY_FONT,
        fontStyle: "bold",
        color: "#f1eee5",
      }).setOrigin(0.5);
      this.add.text(x, 245, choice.summary, {
        fontSize: "13px",
        fontFamily: UI_FONT,
        color: "#cddbd2",
        align: "center",
        wordWrap: { width: 260 },
      }).setOrigin(0.5);
      const detail = encounterTypeView(choice.type, choice.summary);
      this.add.text(x, 275, `INPUT · ${detail.requiredInput}\nCOST · ${detail.cost}\nRESULT · ${detail.consequence}`, {
        fontSize: "8px", fontFamily: UI_FONT, color: "#9eb5c9", align: "center",
        wordWrap: { width: 270 },
      }).setOrigin(0.5);
      const enter = this.addControl(x, 326, "Enter", () => this.selectChoice(choice.id), {
        width: 112,
        height: 30,
        fontSize: "12px",
      });
      const inputTargets = enter.getData("uiChromeInputTargets") as Phaser.GameObjects.GameObject[] | undefined;
      (inputTargets ?? [enter]).forEach((target) => {
        target.on("pointerover", () => card?.setFrame("focus"));
        target.on("pointerout", () => card?.setFrame("default"));
        target.on("pointerdown", () => card?.setFrame("selected"));
      });
    });
    this.addControl(width / 2, 395, "TEST DAY · UNSCORED", () => this.openTestDay("run-hub"));
  }

  private renderVarietyEncounter(): void {
    const active = this.run.activeEncounter!;
    const width = LOGICAL_WIDTH;
    const summary = active.title ?? active.type.replace(/-/g, " ").toUpperCase();
    this.add.text(width / 2, 160, summary, {
      fontSize: "22px", fontFamily: DISPLAY_FONT, fontStyle: "bold", color: "#f1eee5",
    }).setOrigin(0.5);
    if (active.type === "exhibition-trial") {
      const trial = (active.payload as import("../simulation/run").PendingEncounterPayload).data as { objectives?: readonly { description: string; committedThreshold: number }[] } | undefined;
      this.add.text(width / 2, 215, trial?.objectives?.map((objective) =>
        `${objective.description}: ${objective.committedThreshold}`).join("\n") ?? "Objectives unavailable", {
        fontSize: "13px", fontFamily: UI_FONT, color: "#cddbd2", align: "center",
      }).setOrigin(0.5);
      this.addControl(width / 2, 305, "RUN UNSCORED EXHIBITION", () => this.startExhibition());
      this.addControl(width / 2, 350, "DECLINE", () => this.confirmVariety({ kind: "decline" }));
      return;
    }
    if (active.type === "tag-specialist") {
      const data = (active.payload as import("../simulation/run").PendingEncounterPayload).data as TagSpecialistPayloadData;
      if (!data.selectedTag) {
        this.add.text(width / 2, 205, "Choose a tag held by at least two of your parts", {
          fontSize: "13px", fontFamily: UI_FONT, color: "#cddbd2",
        }).setOrigin(0.5);
        data.qualifyingTags.slice(0, 5).forEach((tag, index) => {
          this.addControl(120 + index * 140, 270, tag.toUpperCase(), () => {
            this.scene.restart({ run: selectTagSpecialistTag(this.run, tag, Math.random) });
          }, { width: 125, fontSize: "9px" });
        });
      } else {
        this.add.text(width / 2, 195, `SELECTED TAG · ${data.selectedTag.toUpperCase()}`, {
          fontSize: "12px", fontFamily: UI_FONT, color: "#8fd8ff",
        }).setOrigin(0.5);
        data.stock.forEach((entry, index) => {
          const x = 190 + index * 210;
          this.add.text(x, 245, `${entry.item.name}\n${entry.price} credits${entry.modified ? " · MODIFIED +2" : ""}`, {
            fontSize: "11px", fontFamily: UI_FONT, color: "#d7e1e6", align: "center", wordWrap: { width: 190 },
          }).setOrigin(0.5);
          const action = { kind: "tag-purchase" as const, entryId: entry.entryId };
          const preview = previewVarietyEncounterAction(this.run, action);
          this.addControl(x, 305, preview.disabledReason ?? "PURCHASE", () => this.confirmVariety(action), {
            width: 180, fontSize: "9px",
          });
        });
        if (!data.restockUsed) {
          this.addControl(width / 2, 350, "RESTOCK ONCE", () => {
            this.scene.restart({ run: restockTagSpecialist(this.run, Math.random) });
          }, { width: 140, fontSize: "9px" });
        }
      }
      this.addControl(width / 2, 395, "LEAVE", () => this.confirmVariety({ kind: "decline" }));
      return;
    }
    const catalog = new Map(allItemDefinitions().map((item) => [item.id, item]));
    const held: { instance: import("../simulation/types").ItemInstance; slotId?: string }[] = this.run.instanceBuild
      ? [
          ...this.run.instanceBuild.slots.flatMap((slot) => slot.instance ? [{ instance: slot.instance, slotId: slot.slotId }] : []),
          ...this.run.instanceBuild.storage.flatMap((position) => position.instance ? [{ instance: position.instance }] : []),
        ]
      : [];
    this.add.text(width / 2, 190, held.length > 0 ? "Choose the exact retained item" : "No eligible retained item", {
      fontSize: "12px", fontFamily: UI_FONT, color: held.length > 0 ? "#cddbd2" : "#e6c1bd",
    }).setOrigin(0.5);
    held.slice(0, 5).forEach((entry, index) => {
      const definition = catalog.get(entry.instance.definitionId);
      if (!definition) return;
      const x = 80 + index * 160;
      let action: Parameters<typeof previewVarietyEncounterAction>[1] | null = null;
      if (active.type === "upgrade-workshop") action = { kind: "upgrade", instanceId: entry.instance.instanceId };
      if (active.type === "factory-development") {
        const modification = offeredModificationsFor(definition)[0];
        if (modification) action = { kind: "modify", instanceId: entry.instance.instanceId, modificationId: modification.modificationId };
      }
      if (active.type === "scrutineering" && entry.slotId) action = { kind: "scrutineer", slotId: entry.slotId };
      if (active.type === "privateer-exchange") {
        const replacement = allItemDefinitions().find((item) => item.origin !== definition.origin && item.id !== definition.id);
        if (replacement) action = { kind: "exchange", instanceId: entry.instance.instanceId, replacementDefinitionId: replacement.id };
      }
      if (active.type === "experimental-rebuild") {
        const replacement = allItemDefinitions().find((item) => item.installationCategory === definition.installationCategory && item.id !== definition.id);
        if (replacement) action = { kind: "rebuild", instanceId: entry.instance.instanceId, replacementDefinitionId: replacement.id };
      }
      this.add.text(x, 235, `${definition.name}\nTier ${entry.instance.tier}\n${entry.instance.instanceId}`, {
        fontSize: "9px", fontFamily: UI_FONT, color: "#d7e1e6", align: "center", wordWrap: { width: 140 },
      }).setOrigin(0.5);
      if (action) {
        const preview = previewVarietyEncounterAction(this.run, action);
        this.addControl(x, 305, preview.disabledReason ?? "CONFIRM", () => this.confirmVariety(action!), {
          width: 142, height: 34, fontSize: "8px",
        });
      }
    });
    this.addControl(width / 2, 365, "DECLINE / LEAVE", () => this.confirmVariety({ kind: "decline" }));
    if (this.run.pendingScrutineering) {
      this.add.text(width / 2, 405, `SCRUTINEERING PENDING · returns after scored stage ${this.run.pendingScrutineering.targetScoredStage}`, {
        fontSize: "10px", fontFamily: UI_FONT, color: "#8fd8ff",
      }).setOrigin(0.5);
    }
  }

  private confirmVariety(action: Parameters<typeof previewVarietyEncounterAction>[1]): void {
    const preview = previewVarietyEncounterAction(this.run, action);
    const confirmed = confirmVarietyEncounterAction(this.run, preview, Math.random);
    this.scene.restart({ run: confirmed.run });
  }

  private startExhibition(): void {
    const active = this.run.activeEncounter;
    if (!active || active.type !== "exhibition-trial") return;
    this.scene.start("ContestScene", { run: this.run, encounterId: active.id, exhibition: true });
  }

  private openTestDay(context: "run-hub" | "pvp-briefing"): void {
    const origin: PracticeOriginInput = {
      context,
      selection: context === "pvp-briefing" ? "start-race-control" : null,
      navigation: {
        viewToken: context,
        focusToken: "test-day-control",
        scrollToken: "top",
      },
    };
    this.scene.start("TestDayScene", { run: this.run, origin });
  }

  private selectChoice(choiceId: string): void {
    const next = chooseEncounter(this.run, choiceId, Math.random);
    const route = runRoute(next);
    this.scene.start(route, { run: next, encounterId: next.activeEncounter?.id });
  }

  private sponsorOptionLabel(option: SponsorOption): string {
    if (option.kind === "immediate") return "Immediate purse\n2 credits";
    if (option.objective.kind === "win-next-race") return "Win the next Championship Race\n7 credits";
    if (option.objective.kind === "target-race-time") {
      return `Finish the next Championship Race in ${option.objective.targetSeconds}s or less\n7 credits`;
    }
    return `Trigger ${option.objective.tag} items ${option.objective.requiredEvents} times\n7 credits`;
  }

  private historyEntryLabel(entry: RunHistorySummary): string {
    const stage = this.run.stages.find((candidate) => candidate.position === entry.stagePosition);
    const typeLabel = entry.type === "pvp"
      ? stage?.raceKind === "local" ? "Local Race" : "Championship Race"
      : entry.type.replace(/-/g, " ");
    const parts = [`${entry.stagePosition}. ${typeLabel}`];
    if (entry.acquisition) {
      const items = entry.acquisition.itemIds?.length
        ? `: ${entry.acquisition.itemIds.join(", ")}`
        : "";
      parts.push(`${entry.acquisition.kind}${items}${entry.acquisition.restocked ? " (restocked)" : ""}`);
    }
    if (entry.pvp) {
      parts.push(`${entry.pvp.outcome}, ${entry.pvp.lapCount} laps, gap ${entry.pvp.gap.toFixed(1)}s`);
    }
    if (entry.sponsor) {
      const target = entry.sponsor.targetSeconds !== undefined
        ? ` target ${entry.sponsor.targetSeconds}s`
        : entry.sponsor.required !== undefined
          ? ` ${entry.sponsor.actual}/${entry.sponsor.required} events`
          : ` actual ${entry.sponsor.actual}`;
      parts.push(`sponsor ${entry.sponsor.kind}${target}, ${entry.sponsor.status}, +${entry.sponsor.payout}`);
    }
    if (entry.transactions.length > 0) {
      parts.push(entry.transactions.map((transaction) =>
        `${transaction.kind} ${transaction.amount >= 0 ? "+" : ""}${transaction.amount} -> ${transaction.balanceAfter}`
      ).join(", "));
    }
    return parts.join(" · ");
  }

  private addControl(
    x: number,
    y: number,
    label: string,
    action: () => void,
    options: DemoButtonOptions = {},
  ): Phaser.GameObjects.Text {
    return createDemoButton(this, x, y, label, action, true, options);
  }
}
