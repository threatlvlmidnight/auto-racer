import Phaser from "phaser";
import { resolveContest } from "../simulation/contest";
import { installedItems } from "../simulation/slots";
import {
  buildNCarPlaybackSchedule,
  nCarFrameStateAt,
  updateLiveProjection,
  type CarProgress,
  type LiveProjectionState,
  type NCarPlaybackSchedule,
} from "../simulation/playback";
import { generateTrack, pointAtProgress } from "../simulation/tracks";
import {
  SLOT_CAPACITY,
  type NCarContestResult,
  type OfferedItem,
  type VehicleBuild,
  type LockedRaceSetup,
} from "../simulation/types";
import type { Run } from "../simulation/run";
import { createItemCard, createItemInspector } from "./itemVisuals";
import { resolvedItemEvidence, type ItemPresentationContext } from "./itemPresentation";
import { contestSceneInput, raceLapLabel } from "./runPresentation";
import { addDemoBackdrop, addRunStamp, DISPLAY_FONT, UI_FONT } from "./demoTheme";
import { configureHiDpiScene, LOGICAL_WIDTH } from "./layout";
import { recordedLapVehicleStatModel, vehicleItemLookup } from "./vehicleStatPresentation";
import { createVehicleStatPanel } from "./vehicleStatVisuals";
import { projectionPresentation } from "./raceProjectionPresentation";
import { regionalRaceBackdrop } from "./visualAssets";
import { resolveLocalField } from "../simulation/localOpponents";
import { selectEliteFinaleOpponents } from "../simulation/rivals";
import type { RivalProfile } from "../simulation/types";

const BOARD_SLOT_WIDTH = 190;
const BOARD_SLOT_HEIGHT = 58;
const BOARD_SLOT_GAP = 18;
const BOARD_Y = 406;
const SIDEBAR_X = 686;
const SIDEBAR_TOP_Y = 70;
const SIDEBAR_ROW_HEIGHT = 22;
const TRAIL_LENGTH = 6;

function tintFromHex(color: string): number {
  return parseInt(color.replace("#", ""), 16);
}

/**
 * Contest phase: resolves once, then presents the immutable result as a
 * schedule-driven watched race before handing off to ResultScene.
 * 013-race-spectacle replaces the bare-oval 2-marker presentation with a
 * real track shape, all 8 cars with a fading trail, and a live standings
 * sidebar — no playback-speed or skip control exists anywhere here (FR-009).
 */
export class ContestScene extends Phaser.Scene {
  private result?: NCarContestResult;
  private schedule?: NCarPlaybackSchedule;
  private elapsedSeconds = 0;
  private markers = new Map<string, Phaser.GameObjects.Image>();
  private trails = new Map<string, { x: number; y: number }[]>();
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private playerLapLabel?: Phaser.GameObjects.Text;
  private projectionState: LiveProjectionState = { kind: "awaiting-first-split", label: "Awaiting Lap 1 Split" };
  private projectionHeadlineText?: Phaser.GameObjects.Text;
  private projectionSplitText?: Phaser.GameObjects.Text;
  private projectionAheadText?: Phaser.GameObjects.Text;
  private projectionBehindText?: Phaser.GameObjects.Text;
  private projectionChangeText?: Phaser.GameObjects.Text;
  private tickerText?: Phaser.GameObjects.Text;
  private boardHighlights = new Map<string, Phaser.GameObjects.Rectangle>();
  private lastRenderedPlayerLapIndex = -1;
  private previousFinishedCarIds: string[] = [];
  private run?: Run;
  private encounterId?: string;
  private selectedItem?: OfferedItem;
  private itemInspector?: Phaser.GameObjects.Container;
  private playedBuild?: VehicleBuild;
  private vehicleStatPanel?: Phaser.GameObjects.Container;

  constructor() {
    super("ContestScene");
  }

