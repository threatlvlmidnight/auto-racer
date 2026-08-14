import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_ASSET_INVENTORY } from "../fixtures/deployment-fixtures";

/**
 * 031-demo-deployment deployment boundary audits.
 *
 * T013 (replaces the T003 baseline): the shared `runtimeAssetUrl` boundary is
 * now mandatory — root-absolute runtime asset literals are rejected anywhere
 * in `src/` and `index.html`, every authored BootScene asset must load
 * through the boundary, and the repository prefix must stay configured in
 * exactly one place (never hardcoded in runtime sources).
 */

const ROOT = join(__dirname, "..", "..");
const SRC_DIR = join(ROOT, "src");
const BOOT_SCENE_PATH = join(SRC_DIR, "scenes", "BootScene.ts");
const INDEX_HTML_PATH = join(ROOT, "index.html");
const VITE_CONFIG_PATH = join(ROOT, "vite.config.ts");

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

/** Template families composed at load time (BootScene authored prefixes). */
const AUTHORED_TEMPLATE_PREFIXES = [
  "assets/backgrounds/garages/",
  "assets/portraits/generated/",
  "assets/vehicles/generated/",
  "assets/items/families/",
];

function isTemplated(relative: string): boolean {
  return AUTHORED_TEMPLATE_PREFIXES.some((prefix) => relative.startsWith(prefix));
}

describe("T013: root-absolute runtime asset literals are rejected", () => {
  it("no source file contains a root-absolute /assets/ reference", () => {
    const offenders = collectSourceFiles(SRC_DIR)
      .map((file) => ({ file, refs: rootAbsoluteReferences(readSource(file)) }))
      .filter((entry) => entry.refs.length > 0);
    expect(offenders).toEqual([]);
  });

  it("index.html contains no root-absolute runtime asset reference", () => {
    expect(rootAbsoluteReferences(readSource(INDEX_HTML_PATH))).toEqual([]);
  });
});

describe("T013: every authored asset loads through runtimeAssetUrl", () => {
  const bootScene = readSource(BOOT_SCENE_PATH);

  it("BootScene imports the shared URL boundary", () => {
    expect(bootScene).toMatch(/import\s*\{\s*runtimeAssetUrl\s*\}\s*from\s*"\.\.\/buildIdentity"/);
  });

  it.each(REQUIRED_ASSET_INVENTORY.filter((path) => !isTemplated(path)).map((path) => [path]))(
    "literal asset %s loads through the boundary",
    (relative) => {
      expect(bootScene).toContain(`runtimeAssetUrl("${relative}")`);
    },
  );

  it.each(AUTHORED_TEMPLATE_PREFIXES.map((prefix) => [prefix]))(
    "template family %s composes through the boundary",
    (prefix) => {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(bootScene).toMatch(new RegExp(`runtimeAssetUrl\\(\\s*\`${escaped}\\$\\{`));
    },
  );

  it("the complete authored inventory is covered by literals and templates", () => {
    for (const relative of REQUIRED_ASSET_INVENTORY) {
      const covered =
        bootScene.includes(`runtimeAssetUrl("${relative}")`) || isTemplated(relative);
      expect(covered, `expected boundary coverage for ${relative}`).toBe(true);
    }
  });
});

describe("T043: single-base, traversal, and mixed-base guards", () => {
  it("the repository prefix is never hardcoded in runtime sources", () => {
    const offenders = collectSourceFiles(SRC_DIR).filter((file) =>
      readSource(file).includes("/auto-racer"),
    );
    expect(offenders).toEqual([]);
    expect(readSource(INDEX_HTML_PATH)).not.toContain("/auto-racer");
    // vite.config may mention the prefix in prose, but must never hardcode it
    // as a string literal — the base arrives via VITE_DEMO_BASE_URL only.
    expect(readSource(VITE_CONFIG_PATH)).not.toMatch(/["'`]\/auto-racer/);
  });

  it("vite.config consumes exactly one normalized base", () => {
    const config = readSource(VITE_CONFIG_PATH);
    expect(config.match(/normalizeBaseUrl\(/g) ?? []).toHaveLength(1);
    expect(config).toContain("base: BASE_URL");
  });

  it("no runtimeAssetUrl call carries a traversal or leading slash", () => {
    const bootScene = readSource(BOOT_SCENE_PATH);
    expect(bootScene).not.toMatch(/runtimeAssetUrl\(\s*["'`][^"'`]*\.\./);
    expect(bootScene).not.toMatch(/runtimeAssetUrl\(\s*["'`]\/(?!\*)/);
  });

  it("stat() confirms the audit helpers operate on real files", () => {
    expect(collectSourceFiles(SRC_DIR)).toContain(BOOT_SCENE_PATH);
    expect(statSync(BOOT_SCENE_PATH).isFile()).toBe(true);
  });
});