#!/usr/bin/env node
/**
 * Feature 031-demo-deployment (T037): bounded-retry public smoke check for a
 * deployed demo (contracts/smoke-check-contract.md).
 *
 * Checks, in order:
 *   1. entry document returns a successful HTML response (bounded availability
 *      retries — deployment completion and CDN availability can briefly
 *      diverge);
 *   2. entry document references a generated module under the expected base;
 *   3. that module returns successfully with script content;
 *   4. representative runtime assets return successful, non-empty responses;
 *   5. public build output contains the expected release identity.
 *
 * Usage:
 *   node scripts/smoke-demo.mjs --url <canonical-page-url> --tag <demo-tag> \
 *     --revision <sha> [--timeout-ms 120000] [--retry-delay-ms 3000]
 *
 * The checker observes the live artifact only: it returns a failing exit
 * status with exact failing-URL diagnostics, and never mutates or rolls
 * anything back. Recovery is always manual previous-tag redeployment.
 */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_RETRY_DELAY_MS = 3_000;

/** Representative required runtime assets (base-relative, no leading slash).
 * Mirrors tests/fixtures/deployment-fixtures.ts REPRESENTATIVE_SMOKE_ASSETS. */
export const REPRESENTATIVE_SMOKE_ASSETS = [
  "assets/title-race.svg",
  "assets/backgrounds/scenes/championship-race-start.png",
  "assets/portraits/generated/evelyn-mercer.png",
  "assets/vehicles/generated/the-highwheel.png",
  "assets/items/families/coachworks-power.png",
  "assets/backgrounds/regions/british-isles.png",
];

const MODULE_SRC_PATTERN = /<script[^>]+type="module"[^>]*src="([^"]+)"/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeResponse(response) {
  return `HTTP ${response.status} ${response.statusText ?? ""}`.trim();
}