  create(data: { run?: Run; encounterId?: string; setup?: LockedRaceSetup }): void {
    configureHiDpiScene(this);
    if (!data.run || !data.encounterId) {
      this.scene.start("RunScene", { unavailable: true });
      return;
    }
    let input;
    try {
      input = contestSceneInput(data.run, data.encounterId);
    } catch {
      this.scene.start("RunScene", { unavailable: true });
      return;
    }

    this.run = input.run;
    this.encounterId = input.encounterId;
    this.playedBuild = input.build;
    const authoritativeTrack = generateTrack(input.seed, input.level, input.regionId);
    const localOpponents = input.raceKind === "local" && input.regionId && input.localRaceTier && input.legOrdinal
      ? resolveLocalField(
          input.regionId,
          input.localRaceTier,
          input.legOrdinal,
          input.seed,
          authoritativeTrack,
          input.encounterId,
        )
      : undefined;
    const eliteOpponents = input.eliteFinale
      ? selectEliteFinaleOpponents([], authoritativeTrack, input.run.identity.entrantId, input.seed)
      : undefined;
    const eliteRoster: readonly RivalProfile[] | undefined = eliteOpponents?.map((opponent, index) => ({
      id: opponent.id,
      name: opponent.displayName,
      color: ["#c0524a", "#4a90c0", "#c0a34a", "#7a4ac0", "#4ac077", "#c04a9e", "#c07a4a"][index],
      vehicleId: opponent.build.vehicleId,
      levelScaling: () => ({ slotsToFill: 4, priceBias: "high" as const }),
    }));
    this.result = resolveContest(
      input.build,
      eliteRoster ?? input.rivalRoster,
      input.level,
      input.seed,
      input.lapCount,
      data.setup,
      input.encounterId,
      eliteOpponents?.map((opponent) => opponent.setup) ?? localOpponents?.map((opponent) => opponent.setup),
      eliteOpponents?.map((opponent) => opponent.build) ?? localOpponents?.map((opponent) => opponent.build),
      input.regionId,
    );
    // 027-race-legibility-integrity (contract §1): playback reads the
    // contest's own retained track — it never regenerates one independently,
    // even though generateTrack is pure and would agree given the same seed.
    this.schedule = buildNCarPlaybackSchedule(this.result, this.result.track);
    this.elapsedSeconds = 0;
    this.lastRenderedPlayerLapIndex = -1;
    this.previousFinishedCarIds = [];
    this.projectionState = { kind: "awaiting-first-split", label: "Awaiting Lap 1 Split" };
    this.trails.clear();
    this.renderTrack(installedItems(input.build), input.lapCount);
  }

  update(_time: number, delta: number): void {
    if (!this.result || !this.schedule || this.markers.size === 0) {
      return;
    }

    this.elapsedSeconds += delta / 1000;
    // 027-race-legibility-integrity Decision 9: previousStandings is always
    // null here — the retired live standings table was the only reason to
    // track it, and passing null permanently disables deriveTickerLines'
    // frame-level "took-lead" commentary without touching that shared
    // function (finish-line detection below is unaffected; it only depends
    // on previousFinishedCarIds and a freshly computed `standings`).
    const frame = nCarFrameStateAt(
      this.schedule,
      this.result,
      this.elapsedSeconds,
      this.lastRenderedPlayerLapIndex,
      null,
      this.previousFinishedCarIds,
    );
    frame.cars.forEach((car) => {
      const marker = this.markers.get(car.id);
      if (marker) this.positionMarker(car.id, marker, car.progress);
    });
    this.renderTrails();
    const player = frame.cars.find((car) => car.role === "player")!;
    this.playerLapLabel?.setText(raceLapLabel("YOU", player.progress, this.result.lapCount));
    // 027-race-legibility-integrity (US1/US2, contract §3, Decision 9): the
    // projection publishes at most once per completed player lap and holds
    // otherwise — never per-frame, unlike the retired live standings table.
    // A checkpoint change is this frame's headline news for the ticker;
    // player-fired/finished lines (still valid, immutable-evidence facts)
    // only get the ticker when no checkpoint just changed.
    const nextProjectionState = updateLiveProjection(this.projectionState, this.result, player.progress);
    if (nextProjectionState !== this.projectionState) {
      this.projectionState = nextProjectionState;
      this.renderProjection();
      const presentation = projectionPresentation(this.projectionState);
      this.tickerText?.setText([presentation.headline, presentation.changeLabel].filter(Boolean).join(" · "));
    } else if (frame.newTickerLines.length > 0) {
      const latest = frame.newTickerLines[frame.newTickerLines.length - 1];
      this.tickerText?.setText(latest.text);
    }
    this.previousFinishedCarIds = frame.cars.filter((car) => car.progress.finished).map((car) => car.id);
    if (player.progress.lapIndex !== this.lastRenderedPlayerLapIndex) {
      this.lastRenderedPlayerLapIndex = player.progress.lapIndex;
      frame.newCallouts.forEach((event) => this.flashBoardItem(event.item.id));
      this.renderItemInspector();
      this.renderVehicleStatPanel();
    }

    if (frame.allFinished) {
      const result = this.result;
      this.result = undefined;
      this.scene.start("ResultScene", {
        result,
        run: this.run,
        encounterId: this.encounterId,
      });
    }
  }

