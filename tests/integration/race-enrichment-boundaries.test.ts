import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(new URL(`../../${relative}`, import.meta.url).pathname, "utf8");

describe("Feature 033 constitutional boundaries", () => {
  it("keeps enrichment authority framework-free and free of live RNG", () => {
    const authority = read("src/simulation/raceEnrichment.ts");
    expect(authority).not.toContain('from "phaser"');
    expect(authority).not.toContain("Math.random");
    expect(authority).toContain('deriveNamedSubSeed(seed, "incidents")');
  });

  it("keeps playback and scenes as retained-evidence consumers", () => {
    const playback = read("src/simulation/playback.ts");
    const contestScene = read("src/scenes/ContestScene.ts");
    const resultsScene = read("src/scenes/ResultScene.ts");
    expect(playback).toContain("enrichmentEvents?: readonly EnrichmentEvent[]");
    expect(playback).not.toContain("resolveEnrichment(");
    expect(contestScene).toContain("resolveEnrichedContest");
    expect(contestScene).not.toContain("resolveEnrichment(");
    expect(resultsScene).toContain("enrichmentResultsSummary(enriched.events)");
  });

  it("keeps optional audio outside simulation authority", () => {
    const simulationFiles = ["contest.ts", "laps.ts", "run.ts", "raceEnrichment.ts", "playback.ts"];
    for (const file of simulationFiles) {
      expect(read(`src/simulation/${file}`)).not.toContain("audioPresentation");
    }
  });
});
