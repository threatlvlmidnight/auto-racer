#!/usr/bin/env node
/**
 * Feature 031-demo-deployment (T027): deterministic production artifact
 * inspection. Owns ONE exported, complete forbidden-path and
 * high-confidence credential-pattern rule set
 * (contracts/production-artifact-audit-contract.md). Every failure names its
 * rule identifier and artifact-relative path; matched credential values are
 * never printed. The audit claims exactly the defined rules — not detection
 * of every theoretically possible secret representation.
 *
 * Usage:
 *   node scripts/audit-production-artifact.mjs <dist-dir> \
 *     [--expect-tag <demo-tag>] [--expect-revision <sha>] [--json]
 */
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Complete forbidden-path rule set. Adding/removing/weakening a rule requires
 * updating the audit contract, its fixtures, and acceptance evidence together. */
export const FORBIDDEN_PATH_RULES = [
  { id: "forbidden:git-metadata", kind: "segment", values: [".git", ".github"] },
  { id: "forbidden:env-file", kind: "name-pattern", pattern: /^\.env(\..+)?$/ },
  { id: "forbidden:dependency-tree", kind: "segment", values: ["node_modules"] },
  { id: "forbidden:source-tree", kind: "segment", values: ["src", "tests", "specs", "scripts", "coverage"] },
  {
    id: "forbidden:package-manifest",
    kind: "name",
    values: ["package.json", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml"],
  },
  {
    id: "forbidden:tool-config",
    kind: "name-pattern",
    pattern:
      /^(tsconfig.*\.json|\.eslintrc.*|eslint\.config\..*|vite\.config\..*|vitest\.config\..*|\.prettierrc.*|\.prettierignore|\.eslintignore|\.editorconfig|\.npmrc)$/,
  },
  { id: "forbidden:speckit-config", kind: "segment", values: [".specify", ".claude"] },
  { id: "forbidden:log-or-temp", kind: "name-pattern", pattern: /^(.*\.log|logs|tmp|temp|.*\.tmp|.*\.swp|.*~)$/ },
  // Source maps are rejected until a later specification explicitly approves them.
  { id: "forbidden:source-map", kind: "extension", values: [".map"] },
  {
    id: "forbidden:credential-file",
    kind: "name-pattern",
    pattern:
      /^(.*\.pem|.*\.key|.*\.p12|.*\.pfx|.*\.keystore|.*\.jks|id_rsa.*|.*credentials\.json|.*-token\.json|secret\.json)$/,
  },
];

/** High-confidence credential scanner list (text-decodable files only). */
export const CREDENTIAL_PATTERN_RULES = [
  { id: "credential:pem-private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/ },
  { id: "credential:github-token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { id: "credential:aws-access-key", pattern: /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/ },
  { id: "credential:slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: "credential:openai-secret-key", pattern: /\bsk(?:-proj)?-[A-Za-z0-9_-]{20,}\b/ },
  { id: "credential:stripe-live-key", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/ },
  { id: "credential:google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
];

const TEXT_EXTENSIONS = new Set([
  ".html", ".js", ".mjs", ".css", ".svg", ".json", ".txt", ".xml", ".webmanifest",
]);
const APPROVED_ROOT_ENTRIES = new Set(["index.html", "assets"]);

function isTextFile(name) {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return TEXT_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

function forbiddenPathFailure(relPath, segments) {
  const base = segments[segments.length - 1];
  for (const rule of FORBIDDEN_PATH_RULES) {
    if (rule.kind === "segment" && segments.some((segment) => rule.values.includes(segment))) {
      return { rule: rule.id, path: relPath, detail: `path contains forbidden segment from rule ${rule.id}` };
    }
    if (rule.kind === "name" && rule.values.includes(base)) {
      return { rule: rule.id, path: relPath, detail: `file name is forbidden by rule ${rule.id}` };
    }
    if (rule.kind === "name-pattern" && rule.pattern.test(base)) {
      return { rule: rule.id, path: relPath, detail: `file name matches forbidden pattern of rule ${rule.id}` };
    }
    if (rule.kind === "extension" && rule.values.some((ext) => base.endsWith(ext))) {
      return { rule: rule.id, path: relPath, detail: `file extension is forbidden by rule ${rule.id}` };
    }
  }
  return undefined;
}

function collectFiles(root, failures) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const relPath = relative(root, full).split("\\").join("/");
      if (lstatSync(full).isSymbolicLink()) {
        failures.push({ rule: "forbidden:symlink", path: relPath, detail: "symbolic links are rejected" });
        continue;
      }
      if (relPath.startsWith("..")) {
        failures.push({ rule: "forbidden:path-escape", path: relPath, detail: "path escapes the artifact root" });
        continue;
      }
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push({ full, relPath });
      } else {
        failures.push({ rule: "forbidden:non-regular-file", path: relPath, detail: "only regular files are allowed" });
      }
    }
  };
  walk(root);
  files.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return files;
}

/**
 * Audits one artifact tree. Pure function of (rootDir, options) so tests and
 * the workflow share identical behavior. Returns { ok, failures }; failure
 * details never include matched credential values.
 */
export function auditArtifact(rootDir, options = {}) {
  const failures = [];
  const root = resolve(rootDir);
  let rootStat;
  try {
    rootStat = statSync(root);
  } catch {
    return {
      ok: false,
      failures: [{ rule: "artifact:missing-root", path: "", detail: `artifact directory not found: ${rootDir}` }],
    };
  }
  if (!rootStat.isDirectory()) {
    return {
      ok: false,
      failures: [{ rule: "artifact:missing-root", path: "", detail: `artifact root is not a directory: ${rootDir}` }],
    };
  }

  const rootEntries = readdirSync(root);
  const rootHtmlDocuments = rootEntries.filter((name) => name.endsWith(".html"));
  if (!rootEntries.includes("index.html")) {
    failures.push({ rule: "artifact:missing-entry", path: "index.html", detail: "entry document index.html is required" });
  } else if (statSync(join(root, "index.html")).size === 0) {
    failures.push({ rule: "artifact:empty-entry", path: "index.html", detail: "entry document index.html must be non-empty" });
  }
  if (rootHtmlDocuments.length > 1) {
    failures.push({
      rule: "artifact:multiple-entry-documents",
      path: rootHtmlDocuments.sort().join(","),
      detail: "index.html must be the only root entry document",
    });
  }
  for (const name of rootEntries) {
    if (!APPROVED_ROOT_ENTRIES.has(name)) {
      failures.push({
        rule: "artifact:unexpected-root-entry",
        path: name,
        detail: "runtime files must live under the approved generated/public asset roots",
      });
    }
  }

  const files = collectFiles(root, failures);
  let tagFound = false;
  let revisionFound = false;

  for (const file of files) {
    const segments = file.relPath.split("/");
    const pathFailure = forbiddenPathFailure(file.relPath, segments);
    if (pathFailure) {
      failures.push(pathFailure);
      continue;
    }
    if (!isTextFile(segments[segments.length - 1])) continue;
    let content;
    try {
      content = readFileSync(file.full, "utf-8");
    } catch {
      continue;
    }
    if (content.includes("\u0000")) continue; // binary payload mislabeled as text
    for (const rule of CREDENTIAL_PATTERN_RULES) {
      if (rule.pattern.test(content)) {
        failures.push({
          rule: rule.id,
          path: file.relPath,
          detail: `text file matches credential category ${rule.id} (matched value redacted)`,
        });
      }
    }
    if (options.expectTag && content.includes(options.expectTag)) tagFound = true;
    if (options.expectRevision && content.includes(options.expectRevision)) revisionFound = true;
  }

  if (options.expectTag && !tagFound) {
    failures.push({
      rule: "identity:missing-tag",
      path: "",
      detail: `expected demo tag not present in generated runtime output`,
    });
  }
  if (options.expectRevision && !revisionFound) {
    failures.push({
      rule: "identity:missing-revision",
      path: "",
      detail: `expected source revision not present in generated runtime output`,
    });
  }

  return { ok: failures.length === 0, failures };
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  let distDir;
  let expectTag;
  let expectRevision;
  let json = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--expect-tag") expectTag = args[++i];
    else if (args[i] === "--expect-revision") expectRevision = args[++i];
    else if (args[i] === "--json") json = true;
    else if (distDir === undefined) distDir = args[i];
  }
  if (distDir === undefined) {
    console.error("usage: audit-production-artifact.mjs <dist-dir> [--expect-tag <tag>] [--expect-revision <sha>] [--json]");
    process.exit(2);
  }
  const result = auditArtifact(distDir, { expectTag, expectRevision });
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`audit-production-artifact: PASS (${distDir})`);
  } else {
    for (const failure of result.failures) {
      const where = failure.path.length > 0 ? ` ${failure.path}` : "";
      console.error(`audit-production-artifact: FAIL [${failure.rule}]${where} — ${failure.detail}`);
    }
    console.error(`audit-production-artifact: ${result.failures.length} violation(s) in ${distDir}`);
  }
  process.exit(result.ok ? 0 : 1);
}