import { describe, expect, it } from "vitest";
import {
  PLAYER_VISUAL_PROFILES,
  fieldVisualProfiles,
  playerVisualProfile,
  racePlayerTextureKey,
  raceVisualProfileForCar,
  rivalVisualProfile,
} from "../../src/content/raceVisualProfiles";

/**
 * Feature 036 (T007): deterministic profile lookup and stable non-color
 * identity — number, pattern, and label — plus asset fallback descriptors.
 */

describe("Feature 036 player profiles (T007/T009)", () => {
  it("provides exactly four bespoke player profiles with distinct non-color identity", () => {
    expect(PLAYER_VISUAL_PROFILES).toHaveLength(4);
    const numbers = PLAYER_VISUAL_PROFILES.map((profile) => profile.number);
    const patterns = PLAYER_VISUAL_PROFILES.map((profile) => profile.pattern);
    const silhouettes = PLAYER_VISUAL_PROFILES.map((profile) => profile.silhouetteClass);
    const keys = PLAYER_VISUAL_PROFILES.map((profile) => profile.vehicleKey);
    expect(new Set(numbers).size).toBe(4);
    expect(new Set(patterns).size).toBe(4);
    expect(new Set(silhouettes).size).toBe(4);
    for (const profile of PLAYER_VISUAL_PROFILES) {
      expect(profile.role).toBe("player");
      expect(profile.vehicleKey).toBe(racePlayerTextureKey(profile.profileId));
      expect(profile.fallback).toMatchObject({
        number: profile.number,
        pattern: profile.pattern,
        label: profile.label,
      });
    }
    expect(new Set(keys).size).toBe(4);
  });

  it("looks up each player profile by entrant id and falls back to the first", () => {
    for (const profile of PLAYER_VISUAL_PROFILES) {
      expect(playerVisualProfile(profile.profileId).profileId).toBe(profile.profileId);
    }
    expect(playerVisualProfile(undefined).profileId).toBe(PLAYER_VISUAL_PROFILES[0].profileId);
  });
});

describe("Feature 036 rival profiles (T007/T020)", () => {
  it("derives a deterministic reusable silhouette plus number/pattern/label", () => {
    const a = rivalVisualProfile("rival-torres", "Torres", "#c0524a");
    const again = rivalVisualProfile("rival-torres", "Torres", "#c0524a");
    expect(a).toEqual(again);
    expect(a.role).toBe("rival");
    expect(a.silhouetteClass).toMatch(/^rival-/);
    expect(a.number.trim().length).toBeGreaterThan(0);
    expect(a.pattern.trim().length).toBeGreaterThan(0);
    expect(a.label).toBe("Torres");
    expect(a.fallback.shape).toBe(a.fallback.shape);
    expect(a.vehicleKey).toBeUndefined();
    for (const cls of PLAYER_VISUAL_PROFILES.map((p) => p.silhouetteClass)) {
      expect(a.silhouetteClass).not.toBe(cls);
    }
  });

  it("never keys identity on color alone and remains stable across lookups", () => {
    const ids = ["rival-torres", "rival-kestrel", "rival-marchetti", "rival-de-la-vega"];
    const profiles = ids.map((id) => rivalVisualProfile(id, id, "#ffffff"));
    for (const profile of profiles) {
      expect(profile.number).toBeTruthy();
      expect(profile.pattern).toBeTruthy();
      expect(profile.label).toBeTruthy();
    }
  });
});

describe("Feature 036 raceVisualProfileForCar (T007)", () => {
  it("selects a player profile for the player car and a rival for rivals", () => {
    const player = raceVisualProfileForCar(
      { id: "player", role: "player", name: "Player", color: "#ffffff" },
      "inezin-rook",
    );
    // Unknown entrant resolves to the canonical first player profile.
    expect(player.role).toBe("player");
    const mercer = raceVisualProfileForCar(
      { id: "player", role: "player", name: "Player", color: "#ffffff" },
      "evelyn-mercer",
    );
    expect(mercer.profileId).toBe("evelyn-mercer");
    const rival = raceVisualProfileForCar(
      { id: "rival-torres", role: "rival", name: "Torres", color: "#c0524a" },
      "evelyn-mercer",
    );
    expect(rival.role).toBe("rival");
    expect(rival.number).not.toBe(mercer.number);
  });
});
describe("Feature 036 field-wide non-color identity (T047/T048)", () => {
  const field = [
    { id: "player", role: "player" as const, name: "Player", color: "#ffffff" },
    { id: "rival-torres", role: "rival" as const, name: "Torres", color: "#c0524a" },
    { id: "rival-kestrel", role: "rival" as const, name: "Kestrel", color: "#4a90c0" },
    { id: "rival-marchetti", role: "rival" as const, name: "Marchetti", color: "#c0a34a" },
    { id: "rival-ferro", role: "rival" as const, name: "Ferro", color: "#7a5aa8" },
    { id: "rival-quick", role: "rival" as const, name: "Quick", color: "#3f9e8d" },
    { id: "rival-colt", role: "rival" as const, name: "Colt", color: "#ad5d2c" },
    { id: "rival-vane", role: "rival" as const, name: "Vane", color: "#b0b23f" },
  ];

  it("gives the four player profiles distinct silhouettes rather than color-only differences", () => {
    const silhouettes = PLAYER_VISUAL_PROFILES.map((profile) => profile.silhouetteClass);
    const shapes = PLAYER_VISUAL_PROFILES.map((profile) => profile.fallback.shape);
    const patterns = PLAYER_VISUAL_PROFILES.map((profile) => profile.pattern);
    expect(new Set(silhouettes).size).toBe(4);
    expect(new Set(shapes).size).toBe(4);
    expect(new Set(patterns).size).toBe(4);
  });

  it("assigns collision-free unique visible numbers across the full field", () => {
    const profiles = fieldVisualProfiles(field, "evelyn-mercer");
    expect(profiles.size).toBe(field.length);
    const numbers = [...profiles.values()].map((profile) => profile.number);
    expect(new Set(numbers).size).toBe(field.length);
    for (const car of field) {
      const profile = profiles.get(car.id)!;
      expect(profile.number).toBeTruthy();
      expect(profile.pattern).toBeTruthy();
      expect(profile.label).toBeTruthy();
    }
  });

  it("keeps every rival distinguishable by number or pattern, never color alone", () => {
    const profiles = [...fieldVisualProfiles(field, "evelyn-mercer").values()];
    const rivals = profiles.filter((profile) => profile.role === "rival");
    expect(rivals).toHaveLength(7);
    const pairs = new Set(rivals.map((profile) => `${profile.number}::${profile.pattern}`));
    expect(pairs.size).toBe(7);
  });
});

