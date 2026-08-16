import { describe, expect, it } from "vitest";
import {
  EXHIBITION_MIN_CHOICE_ORDINAL,
  exhibitionEligibleAtChoiceOrdinal,
} from "../../src/simulation/encounters";

describe("Exhibition route timing", () => {
  it("keeps Exhibitions out of the opening eight choices", () => {
    expect(EXHIBITION_MIN_CHOICE_ORDINAL).toBe(9);
    expect(exhibitionEligibleAtChoiceOrdinal(8)).toBe(false);
    expect(exhibitionEligibleAtChoiceOrdinal(9)).toBe(true);
  });
});
