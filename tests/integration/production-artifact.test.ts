import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CREDENTIAL_PATTERN_FIXTURES,
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

// ---------------------------------------------------------------------------
// T025: production-artifact audit rule coverage — every forbidden-path rule
// and credential pattern from the audit contract, exercised through the real
// scripts/audit-production-artifact.mjs CLI against fixture trees.
// ---------------------------------------------------------------------------

const AUDIT_SCRIPT = join(ROOT, "scripts", "audit-production-artifact.mjs");
const auditDirs: string[] = [];

function makeAuditTree(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "auto-racer-artifact-"));
  auditDirs.push(dir);
  for (const relPath of Object.keys(files)) {
    const full = join(dir, relPath);
    const parts = relPath.split("/");
    if (parts.length > 1) {
      mkdirSync(join(dir, parts.slice(0, -1).join("/")), { recursive: true });
    }
    writeFileSync(full, files[relPath]);
  }
  return dir;
}

function runAudit(args: string[]) {
  return spawnSync(process.execPath, [AUDIT_SCRIPT, ...args], { encoding: "utf-8" });
}

function cleanTree(): Record<string, string> {
  return {
    "index.html": `<!doctype html><script type="module" src="/auto-racer/assets/index-fixture.js"></script>`,
    "assets/index-fixture.js":
      `export const tag = "${VALID_DEMO_TAG}"; export const revision = "${RELEASE_REVISION}";`,
    "assets/images/title.png": "(binary fixture placeholder)",
  };
}

afterAll(() => {
  for (const dir of auditDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("T025: audit passes clean artifacts and enforces identity expectations", () => {
  it("passes a clean production-shaped tree", () => {
    const dir = makeAuditTree(cleanTree());
    const result = runAudit([dir]);
    expect(result.status).toBe(0);
  });

  it("passes when the expected tag and revision are present in runtime output", () => {
    const dir = makeAuditTree(cleanTree());
    const result = runAudit([dir, "--expect-tag", VALID_DEMO_TAG, "--expect-revision", RELEASE_REVISION]);
    expect(result.status).toBe(0);
  });

  it("fails when the expected identity is absent from the artifact", () => {
    const dir = makeAuditTree({
      "index.html": "<!doctype html><script src=\"/auto-racer/assets/app.js\"></script>",
      "assets/app.js": "export const anonymous = true;",
    });
    const result = runAudit([dir, "--expect-tag", VALID_DEMO_TAG, "--expect-revision", RELEASE_REVISION]);
    expect(result.status).toBe(1);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("identity:missing-tag");
    expect(output).toContain("identity:missing-revision");
  });

  it("fails when the artifact root does not exist", () => {
    const result = runAudit([join(tmpdir(), "auto-racer-artifact-does-not-exist")]);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("artifact:missing-root");
  });
});
describe("T025: every forbidden-path rule rejects its positive fixture", () => {
  it.each([
    [".git/config", "forbidden:git-metadata"],
    [".github/CODEOWNERS", "forbidden:git-metadata"],
    [".env", "forbidden:env-file"],
    [".env.local", "forbidden:env-file"],
    ["node_modules/phaser/index.js", "forbidden:dependency-tree"],
    ["src/main.ts", "forbidden:source-tree"],
    ["tests/unit/x.test.ts", "forbidden:source-tree"],
    ["specs/spec.md", "forbidden:source-tree"],
    ["scripts/tool.mjs", "forbidden:source-tree"],
    ["coverage/lcov.info", "forbidden:source-tree"],
    ["assets/package.json", "forbidden:package-manifest"],
    ["assets/package-lock.json", "forbidden:package-manifest"],
    ["assets/tsconfig.json", "forbidden:tool-config"],
    ["assets/.eslintrc.json", "forbidden:tool-config"],
    ["assets/vite.config.ts", "forbidden:tool-config"],
    [".specify/feature.json", "forbidden:speckit-config"],
    ["assets/debug.log", "forbidden:log-or-temp"],
    ["assets/edit.tmp", "forbidden:log-or-temp"],
    ["assets/index.js.map", "forbidden:source-map"],
    ["assets/server.pem", "forbidden:credential-file"],
    ["assets/id_rsa", "forbidden:credential-file"],
  ])("rejects %s with the %s rule", (relPath, ruleId) => {
    const tree = cleanTree();
    tree[relPath] = "forbidden fixture content";
    const dir = makeAuditTree(tree);
    const result = runAudit([dir]);
    expect(result.status).toBe(1);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain(ruleId);
    expect(output).toContain(relPath);
  });

  it("rejects symbolic links inside the artifact", () => {
    const dir = makeAuditTree(cleanTree());
    symlinkSync(join(dir, "index.html"), join(dir, "assets", "sneaky-link.html"));
    const result = runAudit([dir]);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("forbidden:symlink");
  });

  it("rejects a missing entry document", () => {
    const dir = makeAuditTree({ "assets/app.js": "export {};" });
    const result = runAudit([dir]);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("artifact:missing-entry");
  });

  it("rejects an empty entry document", () => {
    const dir = makeAuditTree({ "index.html": "", "assets/app.js": "export {};" });
    const result = runAudit([dir]);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("artifact:empty-entry");
  });

  it("rejects a second root entry document and unexpected root entries", () => {
    const dir = makeAuditTree({
      ...cleanTree(),
      "extra.html": "<!doctype html>",
      "favicon.ico": "not really an icon",
    });
    const result = runAudit([dir]);
    expect(result.status).toBe(1);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("artifact:multiple-entry-documents");
    expect(output).toContain("artifact:unexpected-root-entry");
  });
});

describe("T025: credential pattern fixtures (positive and negative, redacted)", () => {
  it.each(CREDENTIAL_PATTERN_FIXTURES.map((fixture) => [fixture.rule, fixture.positive]))(
    "%s rejects its positive fixture without printing the secret",
    (ruleId, positive) => {
      const tree = cleanTree();
      tree["assets/leak.txt"] = positive;
      const dir = makeAuditTree(tree);
      const result = runAudit([dir]);
      expect(result.status).toBe(1);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toContain(ruleId);
      // Redaction requirement: the audit must never print a matched value.
      for (const line of positive.split("\n")) {
        if (line.trim().length > 0) {
          expect(output).not.toContain(line.trim());
        }
      }
    },
  );

  it.each(CREDENTIAL_PATTERN_FIXTURES.map((fixture) => [fixture.rule, fixture.negative]))(
    "%s accepts its near-miss negative fixture",
    (_ruleId, negative) => {
      const tree = cleanTree();
      tree["assets/near-miss.txt"] = negative;
      const dir = makeAuditTree(tree);
      const result = runAudit([dir]);
      expect(result.status).toBe(0);
    },
  );
});