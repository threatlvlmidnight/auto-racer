#!/usr/bin/env node
/**
 * Feature 031-demo-deployment (T026): reusable local/post-checkout semantic
 * demo-tag validation and resolved-revision cross-check.
 *
 * Usage:
 *   node scripts/validate-demo-tag.mjs <demo-tag> [--expect-revision <sha>]
 *
 * Checks, in order:
 *   1. grammar: `demo-vMAJOR.MINOR.PATCH`, no omitted components, no leading
 *      zeros (workflow-owned logic validates this before any checkout too);
 *   2. the repository tag ref exists and resolves to exactly one commit;
 *   3. the checked-out HEAD matches the tag's commit (post-checkout
 *      cross-check — the workflow runs this after checking out the resolved
 *      revision and fetching the tag);
 *   4. when supplied, `--expect-revision` matches the resolved commit.
 *
 * Prints the resolved full revision to stdout on success. Exit codes:
 * 0 success, 1 resolution/cross-check failure, 2 grammar failure.
 */
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const DEMO_TAG_PATTERN = /^demo-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const FULL_REVISION_PATTERN = /^[0-9a-f]{40}$/;

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function validateDemoTagSyntax(tag) {
  // The explicit whitespace guard matters: `$` tolerates a trailing newline,
  // which would admit "demo-v1.0.0\n" through the anchor alone.
  if (typeof tag !== "string" || /\s/.test(tag) || !DEMO_TAG_PATTERN.test(tag)) {
    return {
      ok: false,
      error: `invalid demo tag grammar: expected demo-vMAJOR.MINOR.PATCH without omitted components or leading zeros`,
    };
  }
  return { ok: true };
}

export function crossCheckDemoTag({ tag, expectRevision, cwd }) {
  const syntax = validateDemoTagSyntax(tag);
  if (!syntax.ok) {
    return { ok: false, stage: "grammar", error: syntax.error };
  }
  let tagRevision;
  try {
    tagRevision = runGit(["rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`], cwd);
  } catch {
    return {
      ok: false,
      stage: "tag-resolution",
      error: `tag "${tag}" does not resolve to a commit in this repository`,
    };
  }
  if (!FULL_REVISION_PATTERN.test(tagRevision)) {
    return {
      ok: false,
      stage: "tag-resolution",
      error: `tag "${tag}" did not resolve to exactly one full commit identifier`,
    };
  }
  let headRevision;
  try {
    headRevision = runGit(["rev-parse", "HEAD"], cwd);
  } catch {
    return {
      ok: false,
      stage: "head-resolution",
      error: "HEAD does not resolve; run this inside a git checkout",
    };
  }
  if (headRevision !== tagRevision) {
    return {
      ok: false,
      stage: "cross-check",
      error: `checked-out revision ${headRevision} does not match tag "${tag}" revision ${tagRevision}`,
    };
  }
  if (expectRevision !== undefined && expectRevision !== tagRevision) {
    return {
      ok: false,
      stage: "expected-revision",
      error: `resolved revision ${tagRevision} does not match expected revision ${expectRevision}`,
    };
  }
  return { ok: true, revision: tagRevision };
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
  let tag;
  let expectRevision;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--expect-revision") {
      i += 1;
      expectRevision = args[i];
    } else if (tag === undefined) {
      tag = args[i];
    }
  }
  if (tag === undefined) {
    console.error("usage: validate-demo-tag.mjs <demo-tag> [--expect-revision <sha>]");
    process.exit(2);
  }
  const result = crossCheckDemoTag({ tag, expectRevision, cwd: process.cwd() });
  if (!result.ok) {
    console.error(`validate-demo-tag: ${result.stage}: ${result.error}`);
    process.exit(result.stage === "grammar" ? 2 : 1);
  }
  console.log(result.revision);
}