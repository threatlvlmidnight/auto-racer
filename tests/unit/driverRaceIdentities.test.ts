import { describe, expect, it } from "vitest";
import {
  DRIVER_RACE_IDENTITIES,
  generatedRivalIdentity,
  identityForEntrant,
} from "../../src/content/driverRaceIdentities";
import { ENRICHMENT_ENTRANTS } from "../fixtures/race-enrichment-fixtures";
import type { DriverRaceIdentity, StatTarget } from "../../src/simulation/types";

/**
 * Feature 033 Phase 2 (T010): the driver catalog is complete, every identity
 * (player and generated rival) uses the same schema, and identity is expressed as
 * conditional tendencies — never a hidden stock-stat scalar (constitution Product
 * Constraints; data-model.md DriverRaceIdentity).
 */

const EXPECTED_SIGNATURE_STAT: Record<string, StatTarget> = {
  "evelyn-mercer": "corneringSpeed",
  "lucien-soto": "acceleration",
  "inez-rook": "topSpeed",
  "nell-voss": "brakingPower",
};

describe("Feature 033 (T010): driver catalog completeness", () => {
  it("defines exactly the four player entrants in authored order", () => {
    expect(DRIVER_RACE_IDENTITIES.map((identity) => identity.id)).toEqual([...ENRICHMENT_ENTRANTS]);
  });

  it("maps each entrant to its documented signature direction", () => {
    for (const entrantId of ENRICHMENT_ENTRANTS) {
      const identity = identityForEntrant(entrantId);
      expect(identity).toBeDefined();
      expect(identity!.signature.statTarget).toBe(EXPECTED_SIGNATURE_STAT[entrantId]);
    }
  });

  it("gives every identity a named passive and a named signature with structural context", () => {
    for (const identity of DRIVER_RACE_IDENTITIES) {
      expect(identity.displayName.length).toBeGreaterThan(0);
      expect(identity.passive.name.length).toBeGreaterThan(0);
      expect(identity.passive.description.length).toBeGreaterThan(0);
      expect(identity.passive.condition).toBe("always");
      expect(identity.signature.name.length).toBeGreaterThan(0);
      expect(identity.signature.priority).toBeGreaterThanOrEqual(0);
      expect(["final-push", "contested", "corner-exit"]).toContain(identity.signature.context);
      expect(identity.signature.temporaryEffect.kind.length).toBeGreaterThan(0);
    }
  });
});

describe("Feature 033 (T010): generated rivals share the player identity schema", () => {
  it("generates deterministic rivals with the same top-level fields as a player identity", () => {
    const first = generatedRivalIdentity(7, 0);
    const second = generatedRivalIdentity(7, 0);
    expect(first).toEqual(second);

    const playerKeys = Object.keys(DRIVER_RACE_IDENTITIES[0]).sort();
    const rivalKeys = Object.keys(first).sort();
    expect(rivalKeys).toEqual(playerKeys);
  });

  it("never grants a hidden stock-stat scalar to any identity", () => {
    const identities: DriverRaceIdentity[] = [
      ...DRIVER_RACE_IDENTITIES,
      generatedRivalIdentity(1, 0),
      generatedRivalIdentity(999, 4),
    ];
    const hiddenScalarKeys = ["baseStats", "statBonus", "baseSpeed", "basePhysicalStats"];
    for (const identity of identities) {
      for (const key of hiddenScalarKeys) {
        expect(Object.prototype.hasOwnProperty.call(identity, key)).toBe(false);
      }
      // Signature temporary effects are structural (config holds the numeric cap).
      expect(Object.prototype.hasOwnProperty.call(identity.signature.temporaryEffect, "delta")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(identity.signature.temporaryEffect, "magnitude")).toBe(false);
    }
  });
});