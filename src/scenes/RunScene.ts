import Phaser from "phaser";
import {
  chooseEncounter,
  selectSponsorOption,
  type SponsorMeetingPayload,
  type SponsorOption,
} from "../simulation/encounters";
import {
  canEnterEntrantSelection,
  createUnavailableRun,
  runIdentityForEntrant,
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
  addHeaderBand,
  addPaperPanel,
  createDemoButton,
  DISPLAY_FONT,
  UI_FONT,
} from "./demoTheme";
import { configureHiDpiScene, LOGICAL_WIDTH } from "./layout";
import { worldTourItineraryModel } from "./worldTourPresentation";

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
    return Array.isArray(run.stages) && run.stages.length === 12 && Array.isArray(run.history);
  }

  private render(): void {
    const model = runPresentation(this.run);
    const width = LOGICAL_WIDTH;
    addDemoBackdrop(this, this.run.activeEncounter?.type === "sponsor-meeting"
      ? "scene-sponsor-negotiation" : "scene-route-headquarters", 0.58);
    addHeaderBand(this);
    this.add.text(width / 2, 36, "1901 Auto Race Championship", {
      fontSize: "24px",
      fontFamily: DISPLAY_FONT,
      fontStyle: "bold",
      color: "#f4d58d",
    }).setOrigin(0.5);
    this.add.text(width / 2, 78, `${model.progressLabel}  ·  ${model.creditsLabel}  ·  ${model.reputationLabel}`, {
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
      this.add.text(width / 2, 115, "Run Summary", {
        fontSize: "21px",
        color: "#ffffff",
      }).setOrigin(0.5);
      model.history.forEach((entry, index) => {
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
      model.history.forEach((entry, index) => {
        this.add.text(70, 165 + index * 36, this.historyEntryLabel(entry), {
          fontSize: "11px",
          color: entry.type === "pvp" ? "#8fd8ff" : "#d7e1e6",
          wordWrap: { width: width - 140 },
        });
      });
      this.addControl(width / 2, 405, "Choose Entrant · New Run", () => this.startNewRun());
      return;
    }

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

    this.run.stages.forEach((stage, index) => {
      this.add.text(75 + index * 130, 120, `${stage.position}. ${stage.kind.toUpperCase()}\n${stage.state}`, {
        fontSize: "11px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: stage.state === "completed" ? "#82c9aa" : stage.state === "unavailable" ? "#68747c" : "#d9483f",
        align: "center",
      }).setOrigin(0.5);
    });

    this.add.text(24, 145, `${model.remainingStages} stages remaining`, {
      fontSize: "11px",
      color: "#9eb5c9",
    });

    if (model.history.length > 0) {
      const path = model.history.map((entry) => `${entry.stagePosition}. ${entry.type.replace(/-/g, " ")}`).join("  >  ");
      this.add.text(width / 2, 365, path, {
        fontSize: "10px",
        color: "#9eb5c9",
        align: "center",
        wordWrap: { width: width - 60 },
      }).setOrigin(0.5);
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
      this.addControl(width / 2, 220, `Enter ${this.run.activeEncounter.payload.kind === "pvp" ? this.run.activeEncounter.payload.lapCount : ""}-lap PvP`, () => {
        this.scene.start("PreRaceScene", { run: this.run, encounterId: this.run.activeEncounter!.id });
      });
      this.addControl(width / 2, 285, "TEST DAY · UNSCORED", () => this.openTestDay("pvp-briefing"));
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

    model.choices.forEach((choice, index) => {
      const x = width * (index === 0 ? 0.3 : 0.7);
      addPaperPanel(this, x, 250, 292, 174, 0.88);
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
      this.addControl(x, 315, "Enter", () => this.selectChoice(choice.id));
    });
    this.addControl(width / 2, 395, "TEST DAY · UNSCORED", () => this.openTestDay("run-hub"));
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
    if (option.objective.kind === "win-next-race") return "Win the next race\n7 credits";
    if (option.objective.kind === "target-race-time") {
      return `Finish in ${option.objective.targetSeconds}s or less\n7 credits`;
    }
    return `Trigger ${option.objective.tag} items ${option.objective.requiredEvents} times\n7 credits`;
  }

  private historyEntryLabel(entry: RunHistorySummary): string {
    const parts = [`${entry.stagePosition}. ${entry.type.replace(/-/g, " ")}`];
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

  private addControl(x: number, y: number, label: string, action: () => void): void {
    createDemoButton(this, x, y, label, action);
  }
}
