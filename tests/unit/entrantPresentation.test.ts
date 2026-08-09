import { describe, expect, it } from "vitest";
import { ENTRANTS } from "../../src/content/entrants";
import {
  ENTRANT_EQUALITY_STATEMENT,
  entrantDetailModel,
  entrantSelectionModel,
  entrantTopologyLabel,
} from "../../src/scenes/entrantPresentation";
import type { EntrantId } from "../../src/simulation/types";

describe("entrantSelectionModel", () => {
  it("offers all four entrants with none locked, stronger, or presented as a class", () => {
    const model = entrantSelectionModel(null);

    expect(model.choices).toHaveLength(4);
    model.choices.forEach((choice) => {
      expect(choice.available).toBe(true);
      expect(choice.locked).toBe(false);
      const text = `${choice.name} ${choice.vehicleName} ${choice.originLabel}`.toLowerCase();
      ["locked", "stronger", "best", "class", "tier", "recommended"].forEach((banned) => {
        expect(text).not.toContain(banned);
      });
    });
  });

  it("lists each entrant with their reciprocal named vehicle and origin", () => {
    const model = entrantSelectionModel(null);

    expect(model.choices.map((choice) => [choice.entrantId, choice.vehicleName, choice.originLabel]))
      .toEqual([
        ["evelyn-mercer", "The Highwheel", "Coachworks"],
        ["lucien-soto", "The Needle", "Velodrome"],
        ["inez-rook", "The Lark", "Fieldworks"],
        ["nell-voss", "The Hush", "Backroads"],
      ]);
  });

  it("marks no entrant selected and disables confirmation before a choice is made", () => {
    const model = entrantSelectionModel(null);

    expect(model.selectedEntrantId).toBeNull();
    expect(model.detail).toBeNull();
    expect(model.confirm.enabled).toBe(false);
    expect(model.confirm.disabledReason).toBeTruthy();
    model.choices.forEach((choice) => expect(choice.selected).toBe(false));
  });

  it("marks exactly the highlighted entrant as selected and enables confirmation", () => {
    const model = entrantSelectionModel("inez-rook");

    expect(model.selectedEntrantId).toBe("inez-rook");
    expect(model.choices.filter((choice) => choice.selected).map((choice) => choice.entrantId))
      .toEqual(["inez-rook"]);
    expect(model.confirm.enabled).toBe(true);
    expect(model.confirm.disabledReason).toBeNull();
    expect(model.confirm.label.toUpperCase()).toContain("ENTER CHAMPIONSHIP");
  });

  it("always states the equality guarantee so no entrant reads as an advantage", () => {
    const model = entrantSelectionModel(null);

    expect(model.equalityStatement).toBe(ENTRANT_EQUALITY_STATEMENT);
    expect(model.equalityStatement).toMatch(/four active slots/i);
    expect(model.equalityStatement).toMatch(/three storage/i);
    expect(model.equalityStatement).toMatch(/same baseline pace|equal baseline pace/i);
    expect(model.equalityStatement).toMatch(/contest rules/i);
  });

  it("gives every choice a deterministic focus order with pointer/touch/keyboard parity", () => {
    const model = entrantSelectionModel("nell-voss");

    expect(model.choices.map((choice) => choice.order)).toEqual([0, 1, 2, 3]);
    model.choices.forEach((choice) => {
      expect(choice.pointer).toBe(true);
      expect(choice.touch).toBe(true);
      expect(choice.keyBinding.length).toBeGreaterThan(0);
    });
  });

  it("reports an unavailable state without choices when selection is blocked", () => {
    const model = entrantSelectionModel(null, { blocked: true, reason: "A run is already active." });

    expect(model.unavailable).toStrictEqual({ reason: "A run is already active." });
    expect(model.confirm.enabled).toBe(false);
  });
});

describe("entrantDetailModel", () => {
  it.each(ENTRANTS.map((entrant) => entrant.id))(
    "describes %s with background, origin, strategy directions, vehicle, and topology",
    (entrantId: EntrantId) => {
      const detail = entrantDetailModel(entrantId)!;

      expect(detail.name.length).toBeGreaterThan(0);
      expect(detail.role.length).toBeGreaterThan(0);
      expect(detail.approach.length).toBeGreaterThan(0);
      expect(detail.strategyDirections.length).toBeGreaterThanOrEqual(3);
      expect(detail.vehicleName.length).toBeGreaterThan(0);
      expect(detail.originLabel.length).toBeGreaterThan(0);
      expect(detail.originWeightingNote).toMatch(/weight|bias|more often/i);
      expect(detail.topology.total).toBe(4);
      expect(detail.storageCapacity).toBe(3);
      expect(detail.portraitAssetKey).toMatch(/^entrant-/);
      expect(detail.silhouetteAssetKey).toMatch(/^vehicle-/);
    },
  );

  it.each([
    ["evelyn-mercer", 1, 2, 1],
    ["lucien-soto", 2, 1, 1],
    ["inez-rook", 1, 1, 2],
    ["nell-voss", 2, 2, 0],
  ] as const)("reports %s's exact Power/Chassis/Flex distribution", (entrantId, power, chassis, flex) => {
    const detail = entrantDetailModel(entrantId)!;

    expect(detail.topology.power).toBe(power);
    expect(detail.topology.chassis).toBe(chassis);
    expect(detail.topology.flex).toBe(flex);
    expect(detail.topology.power + detail.topology.chassis + detail.topology.flex).toBe(4);
  });

  it("discloses that The Hush has no Flex slots rather than silently omitting them", () => {
    const hush = entrantDetailModel("nell-voss")!;

    expect(hush.topology.flex).toBe(0);
    expect(hush.noFlexDisclosure).toBeTruthy();
    expect(hush.noFlexDisclosure).toMatch(/no flex/i);
  });

  it("omits a no-Flex disclosure for vehicles that do have Flex slots", () => {
    (["evelyn-mercer", "lucien-soto", "inez-rook"] as const).forEach((entrantId) => {
      expect(entrantDetailModel(entrantId)!.noFlexDisclosure).toBeNull();
    });
  });

  it("frames origin as draft weighting, never as exclusive access or legality", () => {
    ENTRANTS.forEach((entrant) => {
      const note = entrantDetailModel(entrant.id)!.originWeightingNote.toLowerCase();
      ["only", "exclusive", "cannot", "locked", "restricted"].forEach((banned) => {
        expect(note).not.toContain(banned);
      });
    });
  });

  it("returns null for an unknown entrant rather than substituting a default", () => {
    expect(entrantDetailModel("nobody" as EntrantId)).toBeNull();
  });
});

describe("entrantTopologyLabel", () => {
  it("renders topology counts as text, never color alone", () => {
    expect(entrantTopologyLabel("evelyn-mercer")).toBe("1 Power · 2 Chassis · 1 Flex");
    expect(entrantTopologyLabel("nell-voss")).toBe("2 Power · 2 Chassis · 0 Flex");
  });
});
