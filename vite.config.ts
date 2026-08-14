import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import {
  BuildIdentityError,
  isFullRevision,
  isValidDemoReleaseTag,
  isValidUtcTimestamp,
  normalizeBaseUrl,
} from "./src/buildIdentity";

// Feature 031-demo-deployment (T009/T019): one normalized build base and
// public-only build identity. Local development and preview build from `/`;
// the simulated Pages build and the release workflow set
// VITE_DEMO_BASE_URL=/auto-racer/ plus the release identity variables.
// Vite's generated entry/module URLs and every Phaser-loaded public asset
// (via runtimeAssetUrl) share this single boundary — the game has no
// client-side routes, so no hosting fallback rewrites are required.
const BASE_URL = normalizeBaseUrl(process.env.VITE_DEMO_BASE_URL ?? "/");

function resolveGitRevision(): string {
  try {
    const revision = execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return isFullRevision(revision) ? revision : "dev";
  } catch {
    return "dev";
  }
}

const RELEASE_TAG = (process.env.VITE_DEMO_RELEASE_TAG ?? "").trim();
const REVISION = (process.env.VITE_DEMO_REVISION ?? "").trim() || resolveGitRevision();
const BUILT_AT_UTC = (process.env.VITE_DEMO_BUILT_AT_UTC ?? "").trim() || new Date().toISOString();

if (RELEASE_TAG.length > 0) {
  // Release builds fail at configuration time on missing or malformed inputs
  // (contracts/build-identity-contract.md) — before any bundle is produced.
  if (!isValidDemoReleaseTag(RELEASE_TAG)) {
    throw new BuildIdentityError("VITE_DEMO_RELEASE_TAG is not a valid semantic demo tag (demo-vMAJOR.MINOR.PATCH)");
  }
  if (!isFullRevision(REVISION)) {
    throw new BuildIdentityError("VITE_DEMO_REVISION must be a full 40-character hex commit identifier");
  }
  if (!isValidUtcTimestamp(BUILT_AT_UTC)) {
    throw new BuildIdentityError("VITE_DEMO_BUILT_AT_UTC must be a valid UTC ISO 8601 timestamp");
  }
}

// Feature 001-core-loop: plain Vite + Phaser + TS, no framework glue needed yet.
export default defineConfig({
  base: BASE_URL,
  define: {
    // Public, non-secret build identity only (build-identity-contract.md).
    "import.meta.env.VITE_DEMO_RELEASE_TAG": JSON.stringify(RELEASE_TAG),
    "import.meta.env.VITE_DEMO_REVISION": JSON.stringify(REVISION),
    "import.meta.env.VITE_DEMO_BUILT_AT_UTC": JSON.stringify(BUILT_AT_UTC),
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});