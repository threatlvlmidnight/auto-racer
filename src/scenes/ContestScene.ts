import Phaser from "phaser";
import { resolveContest } from "../simulation/contest";
import { installedItems } from "../simulation/slots";
import {
  buildNCarPlaybackSchedule,
  nCarFrameStateAt,
  type CarProgress,
  type NCarPlaybackSchedule,
  type RankedCar,
} from "../simulation/playback";
import { generateTrack, pointAtProgress } from "../simulation/tracks";
import {
  SLOT_CAPACITY,
  type NCarContestResult,
  type OfferedItem,
} from "../simulation/types";
import type { Run } from "../simulation/run";
import { standingsRows } from "./contestFormatting";
import { createItemCard, enableItemTooltip } from "./itemVisuals";
import { contestSceneInput, raceLapLabel } from "./runPresentation";
import { addDemoBackdrop, addRunStamp, DISPLAY_FONT, UI_FONT } from "./demoTheme";

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
  private standingsTexts: Phaser.GameObjects.Text[] = [];
  private tickerText?: Phaser.GameObjects.Text;
  private boardHighlights = new Map<string, Phaser.GameObjects.Rectangle>();
  private lastRenderedPlayerLapIndex = -1;
  private previousStandings: RankedCar[] | null = null;
  private previousFinishedCarIds: string[] = [];
  private run?: Run;
  private encounterId?: string;

  constructor() {
    super("ContestScene");
  }

  create(data: { run?: Run; encounterId?: string }): void {
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
    this.result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    const track = generateTrack(input.seed, input.level);
    this.schedule = buildNCarPlaybackSchedule(this.result, track);
    this.elapsedSeconds = 0;
    this.lastRenderedPlayerLapIndex = -1;
    this.previousStandings = null;
    this.previousFinishedCarIds = [];
    this.trails.clear();
    this.renderTrack(installedItems(input.build), input.lapCount);
  }

  update(_time: number, delta: number): void {
    if (!this.result || !this.schedule || this.markers.size === 0) {
      return;
    }

    this.elapsedSeconds += delta / 1000;
    const frame = nCarFrameStateAt(
      this.schedule,
      this.result,
      this.elapsedSeconds,
      this.lastRenderedPlayerLapIndex,
      this.previousStandings,
      this.previousFinishedCarIds,
    );
    frame.cars.forEach((car) => {
      const marker = this.markers.get(car.id);
      if (marker) this.positionMarker(car.id, marker, car.progress);
    });
    this.renderTrails();
    const player = frame.cars.find((car) => car.role === "player")!;
    this.playerLapLabel?.setText(raceLapLabel("YOU", player.progress, this.result.lapCount));
    this.renderStandings(frame.standings);
    if (frame.newTickerLines.length > 0) {
      const latest = frame.newTickerLines[frame.newTickerLines.length - 1];
      this.tickerText?.setText(latest.text);
    }
    this.previousStandings = frame.standings;
    this.previousFinishedCarIds = frame.cars.filter((car) => car.progress.finished).map((car) => car.id);
    if (player.progress.lapIndex !== this.lastRenderedPlayerLapIndex) {
      this.lastRenderedPlayerLapIndex = player.progress.lapIndex;
      frame.newCallouts.forEach((event) => this.flashBoardItem(event.item.id));
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
    const { width } = this.scale;
    const track = this.schedule!.track;
    addDemoBackdrop(this, "race-day", 0.28);
    addRunStamp(this, this.run!);
    this.add
      .text(width / 2, 34, "CONTEST", {
        fontSize: "28px",
        fontFamily: DISPLAY_FONT,
        fontStyle: "bold",
        color: "#f3e5bd",
      })
      .setOrigin(0.5);
    this.add
      .text(SIDEBAR_X, SIDEBAR_TOP_Y - 22, "STANDINGS", {
        fontSize: "12px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#d8b45a",
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

    this.standingsTexts = this.schedule!.cars.map((_car, index) =>
      this.add.text(SIDEBAR_X, SIDEBAR_TOP_Y + index * SIDEBAR_ROW_HEIGHT, "", {
        fontSize: "12px",
        fontFamily: UI_FONT,
      }).setOrigin(0.5),
    );

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

  private renderStandings(standings: Parameters<typeof standingsRows>[0]): void {
    const rows = standingsRows(standings, this.schedule!.cars);
    rows.forEach((row, index) => {
      const text = this.standingsTexts[index];
      if (!text) return;
      text
        .setText(row.label)
        .setColor(row.isPlayer ? "#ffd447" : row.color)
        .setFontStyle(row.isPlayer ? "bold" : "normal");
    });
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
    const startX = (this.scale.width - totalWidth) / 2 + BOARD_SLOT_WIDTH / 2;

    this.add.text((this.scale.width - totalWidth) / 2, 365, "THE HIGHWHEEL · INSTALLED", {
      fontSize: "12px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#d8b45a",
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
        enableItemTooltip(this, card, item);
      },
    );
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