async function fetchEntryWithRetries(url, timeoutMs, retryDelayMs, failures) {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  let last;
  for (;;) {
    attempts += 1;
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (response.ok) {
        return { response, attempts };
      }
      last = describeResponse(response);
    } catch (error) {
      last = `network error: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (Date.now() + retryDelayMs > deadline) {
      failures.push({
        check: "entry-availability",
        url,
        detail: `entry document unavailable after ${attempts} attempt(s); last result: ${last}`,
      });
      return undefined;
    }
    await sleep(retryDelayMs);
  }
}

/**
 * Runs the complete smoke sequence against one deployment URL. Pure observer:
 * returns { healthy, failures, attempts, elapsedMs, baseUrl } and never
 * performs any deployment mutation.
 */
export async function runSmokeChecks({ url, tag, revision, timeoutMs, retryDelayMs }) {
  const startedAt = Date.now();
  const failures = [];
  const baseUrl = new URL(url).pathname.replace(/\/?$/, "/");

  const entry = await fetchEntryWithRetries(url, timeoutMs, retryDelayMs, failures);
  if (entry === undefined) {
    return { healthy: false, failures, attempts: 0, elapsedMs: Date.now() - startedAt, baseUrl };
  }

  const entryContentType = entry.response.headers.get("content-type") ?? "";
  if (!entryContentType.includes("text/html")) {
    failures.push({
      check: "entry-content",
      url,
      detail: `entry document returned content-type "${entryContentType}", expected text/html`,
    });
  }
  const entryHtml = await entry.response.text();

  const moduleMatch = entryHtml.match(MODULE_SRC_PATTERN);
  let moduleUrl;
  if (!moduleMatch) {
    failures.push({
      check: "entry-module-reference",
      url,
      detail: "entry document does not reference a generated module script",
    });
  } else {
    moduleUrl = new URL(moduleMatch[1], url).toString();
    if (!new URL(moduleUrl).pathname.startsWith(baseUrl)) {
      failures.push({
        check: "entry-module-base",
        url: moduleUrl,
        detail: `generated module escapes the expected base "${baseUrl}"`,
      });
    }
  }

  if (moduleUrl !== undefined) {
    let moduleBody;
    try {
      const moduleResponse = await fetch(moduleUrl);
      if (!moduleResponse.ok) {
        failures.push({
          check: "module-fetch",
          url: moduleUrl,
          detail: `generated module returned ${describeResponse(moduleResponse)}`,
        });
      } else {
        const moduleContentType = moduleResponse.headers.get("content-type") ?? "";
        if (!moduleContentType.includes("javascript") && !moduleContentType.includes("ecmascript")) {
          failures.push({
            check: "module-content",
            url: moduleUrl,
            detail: `generated module returned content-type "${moduleContentType}"`,
          });
        }
        moduleBody = await moduleResponse.text();
      }
    } catch (error) {
      failures.push({
        check: "module-fetch",
        url: moduleUrl,
        detail: `generated module network error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    if (moduleBody !== undefined) {
      if (!moduleBody.includes(tag)) {
        failures.push({
          check: "identity-tag",
          url: moduleUrl,
          detail: `public build output does not contain expected release tag "${tag}"`,
        });
      }
      if (!moduleBody.includes(revision)) {
        failures.push({
          check: "identity-revision",
          url: moduleUrl,
          detail: "public build output does not contain expected source revision",
        });
      }
    }
  }

  const shortRevision = /^[0-9a-f]{40}$/.test(revision) ? revision.slice(0, 7) : revision;
  for (const relative of REPRESENTATIVE_SMOKE_ASSETS) {
    const assetUrl = new URL(`${baseUrl}${relative}?rev=${encodeURIComponent(shortRevision)}`, url).toString();
    try {
      const response = await fetch(assetUrl);
      if (!response.ok) {
        failures.push({
          check: "representative-asset",
          url: assetUrl,
          detail: `representative asset returned ${describeResponse(response)}`,
        });
        continue;
      }
      const assetContentType = response.headers.get("content-type") ?? "";
      if (assetContentType.includes("text/html")) {
        // SPA-fallback hosts (including vite preview) serve the entry document
        // for missing paths with HTTP 200; that is a missing asset, not an asset.
        failures.push({
          check: "representative-asset",
          url: assetUrl,
          detail: `representative asset resolved to the HTML entry fallback (${assetContentType}); the asset is missing`,
        });
        continue;
      }
      const body = await response.arrayBuffer();
      if (body.byteLength === 0) {
        failures.push({
          check: "representative-asset",
          url: assetUrl,
          detail: "representative asset returned an empty body",
        });
      }
    } catch (error) {
      failures.push({
        check: "representative-asset",
        url: assetUrl,
        detail: `representative asset network error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return {
    healthy: failures.length === 0,
    failures,
    attempts: entry.attempts,
    elapsedMs: Date.now() - startedAt,
    baseUrl,
  };
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
  const options = { url: undefined, tag: undefined, revision: undefined, timeoutMs: DEFAULT_TIMEOUT_MS, retryDelayMs: DEFAULT_RETRY_DELAY_MS };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--url") options.url = args[++i];
    else if (args[i] === "--tag") options.tag = args[++i];
    else if (args[i] === "--revision") options.revision = args[++i];
    else if (args[i] === "--timeout-ms") options.timeoutMs = Number(args[++i]);
    else if (args[i] === "--retry-delay-ms") options.retryDelayMs = Number(args[++i]);
  }
  if (options.url === undefined || options.tag === undefined || options.revision === undefined) {
    console.error("usage: smoke-demo.mjs --url <page-url> --tag <demo-tag> --revision <sha> [--timeout-ms N] [--retry-delay-ms N]");
    process.exit(2);
  }
  const result = await runSmokeChecks(options);
  if (result.healthy) {
    console.log(
      `smoke-demo: healthy at ${options.url} (entry available after ${result.attempts} attempt(s), ${result.elapsedMs} ms)`,
    );
    process.exit(0);
  }
  console.error(`smoke-demo: unhealthy deployment at ${options.url}`);
  console.error(`stage: post-deployment — the new artifact is live; no automatic rollback will run`);
  for (const failure of result.failures) {
    console.error(`  [${failure.check}] ${failure.url} — ${failure.detail}`);
  }
  console.error(
    "recovery: manually re-dispatch the demo release workflow with the previous healthy demo tag (README: Manual rollback)",
  );
  process.exit(1);
}
