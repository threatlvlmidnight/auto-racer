import { describe, expect, it } from "vitest";
import {
  circuitPresentationIdentity,
  circuitIdentityLine,
} from "../../src/scenes/circuitPresentation";
import {
  bandsOverlap,
  contestSafeRegions,
  formatStatPoint,
  offerCardEffectLineFit,
  preRaceCaptionMetrics,
  prepareDenseBands,
  validateBands,
  OFFER_CARD_BOTTOM_RESERVE,
} from "../../src/scenes/sceneLayoutBands";
import { setupStatRows } from "../../src/scenes/raceSetupPresentation";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { chooseEncounter } from "../../src/simulation/encounters";
import { raceSetupInput } from "../../src/simulation/raceSetup";
import { completeNonPvpEncounter, createRun, runIdentityForEntrant } from "../../src/simulation/run";
import { longCopyItem, britishIslesStage } from "../fixtures/interface-clarity-fixtures";

/**
 * Feature 035 Phase 7 (T049) — production-path regression coverage for the
 * three dense states exposed by owner QA (UI-035-01/02/03) and the layout-bound
 * invariants the scenes consume. These assert on the pure layout models that
 * PreRaceScene / PrepareScene / ContestScene actually use, with real catalog
 * items and fixtures, rather than on the decorative AUDIT_CASES array.
 */

function scoredRun() {
  let run = createRun({
    runId: "pre-race-dense",
    seed: 9,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build: vehicleBuild(),
    rng: () => 0,
  });
  // Advance past the two opening non-PvP stages to the first scheduled PvP race.
  for (let stage = 0; stage < 2; stage += 1) {
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
  }
  expect(run.activeEncounter?.type).toBe("pvp");
  return run;
}

/** Long real region/track identity for the dense PreRace caption. */
function longIdentityTrack() {
  return { id: "max-demand-track", name: "Thundering Hollow Point Weathering Circuit" };
}

describe("UI-035-01 — PreRace identity + stat formatting (T046)", () => {
  it("bounds the single identity caption clear of the stats panel", () => {
    const identity = circuitPresentationIdentity(longIdentityTrack(), britishIslesStage);
    const caption = `${circuitIdentityLine(identity)} · LOCAL RACE`;
    const metrics = preRaceCaptionMetrics(caption.length);
    // Caption spans x ± width/2 = 240..500, left of the stats panel (550).
    expect(metrics.x - metrics.width / 2).toBeGreaterThan(180);
    expect(metrics.x + metrics.width / 2).toBeLessThan(550);
    expect(metrics.width).toBe(260);
    // Dense identity uses the compact font and is capped at two lines.
    expect(metrics.maxFontSize).toBe(9);
    expect(metrics.maxLines).toBe(2);
  });

  it("removes raw floating-point stat output with bounded point formatting", () => {
    for (const value of [45.54455445544554, 27.777777777777775, 12, 12.5]) {
      const formatted = formatStatPoint(value);
      expect(formatted).toMatch(/^\d+(\.\d)?$/);
    }
    expect(formatStatPoint(45.54455445544554)).toBe("45.5");
    expect(formatStatPoint(27.777777777777775)).toBe("27.8");
    expect(formatStatPoint(12)).toBe("12");
    expect(formatStatPoint(12.5)).toBe("12.5");
  });

  it("exposes bounded current/prospective labels through the production model", () => {
    const run = scoredRun();
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const rows = setupStatRows(input, {});
    expect(rows.length).toBe(4);
    for (const row of rows) {
      expect(row.currentLabel).toMatch(/^\d+(\.\d)? /);
      expect(row.prospectiveLabel).toMatch(/^\d+(\.\d)? /);
    }
  });
describe("UI-035-02 — Supplier dense state layout (T047)", () => {
  it("keeps all dense-state vertical bands non-overlapping and on-canvas", () => {
    expect(validateBands(prepareDenseBands(true))).toEqual({ kind: "valid" });
    const bands = prepareDenseBands(true);
    const board = bands.find((b) => b.id === "board")!;
    const storageHeading = bands.find((b) => b.id === "storage-heading")!;
    const storage = bands.find((b) => b.id === "storage")!;
    // Installed row and storage row own independent measured bounds.
    expect(board.bottom).toBeLessThan(storageHeading.top);
    expect(storageHeading.bottom).toBeLessThan(storage.top);
  });

  it("bounds offer-card effect lines above the reserved state-chip strip", () => {
    // Dense multi-effect offer card: effect lines must stay out of the bottom
    // strip reserved for UPGRADE / UNAVAILABLE / +N MORE chips.
    const limit = offerCardEffectLineFit({ height: 92, effectLinesVisible: 2, effectsStartY: -24, lineHeight: 15 });
    const effectBottom = -24 + limit * 15;
    expect(effectBottom).toBeLessThanOrEqual(92 / 2 - OFFER_CARD_BOTTOM_RESERVE);
    expect(limit).toBeGreaterThanOrEqual(1);
  });

  it("keeps the board separated from storage even with a receipt visible", () => {
    const withReceipt = prepareDenseBands(true);
    expect(validateBands(withReceipt)).toEqual({ kind: "valid" });
    expect(validateBands(prepareDenseBands(false))).toEqual({ kind: "valid" });
    const receipt = withReceipt.find((b) => b.id === "receipt")!;
    const board = withReceipt.find((b) => b.id === "board")!;
    expect(receipt.bottom).toBeLessThan(board.top);
  });
});

describe("UI-035-03 — Contest safe regions (T048)", () => {
  it("defines exclusive, non-overlapping safe regions", () => {
    expect(validateBands(contestSafeRegions())).toEqual({ kind: "valid" });
  });

  it("gives identity its own exclusive band clear of the lower HUD", () => {
    const regions = contestSafeRegions();
    const identity = regions.find((r) => r.id === "identity")!;
    const installed = regions.find((r) => r.id === "lower-hud")!;
    expect(bandsOverlap(identity, installed)).toBe(false);
  });
});

describe("Feature 035 dense-state fixtures are real (T049)", () => {
  it("exercises long-authored and region fixtures, not placeholder arrays", () => {
    // The longest-authored-copy item and a real region drive the dense captions.
    expect(longCopyItem.name.length).toBeGreaterThan(10);
    expect(britishIslesStage.regionId).toBe("british-isles");
  });
});
});