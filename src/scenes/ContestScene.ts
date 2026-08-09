import Phaser from "phaser";
import { resolveContest } from "../simulation/contest";
import { installedItems } from "../simulation/slots";
import {
  buildPlaybackSchedule,
  frameStateAt,
  type CarProgress,
  type PlaybackSchedule,
} from "../simulation/playback";
import {
  SLOT_CAPACITY,
  type ContestResult,
  type OfferedItem,
} from "../simulation/types";
import type { Run } from "../simulation/run";
import { leaderLabel } from "./contestFormatting";
import { createItemCard, enableItemTooltip } from "./itemVisuals";
import { contestSceneInput, raceLapLabel } from "./runPresentation";
import { addDemoBackdrop, addRunStamp, DISPLAY_FONT, UI_FONT } from "./demoTheme";

const TRACK_CENTER_X = 400;
const TRACK_CENTER_Y = 205;
const TRACK_RADIUS_X = 270;
const TRACK_RADIUS_Y = 90;
const BOARD_SLOT_WIDTH = 190;
const BOARD_SLOT_HEIGHT = 58;
const BOARD_SLOT_GAP = 18;
const BOARD_Y = 406;

/**
 * Contest phase: resolves once, then presents the immutable result as a
 * schedule-driven watched race before handing off to ResultScene.
 */
export class ContestScene extends Phaser.Scene {
  private result?: ContestResult;
  private schedule?: PlaybackSchedule;
  private elapsedSeconds = 0;
  private playerMarker?: Phaser.GameObjects.Image;
  private ghostMarker?: Phaser.GameObjects.Image;
  private playerLapLabel?: Phaser.GameObjects.Text;
  private ghostLapLabel?: Phaser.GameObjects.Text;
  private leaderText?: Phaser.GameObjects.Text;
  private boardHighlights = new Map<string, Phaser.GameObjects.Rectangle>();
  private lastRenderedPlayerLapIndex = -1;
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
    this.result = resolveContest(input.build, input.ghost, input.lapCount);
    this.schedule = buildPlaybackSchedule(this.result);
    this.elapsedSeconds = 0;
    this.lastRenderedPlayerLapIndex = -1;
    this.renderTrack(installedItems(input.build), input.lapCount);
  }

  update(_time: number, delta: number): void {
    if (!this.result || !this.schedule || !this.playerMarker || !this.ghostMarker) {
      return;
    }

    this.elapsedSeconds += delta / 1000;
    const frame = frameStateAt(
      this.schedule,
      this.result,
      this.elapsedSeconds,
      this.lastRenderedPlayerLapIndex,
    );
    this.positionMarker(this.playerMarker, frame.player);
    this.positionMarker(this.ghostMarker, frame.ghost);
    this.playerLapLabel?.setText(raceLapLabel("PLAYER", frame.player, this.result.lapCount));
    this.ghostLapLabel?.setText(raceLapLabel("GHOST", frame.ghost, this.result.lapCount));
    this.leaderText
      ?.setText(leaderLabel(frame.liveGap))
      .setColor(frame.liveGap < 0 ? "#ffd447" : frame.liveGap > 0 ? "#65c7f7" : "#ffffff");
    if (frame.player.lapIndex !== this.lastRenderedPlayerLapIndex) {
      this.lastRenderedPlayerLapIndex = frame.player.lapIndex;
      frame.newCallouts.forEach((event) => this.flashBoardItem(event.item.id));
    }

    if (frame.player.finished && frame.ghost.finished) {
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
    this.leaderText = this.add
      .text(width / 2, 78, leaderLabel(0), {
        fontSize: "18px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const track = this.add.graphics();
    track.lineStyle(36, 0x30353a, 1);
    track.strokeEllipse(TRACK_CENTER_X, TRACK_CENTER_Y, TRACK_RADIUS_X * 2, TRACK_RADIUS_Y * 2);
    track.lineStyle(2, 0xd5d8da, 0.8);
    track.strokeEllipse(TRACK_CENTER_X, TRACK_CENTER_Y, TRACK_RADIUS_X * 2, TRACK_RADIUS_Y * 2);
    track.lineStyle(2, 0xffffff, 0.25);
    track.strokeEllipse(
      TRACK_CENTER_X,
      TRACK_CENTER_Y,
      TRACK_RADIUS_X * 2 - 36,
      TRACK_RADIUS_Y * 2 - 36,
    );

    this.playerMarker = this.add.image(0, 0, "player-vehicle").setDisplaySize(46, 23).setDepth(5);
    this.ghostMarker = this.add.image(0, 0, "rival-vehicle").setDisplaySize(46, 23).setDepth(4);
    this.playerLapLabel = this.add.text(105, 325, `PLAYER · LAP 1/${lapCount}`, {
      fontSize: "16px",
      fontFamily: UI_FONT,
      fontStyle: "bold",
      color: "#ffd447",
    });
    this.ghostLapLabel = this.add
      .text(width - 105, 325, `GHOST · LAP 1/${lapCount}`, {
        fontSize: "16px",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        color: "#65c7f7",
      })
      .setOrigin(1, 0);
    this.renderBoard(board);

    const start: CarProgress = { lapIndex: 0, lapProgress: 0, finished: false };
    this.positionMarker(this.playerMarker, start);
    this.positionMarker(this.ghostMarker, start);
  }

  private positionMarker(marker: Phaser.GameObjects.Image, progress: CarProgress): void {
    const angle = progress.lapProgress * Math.PI * 2 - Math.PI / 2;
    marker.setPosition(
      TRACK_CENTER_X + Math.cos(angle) * TRACK_RADIUS_X,
      TRACK_CENTER_Y + Math.sin(angle) * TRACK_RADIUS_Y,
    );
    marker.setRotation(angle + Math.PI / 2);
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
