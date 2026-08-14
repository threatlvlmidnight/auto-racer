import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_ASSET_INVENTORY } from "../fixtures/deployment-fixtures";

/**
 * 031-demo-deployment deployment boundary audits.
 *
 * Phase 1 baseline (T003): enumerate every root-absolute runtime asset
 * reference before the migration to the shared `runtimeAssetUrl` boundary, so
 * the intentional legacy shape is documented before Phase 3 replaces this
 * baseline with rejection tests (T013).
 */

const ROOT = join(__dirname, "..", "..");
const SRC_DIR = join(ROOT, "src");
const BOOT_SCENE_PATH = join(SRC_DIR, "scenes", "BootScene.ts");

function readSource(path: string): string {
  return readFileSync(path, "utf-8");
}

function collectSourceFiles(dir: string): string[] {
  const collected: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectSourceFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      collected.push(full);
    }
  }
  return collected;
}

const ROOT_ABSOLUTE_ASSET_PATTERN = /["'`](\/assets\/[^"'`]+)["'`]/g;

function rootAbsoluteReferences(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(ROOT_ABSOLUTE_ASSET_PATTERN)) {
    found.push(match[1]);
  }
  return found;
}

/** Root-absolute string literals authored directly in BootScene today. */
const BASELINE_LITERAL_PATHS = [
  "/assets/title-race.svg",
  "/assets/championship-paddock.svg",
  "/assets/workshop.svg",
  "/assets/race-day.svg",
  "/assets/player-vehicle.svg",
  "/assets/rival-vehicle.svg",
  "/assets/backgrounds/scenes/championship-race-start.png",
  "/assets/backgrounds/scenes/championship-route-headquarters.png",
  "/assets/backgrounds/scenes/sponsor-negotiation.png",
  "/assets/backgrounds/scenes/road-circuit.png",
  "/assets/backgrounds/scenes/finish-line-aftermath.png",
  "/assets/backgrounds/scenes/pre-race-setup.png",
  "/assets/backgrounds/regions/british-isles.png",
  "/assets/backgrounds/regions/continental-europe.png",
  "/assets/backgrounds/regions/north-america.png",
  "/assets/backgrounds/regions/south-america.png",
  "/assets/backgrounds/regions/northern-europe.png",
  "/assets/backgrounds/regions/mediterranean-north-africa.png",
  "/assets/backgrounds/regions/paris-exhibition.png",
];

/** Root-absolute template prefixes whose concrete paths are composed at load time. */
const BASELINE_TEMPLATE_PREFIXES = [
  "/assets/backgrounds/garages/",
  "/assets/portraits/generated/",
  "/assets/vehicles/generated/",
  "/assets/items/families/",
];

describe("T003 baseline: root-absolute runtime asset reference inventory", () => {
  const bootScene = readSource(BOOT_SCENE_PATH);

  it("BootScene is the only source file with root-absolute /assets/ references", () => {
    const offenders = collectSourceFiles(SRC_DIR).filter(
      (file) => file !== BOOT_SCENE_PATH && rootAbsoluteReferences(readSource(file)).length > 0,
    );
    expect(offenders).toEqual([]);
  });

  it("literal root-absolute paths match the documented pre-migration set", () => {
    const literals = rootAbsoluteReferences(bootScene).filter((ref) => !ref.includes("${"));
    expect([...new Set(literals)].sort()).toEqual([...BASELINE_LITERAL_PATHS].sort());
  });

  it("template root-absolute prefixes match the documented pre-migration set", () => {
    const templates = rootAbsoluteReferences(bootScene).filter((ref) => ref.includes("${"));
    const prefixes = new Set(templates.map((ref) => ref.slice(0, ref.indexOf("${"))));
    expect([...prefixes].sort()).toEqual([...BASELINE_TEMPLATE_PREFIXES].sort());
  });

  it("every authored inventory path is covered by the baseline literal/template set", () => {
    for (const relative of REQUIRED_ASSET_INVENTORY) {
      const rooted = `/${relative}`;
      const covered =
        BASELINE_LITERAL_PATHS.includes(rooted) ||
        BASELINE_TEMPLATE_PREFIXES.some((prefix) => rooted.startsWith(prefix));
      expect(covered, `expected baseline coverage for ${relative}`).toBe(true);
    }
  });

  it("stat() confirms the baseline file inventory helpers operate on real files", () => {
    // Guard against the audit silently drifting from the source tree: the
    // collected file set must include BootScene and stat as a file.
    expect(collectSourceFiles(SRC_DIR)).toContain(BOOT_SCENE_PATH);
    expect(statSync(BOOT_SCENE_PATH).isFile()).toBe(true);
  });
});