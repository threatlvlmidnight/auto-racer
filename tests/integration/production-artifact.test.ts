import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { REQUIRED_ASSET_INVENTORY } from "../fixtures/deployment-fixtures";

/**
 * 031-demo-deployment production artifact audits.
 *
 * Phase 1 baseline (T004): build the current production artifact and record
 * its pre-migration shape — relative `./` entry references from `base: "./"`
 * and the expected public asset families — before Phase 3 replaces this
 * baseline with prefixed-build tests (T015).
 *
 * The suite builds its own artifact so expectations never depend on whatever
 * `dist/` happens to exist from a previous manual run.
 */

const ROOT = join(__dirname, "..", "..");
const DIST = join(ROOT, "dist");
const DIST_ASSETS = join(DIST, "assets");

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

describe("T004 baseline: pre-migration production artifact", () => {
  beforeAll(() => {
    // Baseline: build with the pre-migration configuration and no deployment
    // identity inputs.
    buildProductionArtifact({
      VITE_DEMO_BASE_URL: undefined,
      VITE_DEMO_RELEASE_TAG: undefined,
      VITE_DEMO_REVISION: undefined,
      VITE_DEMO_BUILT_AT_UTC: undefined,
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

  it("entry document references a hashed generated module under assets/", () => {
    const content = readFileSync(join(DIST, "index.html"), "utf-8");
    const match = content.match(/<script[^>]*src="([^"]+)"/);
    expect(match).toBeTruthy();
    // Pre-migration shape: `base: "./"` produces relative entry references.
    expect(match![1]).toMatch(/^\.\/assets\/index-[\w-]+\.js$/);
    expect(existsSync(join(DIST, match![1].replace(/^\.\//, "")))).toBe(true);
  });

  it.each(REQUIRED_ASSET_INVENTORY.map((path) => [path]))(
    "authored runtime asset %s ships in the artifact",
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