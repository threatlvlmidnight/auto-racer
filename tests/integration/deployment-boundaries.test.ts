import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { INVALID_DEMO_TAGS, PRIOR_RELEASE_TAG, REQUIRED_ASSET_INVENTORY, VALID_DEMO_TAG } from "../fixtures/deployment-fixtures";

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

// ---------------------------------------------------------------------------
// T023: semantic demo-tag grammar and resolved-revision cross-check, driven
// through the real scripts/validate-demo-tag.mjs CLI in temporary git repos.
// ---------------------------------------------------------------------------

const VALIDATOR_SCRIPT = join(ROOT, "scripts", "validate-demo-tag.mjs");
const tempDirs: string[] = [];

function runValidator(args: string[], cwd: string) {
  return spawnSync(process.execPath, [VALIDATOR_SCRIPT, ...args], { cwd, encoding: "utf-8" });
}

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "auto-racer-demo-tag-"));
  tempDirs.push(dir);
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf-8" }).trim();
  git(["init", "-q"]);
  git(["config", "user.email", "release@example.com"]);
  git(["config", "user.name", "Release Fixture"]);
  return dir;
}

function commit(dir: string, fileName: string, message: string): string {
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf-8" }).trim();
  writeFileSync(join(dir, fileName), `${message}\n`);
  git(["add", "."]);
  git(["commit", "-q", "-m", message]);
  return git(["rev-parse", "HEAD"]);
}

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("T023: semantic demo-tag grammar rejection", () => {
  const emptyDir = makeRepo();

  it.each(INVALID_DEMO_TAGS.filter((tag) => tag.length > 0).map((tag) => [JSON.stringify(tag)]))(
    "rejects %s before touching any repository state",
    (tag) => {
      const result = runValidator([tag], emptyDir);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("grammar");
    },
  );
});

describe("T023: tag resolution and revision cross-check", () => {
  const dir = makeRepo();
  const firstRevision = commit(dir, "game.txt", "first approved revision");

  it("accepts a valid tag checked out at its own commit and prints the revision", () => {
    execFileSync("git", ["tag", VALID_DEMO_TAG], { cwd: dir });
    const result = runValidator([VALID_DEMO_TAG], dir);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(firstRevision);
  });

  it("accepts the exact expected revision supplied by the workflow resolver", () => {
    const result = runValidator([VALID_DEMO_TAG, "--expect-revision", firstRevision], dir);
    expect(result.status).toBe(0);
  });

  it("fails when a grammar-valid tag does not exist in the repository", () => {
    const result = runValidator(["demo-v9.9.9"], dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("tag-resolution");
  });

  it("fails when HEAD has moved past the tagged revision", () => {
    commit(dir, "later.txt", "unapproved later work");
    const result = runValidator([VALID_DEMO_TAG], dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("cross-check");
  });

  it("fails when the expected revision disagrees with the tag", () => {
    execFileSync("git", ["checkout", "-q", `refs/tags/${VALID_DEMO_TAG}`], { cwd: dir });
    const result = runValidator([VALID_DEMO_TAG, "--expect-revision", "0".repeat(40)], dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expected-revision");
  });

  it("restores a previous demo tag through the same validation path (FR-012)", () => {
    // Tag the older commit as the prior release, check it out, and revalidate:
    // recovery is the same release operation, not a separate rollback path.
    execFileSync("git", ["tag", PRIOR_RELEASE_TAG, firstRevision], { cwd: dir });
    execFileSync("git", ["checkout", "-q", `refs/tags/${PRIOR_RELEASE_TAG}`], { cwd: dir });
    const result = runValidator([PRIOR_RELEASE_TAG, "--expect-revision", firstRevision], dir);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(firstRevision);
  });
});