  private renderTrack(board: (OfferedItem | null)[], lapCount: number): void {
    const width = LOGICAL_WIDTH;
    const track = this.schedule!.track;
    const regionId = this.run?.stages[this.run.stageIndex]?.regionId;
    addDemoBackdrop(this, regionalRaceBackdrop(regionId), 0.22);
    addRunStamp(this, this.run!);
    this.add
      .text(width / 2, 34, "CONTEST", {
        fontSize: "28px",
        fontFamily: DISPLAY_FONT,
        fontStyle: "bold",
        color: "#f1eee5",
      })
      .setOrigin(0.5);
    this.add
      .text(SIDEBAR_X, SIDEBAR_TOP_Y - 22, "PROJECTED PACE", {
        fontSize: "12px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#d9483f",
        wordWrap: { width: LOGICAL_WIDTH - SIDEBAR_X - 16 },
      })
      .setOrigin(0.5);

    const points = track.points;
    const trackGraphics = this.add.graphics();
    trackGraphics.lineStyle(30, 0x30353a, 1);
    this.strokeClosedPath(trackGraphics, points);
    trackGraphics.lineStyle(2, 0xd5d8da, 0.8);
    this.strokeClosedPath(trackGraphics, points);
    this.add
      .text(60, 60, track.name.toUpperCase(), {
        fontSize: "11px",
        fontFamily: UI_FONT,
        color: "#839b98",
      });

    this.trailGraphics = this.add.graphics().setDepth(3);

    this.schedule!.cars.forEach((car) => {
      const marker = this.add
        .image(0, 0, car.role === "player" ? "player-vehicle" : "rival-vehicle")
        .setDisplaySize(32, 16)
        .setDepth(car.role === "player" ? 6 : 4);
      if (car.role === "rival") marker.setTint(tintFromHex(car.color));
      this.markers.set(car.id, marker);
      this.trails.set(car.id, []);
      const start: CarProgress = { lapIndex: 0, lapProgress: 0, finished: false };
      this.positionMarker(car.id, marker, start);
    });

    // 027-race-legibility-integrity (US1/US2): a fixed set of stable rows —
    // never a reordering per-car list — updated only at completed-player-lap
    // checkpoints (renderProjection), not once per animation frame.
    const sidebarWidth = LOGICAL_WIDTH - SIDEBAR_X - 16;
    const projectionRow = (index: number, options: { bold?: boolean; color?: string; size?: string } = {}) =>
      this.add.text(SIDEBAR_X, SIDEBAR_TOP_Y + index * SIDEBAR_ROW_HEIGHT, "", {
        fontSize: options.size ?? "11px",
        fontFamily: UI_FONT,
        fontStyle: options.bold ? "bold" : "normal",
        color: options.color ?? "#e6edf0",
        align: "center",
        wordWrap: { width: sidebarWidth },
      }).setOrigin(0.5);
    this.projectionHeadlineText = projectionRow(0, { bold: true, color: "#ffd447", size: "14px" });
    this.projectionSplitText = projectionRow(1.3, { color: "#9eb5c9" });
    this.projectionAheadText = projectionRow(2.3);
    this.projectionBehindText = projectionRow(3.3);
    this.projectionChangeText = projectionRow(4.3, { bold: true });
    this.renderProjection();

    this.playerLapLabel = this.add.text(60, 336, `YOU · LAP 1/${lapCount}`, {
      fontSize: "14px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#ffd447",
    });
    this.tickerText = this.add.text(width / 2, 352, "The field is underway.", {
      fontSize: "12px",
      fontFamily: UI_FONT,
      fontStyle: "italic",
      color: "#cfd8d6",
    }).setOrigin(0.5);
    this.renderBoard(board);
    this.renderVehicleStatPanel();
  }

