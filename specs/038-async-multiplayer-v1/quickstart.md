# Quickstart and Verification: Async Multiplayer V1

This file is an implementation/verification contract, not proof that Feature
038 is already implemented.

## Prerequisites

- Features 033/034 are present.
- Features 041/042 have landed and their exact version constants/catalog audits
  pass before the async manifest is frozen.
- Node/npm dependencies are installed.
- Local Supabase verification requires a Docker-compatible runtime; the normal
  disabled/static tests do not.

## 1. Static fallback first

```sh
npm test -- tests/unit/asyncCapability.test.ts \
  tests/integration/async-static-fallback.test.ts
npm run build
npm run build:pages
node scripts/audit-async-static-build.mjs dist
```

Required evidence:

- absent/disabled/unconfigured configurations are typed and non-throwing;
- no anonymous identity or storage preference is created before consent;
- `fetch` call count remains zero through boot, run creation, acquisition,
  setup, local contest, playback, and Results;
- no secret/service-role key or unintended pilot URL exists in `dist`;
- local output equals the pre-feature fixtures.

## 2. Pure contract and simulation

```sh
npm test -- tests/unit/asyncCanonicalPayload.test.ts \
  tests/unit/asyncCompatibility.test.ts \
  tests/unit/asyncGhost.test.ts \
  tests/unit/asyncContest.test.ts \
  tests/contract/async-multiplayer-contract.test.ts
node scripts/verify-async-contract.mjs
node scripts/benchmark-async-resolver.mjs
```

Required evidence:

- browser/Node/Deno fixtures have byte-equal canonical JSON and SHA-256;
- every manifest member participates in the compatibility key;
- unknown/missing Feature 033/034/041/042/track/content versions fail closed;
- publication rehydrates/validates instances and setup rather than trusting
  claimed totals;
- field is challenger + six canonical locals + one remote ghost before ranking;
- two identical inputs deep-equal in track, result, event order, and digests;
- async resolution never calls settlement or mutates the supplied run;
- p95 under 1.5 seconds and no accepted fixture exceeds current 2-second CPU
  limit; oversize results fail before becoming playable.

## 3. Local Supabase stack

```sh
npx supabase start
npx supabase db reset
npx supabase functions serve --env-file supabase/functions/.env.local
npm test -- tests/integration/async-supabase-local.test.ts \
  tests/integration/async-publish-flow.test.ts \
  tests/integration/async-discovery-race-flow.test.ts \
  tests/integration/async-safety-retention.test.ts
```

The ignored local env file contains only local/test secrets. Never check it in.

Required database/function evidence:

- two anonymous fixture users are isolated and ownership comes only from JWT;
- browser roles cannot directly select/insert/update/delete any service table or
  invoke a privileged database function;
- malformed, tampered, non-finite, duplicate, incompatible, oversize, stale,
  expired, withdrawn, moderated, blocked, foreign-offer, and idempotency-conflict
  fixtures fail before playable storage;
- exact retries return the original ghost/receipt;
- discovery never returns self, blocks, expired rows, or more than one bound
  offer and rotates eligible records;
- withdrawal is absent from the next discovery transactionally;
- delayed/failed Cron cannot re-expose ineligible rows;
- hourly cleanup and 30-day report cleanup are idempotent;
- application rate limits and `Retry-After` are exact under concurrent requests;
- logs contain bounded metadata and no forbidden values/payload fragments.

## 4. Browser integration automation

```sh
npm test -- tests/unit/asyncMultiplayerPresentation.test.ts \
  tests/integration/async-static-fallback.test.ts \
  tests/integration/async-publish-flow.test.ts \
  tests/integration/async-discovery-race-flow.test.ts
```

Required evidence:

- disclosure decline/close and lost-identity flows preserve local state;
- lobby handles disabled, unconfigured, connecting, empty pool, success,
  timeout, offline, 429, read-only, quota-stop, and server failure;
- publish/setup/discover controls share existing input semantics and bounded
  layout regions without requiring hover;
- a remote receipt enters normal watched playback without any resolver/network
  call during playback;
- pause, 1x/2x, skip, audio/mute, visibility, PiP, focus, standings, event log,
  and Results consume the same retained result;
- Results clearly say `UNSCORED ASYNC EXHIBITION` and offer report/block/return,
  never settlement/Next Stage;
- successful and failed async paths leave the exact run/RNG/encounter/history/
  standings/credits deep-equal.

## 5. Full automated gates

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run build:pages
npm run audit:artifact
node scripts/audit-async-static-build.mjs dist
npx supabase db reset
```

Record exact command, exit code, test count, resolver benchmark summary, static
request count, artifact byte audit, schema migration head, and verifier version
in implementation notes. Do not mark hosted/manual tasks complete.

## 6. Owner-only hosted pilot activation

Follow `operational-runbook.md`. This is `[OWNER-OPTIONAL-PILOT]`, not a DeepSeek
task. The owner records:

- separate Free project/organization and no payment/paid tier;
- exact allowed origins and anonymous Auth setting;
- migration/function/verifier version;
- service-control mode and current quota percentages;
- parity/RLS/retention/benchmark go/no-go result.

## 7. Manual frontier/owner verification

This is `[MANUAL-FRONTIER-OR-OWNER]`. DeepSeek supplies deterministic routes,
fixture IDs, expected state text, and viewport instructions but does not capture
screenshots or judge the UI.

Review at minimum:

- 1280×720, 1440×900, 1920×1080, and narrow/tall responsive target after
  Feature 044 lands;
- mouse, keyboard-only, and touch-equivalent input;
- disclosure/decline/consent, identity lost, disabled/unconfigured/offline;
- publish success/retry/withdrawal;
- empty pool, remote offer, expired offer, block/report;
- full eight-car playback and Results at 1x, 2x, pause, skip, muted/unmuted;
- remote provenance/version access without overlap or false scored language;
- normal local run before/after and the disabled Pages build.

The verifier confirms qualitative clarity, overlap, focus visibility, readable
provenance, and cross-device sameness. Any screenshot/listening evidence remains
outside the coding ledger.
