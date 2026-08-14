import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  FIXED_BUILD_TIME_UTC,
  RELEASE_REVISION,
  REQUIRED_ASSET_INVENTORY,
  VALID_DEMO_TAG,
} from "../fixtures/deployment-fixtures";

/**
 * 031-demo-deployment production artifact audits.
 *
 * T015 (pulled forward with the T009 base change so the suite stays green):
 * build a simulated Pages release artifact — `/auto-racer/` base plus fixture
 * release identity — and assert the prefixed entry/module URLs, the compiled
 * public build identity, un-stamped hashed modules, the authored runtime
 * asset inventory, and the absence of source-only material.
 *
 * The suite builds its own artifact so expectations never depend on whatever
 * `dist/` happens to exist from a previous manual run.
 */

const ROOT = join(__dirname, "..", "..");
const DIST = join(ROOT, "dist");

function buildProductionArtifact(env: Record<string, string | undefined>): void {
  execFileSync(process.execPath, [join("node_modules", "vite", "bin", "vite.js"), "build"], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: "pipe",
    timeout: 240_000,
  });
}

function distFiles(dir: string): string[] {
  const collected: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...distFiles(full));
    } else if (entry.isFile()) {
      collected.push(full);
    }
  }
  return collected;
}

describe("T015: prefixed release production artifact", () => {
  let entryModuleUrl = "";

  beforeAll(() => {
    // Simulated Pages release build: repository prefix plus fixture identity.
    buildProductionArtifact({
      VITE_DEMO_BASE_URL: "/auto-racer/",
      VITE_DEMO_RELEASE_TAG: VALID_DEMO_TAG,
      VITE_DEMO_REVISION: RELEASE_REVISION,
      VITE_DEMO_BUILT_AT_UTC: FIXED_BUILD_TIME_UTC,
    });
  }, 300_000);

  it("entry document exists, is non-empty, and is the only root entry document", () => {
    const indexHtml = join(DIST, "index.html");
    expect(existsSync(indexHtml)).toBe(true);
    const content = readFileSync(indexHtml, "utf-8");
    expect(content.length).toBeGreaterThan(0);
    const rootDocuments = readdirSync(DIST).filter((name) => name.endsWith(".html"));
    expect(rootDocuments).toEqual(["index.html"]);
  });

  it("entry document references a hashed module beneath the repository prefix", () => {
    const content = readFileSync(join(DIST, "index.html"), "utf-8");
    const match = content.match(/<script[^>]*src="([^"]+)"/);
    expect(match).toBeTruthy();
    entryModuleUrl = match![1];
    expect(entryModuleUrl).toMatch(/^\/auto-racer\/assets\/index-[\w-]+\.js$/);
    // Hashed modules are content-addressed and must stay un-stamped
    // (Decision 6): no query/fragment on generated entry URLs.
    expect(entryModuleUrl).not.toContain("?");
    expect(existsSync(join(DIST, entryModuleUrl.replace(/^\/auto-racer\//, "")))).toBe(true);
  });

  it("generated module carries the compiled public build identity", () => {
    const modulePath = join(DIST, entryModuleUrl.replace(/^\/auto-racer\//, ""));
    const bundle = readFileSync(modulePath, "utf-8");
    expect(bundle).toContain(VALID_DEMO_TAG);
    expect(bundle).toContain(RELEASE_REVISION);
    expect(bundle).toContain(FIXED_BUILD_TIME_UTC);
  });

  it.each(REQUIRED_ASSET_INVENTORY.map((path) => [path]))(
    "authored runtime asset %s ships beneath the prefixed artifact",
    (relative) => {
      expect(existsSync(join(DIST, relative))).toBe(true);
      expect(statSync(join(DIST, relative)).size).toBeGreaterThan(0);
    },
  );

  it("contains no source maps", () => {
    expect(distFiles(DIST).filter((file) => file.endsWith(".map"))).toEqual([]);
  });

  it("contains no source-only trees or repository metadata", () => {
    const rootEntries = readdirSync(DIST);
    for (const forbidden of ["src", "tests", "specs", "scripts", "node_modules", ".git", ".github", ".specify"]) {
      expect(rootEntries).not.toContain(forbidden);
    }
    expect(rootEntries).not.toContain("package.json");
    expect(rootEntries).not.toContain("package-lock.json");
    expect(rootEntries).not.toContain("tsconfig.json");
  });
});