  private positionMarker(carId: string, marker: Phaser.GameObjects.Image, progress: CarProgress): void {
    const point = pointAtProgress(this.schedule!.track, progress.lapProgress);
    marker.setPosition(point.x, point.y);
    marker.setRotation(point.headingRadians);

    const trail = this.trails.get(carId);
    if (!trail) return;
    trail.push({ x: point.x, y: point.y });
    if (trail.length > TRAIL_LENGTH) trail.shift();
  }

  private renderTrails(): void {
    const graphics = this.trailGraphics;
    if (!graphics) return;
    graphics.clear();
    this.schedule!.cars.forEach((car) => {
      const trail = this.trails.get(car.id);
      if (!trail || trail.length < 2) return;
      const color = tintFromHex(car.color);
      trail.forEach((point, index) => {
        const alpha = ((index + 1) / trail.length) * 0.35;
        graphics.fillStyle(color, alpha);
        graphics.fillCircle(point.x, point.y, 3);
      });
    });
  }

  /**
   * Renders the current `projectionState` into the five fixed sidebar rows
   * (025-vehicle-stat-display's sibling feature 027, US1/US2). Called once
   * at scene creation (Awaiting Lap 1 Split) and again only when
   * `updateLiveProjection` actually publishes a new checkpoint — never once
   * per animation frame, unlike the retired standingsAt-driven table.
   */
  private renderProjection(): void {
    const presentation = projectionPresentation(this.projectionState);
    this.projectionHeadlineText?.setText(presentation.headline);
    this.projectionSplitText?.setText(presentation.splitLabel ?? "");
    this.projectionAheadText?.setText(presentation.aheadLabel ?? "");
    this.projectionBehindText?.setText(presentation.behindLabel ?? "");
    this.projectionChangeText?.setText(presentation.changeLabel ?? "");
  }

  private strokeClosedPath(graphics: Phaser.GameObjects.Graphics, points: readonly { x: number; y: number }[]): void {
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath();
    graphics.strokePath();
  }

