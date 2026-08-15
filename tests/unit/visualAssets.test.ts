import { describe, expect, it } from "vitest";
import { REGION_DEFINITIONS } from "../../src/content/regions";
import {
  NEUTRAL_RACE_BACKDROP,
  REGION_BACKDROP_BY_ID,
  regionalRaceBackdrop,
} from "../../src/scenes/visualAssets";

describe("regional race assets", () => {
  it("maps all seven canonical regions to distinct stable texture keys", () => {
    expect(Object.keys(REGION_BACKDROP_BY_ID)).toHaveLength(7);
    expect(new Set(Object.values(REGION_BACKDROP_BY_ID)).size).toBe(7);
    REGION_DEFINITIONS.forEach((region) => {
      expect(regionalRaceBackdrop(region.id)).toBe(region.textureKey);
    });
  });

  it("uses the neutral circuit only when canonical region evidence is absent", () => {
    expect(regionalRaceBackdrop(undefined)).toBe(NEUTRAL_RACE_BACKDROP);
    expect(regionalRaceBackdrop(null)).toBe(NEUTRAL_RACE_BACKDROP);
  });
});
