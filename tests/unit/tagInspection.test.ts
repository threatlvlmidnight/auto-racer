import { describe, expect, it } from "vitest";
import { reduceTagInspection, tagInspectionProjection, IDLE_TAG_INSPECTION } from "../../src/scenes/itemPresentation";
import { vehicleBuild, testItem } from "../fixtures/vehicle-build-fixtures";

describe("tag inspection contract", () => {
  it("keeps pinned state through hover/leave and supports focus/unpin", () => {
    const pinned = reduceTagInspection(IDLE_TAG_INSPECTION, { kind: "pin", tag: "airflow" });
    expect(reduceTagInspection(pinned, { kind: "hover", tag: "heat" })).toEqual(pinned);
    expect(reduceTagInspection(pinned, { kind: "leave" })).toEqual(pinned);
    expect(reduceTagInspection(IDLE_TAG_INSPECTION, { kind: "focus", tag: "airflow" })).toEqual(pinned);
    expect(reduceTagInspection(pinned, { kind: "unpin" })).toBe(IDLE_TAG_INSPECTION);
  });

  it("projects every matching installed and stored location", () => {
    const one = testItem({ id: "one", name: "One", price: 1, timeModifier: 0, synergyTags: ["airflow"] });
    const two = testItem({ id: "two", name: "Two", price: 1, timeModifier: 0, synergyTags: ["airflow"] });
    const build = vehicleBuild([one]);
    build.storage[0].item = two;
    const projection = tagInspectionProjection("airflow", "Airflow", build);
    expect(projection.matchingHeldCount).toBe(2);
    expect(projection.matchingLocations.map((entry) => entry.location.area)).toEqual(["vehicle", "storage"]);
  });
});