  private renderBoard(board: (OfferedItem | null)[]): void {
    this.boardHighlights.clear();
    const totalWidth =
      SLOT_CAPACITY * BOARD_SLOT_WIDTH + (SLOT_CAPACITY - 1) * BOARD_SLOT_GAP;
    const startX = (LOGICAL_WIDTH - totalWidth) / 2 + BOARD_SLOT_WIDTH / 2;

    this.add.text((LOGICAL_WIDTH - totalWidth) / 2, 365, "THE HIGHWHEEL · INSTALLED", {
      fontSize: "12px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#d7e4e7",
    });

    Array.from({ length: SLOT_CAPACITY }, (_, index) => board[index] ?? null).forEach(
      (item, index) => {
        const x = startX + index * (BOARD_SLOT_WIDTH + BOARD_SLOT_GAP);
        this.add
          .rectangle(x, BOARD_Y, BOARD_SLOT_WIDTH, BOARD_SLOT_HEIGHT, 0x171d21)
          .setStrokeStyle(2, item ? 0x6f91a8 : 0x45515a);

        if (!item) {
          this.add
            .text(x, BOARD_Y, `EMPTY SLOT ${index + 1}`, {
              fontSize: "11px",
              fontFamily: UI_FONT,
              color: "#839b98",
            })
            .setOrigin(0.5);
          return;
        }

        const highlight = this.add
          .rectangle(x, BOARD_Y, BOARD_SLOT_WIDTH, BOARD_SLOT_HEIGHT, 0xffd447, 0)
          .setStrokeStyle(3, 0xffe98a, 0);
        this.boardHighlights.set(item.id, highlight);
        const card = createItemCard(this, x, BOARD_Y, item, {
          width: BOARD_SLOT_WIDTH - 16,
          height: BOARD_SLOT_HEIGHT - 8,
          iconSize: 42,
        }).setInteractive({
          useHandCursor: true,
        });
        card.on("pointerdown", () => {
          this.selectedItem = item;
          this.renderItemInspector();
        });
      },
    );
  }

  private renderItemInspector(): void {
    this.itemInspector?.destroy();
    this.itemInspector = undefined;
    if (!this.selectedItem || !this.result) return;
    const player = this.result.cars.find((car) => car.role === "player");
    const lapIndex = Phaser.Math.Clamp(this.lastRenderedPlayerLapIndex, 0, Math.max(0, (player?.laps.length ?? 1) - 1));
    const physical = player?.laps[lapIndex]?.physics?.itemContributions?.find((entry) => entry.sourceItemId === this.selectedItem!.id);
    const context: ItemPresentationContext = {
      surface: "race-lap",
      tier: physical?.tier ?? 1,
      lapEvidence: physical ? resolvedItemEvidence(this.selectedItem, { kind: "physical", evidence: physical }) : undefined,
    };
    this.itemInspector = createItemInspector(this, LOGICAL_WIDTH / 2, 304, this.selectedItem, context, {
      width: LOGICAL_WIDTH - 48, height: 112,
    }).setDepth(80);
  }

  /**
   * The player's effective four-stat profile for the currently inspected lap
   * (025-vehicle-stat-display US3). Reads `PlayerLap.physics` only — never
   * recomputes physics — and refreshes at the same authoritative lap
   * boundary as the item inspector above, not once per animation frame
   * (contract §5, research.md Decision 4).
   */
  private renderVehicleStatPanel(): void {
    this.vehicleStatPanel?.destroy();
    this.vehicleStatPanel = undefined;
    if (!this.result || !this.playedBuild) return;
    const player = this.result.cars.find((car) => car.role === "player");
    if (!player) return;
    const lapIndex = Phaser.Math.Clamp(this.lastRenderedPlayerLapIndex, 0, Math.max(0, player.laps.length - 1));
    const lap = player.laps[lapIndex];
    const model = recordedLapVehicleStatModel({
      lap: lapIndex + 1,
      lapCount: this.result.lapCount,
      contextKind: "race-lap",
      physics: lap?.physics,
      itemLookup: vehicleItemLookup(this.playedBuild),
    });
    this.vehicleStatPanel = createVehicleStatPanel(this, SIDEBAR_X + 30, 315, model, {
      viewport: { width: 150, height: 120 },
    }).setDepth(70);
  }

  private flashBoardItem(itemId: string): void {
    const highlight = this.boardHighlights.get(itemId);
    if (!highlight) return;

    this.tweens.killTweensOf(highlight);
    highlight.setAlpha(0.8).setStrokeStyle(3, 0xffe98a, 1);
    this.tweens.add({
      targets: highlight,
      alpha: 0,
      duration: 650,
      ease: "Cubic.Out",
      onComplete: () => highlight.setStrokeStyle(3, 0xffe98a, 0),
    });
  }
}
