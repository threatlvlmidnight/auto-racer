# Acceptance Evidence: Demo Deployment

**Feature**: 031-demo-deployment | **Branch**: `codex/031-demo-deployment` | **Started**: 2026-08-14

## Phase 1 — Setup and deployment baselines

### T001 — Current production artifact baseline (pre-migration)

Captured from `npm run build` (vite v5.4.21, Node v20.19.5) on commit `4bf783d`
(merge of `codex/030-race-playback-controls` into `codex/031-demo-deployment`):

- **Build**: `✓ 82 modules transformed`, `dist/index.html` 1.29 kB,
  `dist/assets/index-CJsiLPf4.js` 1,710.53 kB (gzip 409.02 kB), built in 2.49 s.
  Pre-existing chunk-size warning only; `tsc --noEmit` clean.
- **Total artifact size**: 73 MB (`du -sh dist`).
- **Top-level contents**: exactly `index.html` and `assets/`.
- **Asset inventory**: 48 files under `dist/assets/` — `backgrounds/` (17:
  6 scenes, 7 regions, 4 garages), `entrants/` (4 legacy pre-010 PNGs copied
  from `public/`, not referenced by BootScene at runtime), `items/` (8 family
  images), `portraits/` (4), `vehicles/` (8), plus 7 root files (6 authored
  SVGs + the hashed entry module).
- **Entry reference**: `src="./assets/index-CJsiLPf4.js"` — relative, from
  `base: "./"`. This is the shape Phase 3 must convert to base-aware absolute
  URLs.
- **Source maps**: zero `*.map` files in `dist/`.
- **Runtime path hazard**: `BootScene` authors 19 literal `"/assets/..."`
  strings and 4 root-absolute template prefixes (garages, portraits, vehicles,
  item families) that bypass Vite's base rewriting (confirmed by T003).

### T005 — Baseline suites against the pre-migration build

`npx vitest run tests/integration/deployment-boundaries.test.ts tests/integration/production-artifact.test.ts`:
**2 files passed, 48/48 tests passed** (boundaries 5, artifact 43 including the
39-path authored inventory). Recorded legacy expectations:

- Entry URL is relative `./assets/index-*.js` (replaced by prefixed
  `/auto-racer/assets/index-*.js` expectations at T015).
- Root-absolute `/assets/` literals exist only in `BootScene` (rejected
  outright at T013).
- No intentional failures: the pre-migration build satisfies every baseline
  assertion as authored.

## Phase 2 — Foundational build identity and URL boundaries

### T006-T011 — build identity boundary (test-first)

- `tests/unit/buildIdentity.test.ts` written first (red), then
  `src/buildIdentity.ts`, `src/vite-env.d.ts`, and the `vite.config.ts`
  boundary implemented.
- `npx vitest run tests/unit/buildIdentity.test.ts`: **59/59 tests passed**
  covering release/local parsing, missing/malformed release inputs, short
  revision derivation, strict UTC validation, secret-free public fields
  (rejection without echoing the secret), base normalization (`/`,
  `/auto-racer/`, trailing-slash normalization, duplicate-separator and
  traversal rejection), leading-slash/traversal/absolute-URL/encoding
  rejection in `runtimeAssetUrl`, revision cache stamps, and the T011
  `createBuildIdentity(env)` test seam.
- `vite.config.ts` now consumes one normalized base
  (`VITE_DEMO_BASE_URL`, default `/`) and validates release inputs at
  configuration time; public identity fields are injected through
  `define` on `import.meta.env.VITE_DEMO_*` (tag, revision, UTC build time
  only — contract `build-identity-contract.md`).
- `npm run lint` clean; `npm run build` (vite + `tsc --noEmit`) clean;
  baseline `deployment-boundaries.test.ts` still **5/5** (BootScene
  untouched in this phase).

### T012 — regression run and recorded deviation

- BootScene/TitleScene unchanged, so their existing suites are unaffected.
- **Ordering deviation (recorded)**: the T015 prefixed-artifact tests were
  pulled forward into this phase because the T009 base change
  (`"./"` → normalized `/`) invalidated the T004 baseline's relative-entry
  expectation; leaving the old baseline would have committed a red suite.
  With the T009 config, the prefixed build produces
  `src="/auto-racer/assets/index-*.js"` as required.
- Expected red until Phase 3 wiring: one production-artifact test
  ("generated module carries the compiled public build identity") fails
  because `src/buildIdentity.ts` is not yet imported by any scene, so it is
  tree-shaken from the bundle. T016/T018 wire it in and turn this green.

## Phase 3 — User Story 1: playable prefixed demo

### T013-T021 — asset boundary migration and title identity footer

- `tests/integration/deployment-boundaries.test.ts` now rejects any
  root-absolute `/assets/` literal in `src/` and `index.html`, requires all
  39 authored asset paths to load through `runtimeAssetUrl()`, and enforces
  the single-base/no-traversal/no-hardcoded-prefix guards (T043's static
  audits codified).
- `BootScene` migrated to `runtimeAssetUrl()` for all 19 literal paths and
  the four composed families (garages, portraits, vehicles, item families);
  every texture key preserved.
- `titlePresentation.ts` (pure) renders `<demo-tag> · <short-revision>` for
  releases and an honest `local development · <short>` label otherwise;
  `TitleScene` shows it in the pre-existing footer slot (no displacement of
  the primary action). T014: 4/4 unit tests.
- `index.html` audited for T019: no change required — it carries no
  root-absolute runtime asset references; Vite rewrites the single module
  entry, and the game has no client-side routes, so no hosting fallback is
  needed. Recorded as the T019 index.html outcome.
- T020 revision cache stamps live in `runtimeAssetUrl()`
  (`?rev=<encoded short revision>`, release builds only; Vite-hashed modules
  untouched).
- T021 added `build:pages`/`preview:pages` (plus `verify`, `audit:artifact`)
  without touching the existing `test`/`lint`/`build` scripts.

### T022 — prefixed local verification run

Full gates on merge commit `4bf783d` + Phase 1-3 work:

- `npm test`: **61 files, 1329/1329 tests passed** (was 57 files / 1,191
  tests at feature 030's completion).
- `npm run lint` clean; `npm run build` clean (pre-existing chunk-size
  warning only).
- Simulated release build: `VITE_DEMO_RELEASE_TAG=demo-v0.0.0
  VITE_DEMO_REVISION=$(git rev-parse HEAD) VITE_DEMO_BUILT_AT_UTC=$(date -u
  +…) npm run build:pages` → entry
  `src="/auto-racer/assets/index-D_dLyZoo.js"`.
- `npm run preview:pages` served the artifact beneath
  `http://localhost:4173/auto-racer/`:
  - entry document `200 text/html`; direct reload `200` (no fallback needed);
  - generated module `200 text/javascript`, contains the compiled identity
    (`demo-v0.0.0` present in the bundle → title footer source confirmed);
  - **all 39 authored runtime assets returned `200`** beneath the prefix with
    their `?rev=bf5bbfa` cache stamps (0 failures).
- **Remaining manual item**: the interactive clean-cache browser walkthrough
  (title → entrant select → garage → pre-race → race → Results, all seven
  regional backgrounds, four viewports) requires a human-driven browser; the
  network-level equivalent of SC-001/SC-002 is recorded above.

## Phase 4 — User Story 2: controlled publishing

### T023-T032 — tag validation, artifact audit, and release workflows

- `scripts/validate-demo-tag.mjs` (T026): grammar → tag resolution → HEAD
  cross-check → optional `--expect-revision`; driven black-box by 24 CLI
  tests in temporary git repos, including previous-tag restoration through
  the same validation path (FR-012). A trailing-newline grammar hole
  (`$` admits `\n` in JS regex) was found while writing fixtures and closed
  with an explicit whitespace guard in the client module, the script, and the
  workflow-owned check (exact-equality `grep -Eo` match).
- `scripts/audit-production-artifact.mjs` (T027): one exported complete
  rule set (10 forbidden-path rules + 7 credential patterns), deterministic
  walk rejecting symlinks/non-regular files/path escapes, required entry
  shape, identity presence checks, redacted failures. T025 covers every rule
  with positive fixtures, near-miss negative fixtures, and the redaction
  requirement (30 audit tests).
- `.github/workflows/verify.yml` (T029): push/PR-only, `contents: read`,
  locked install + tests + lint + build, zero Pages authority.
- `.github/workflows/deploy-demo.yml` (T030/T031): `workflow_dispatch` only
  with required `release_tag`; workflow-owned grammar check and `git
  ls-remote` exact-ref resolution BEFORE selected-tag checkout; checkout of
  the resolved revision; repository validator cross-check; full gates;
  identity build; artifact audit with expected identity; `dist`-only Pages
  artifact upload; protected `github-pages` environment deploy with exactly
  `pages: write` + `id-token: write`; serialized deployments
  (`cancel-in-progress: false`); deployment summary (T039 partial).
- `.github/dependabot.yml` (T032) monitors the pinned actions. Action pins
  resolved live from each action repository's tags (lightweight tags →
  commit SHAs): checkout v4.4.0 `11d5960a…`, setup-node v4.4.0 `49933ea5…`,
  configure-pages v5.0.0 `983d7736…`, upload-pages-artifact v3.0.1
  `56afc609…`, deploy-pages v4.0.5 `d6db9016…`.
- T024 enforces all of the above statically (15 workflow tests), including
  pre-checkout validation order, least privilege per job, immutable pins, no
  secrets, and no mutable action tags.
- package scripts `verify` and `audit:artifact` added (T028) without
  weakening `test`/`lint`/`build`.

### T033 — release-shape proof run

- Simulated release build (`demo-v0.0.0` + current HEAD revision) then
  `node scripts/audit-production-artifact.mjs dist --expect-tag demo-v0.0.0
  --expect-revision <HEAD>` → **PASS**: no forbidden path, no credential
  pattern, expected identity present in generated output.
- Full suite: **1411/1411 tests passed** (63 files). `npm run lint` clean.
- Invalid-input proof: grammar rejection runs before any checkout, and every
  failed pre-deployment gate happens before `upload-pages-artifact`, so a
  failing release cannot reach deployment (workflow structure, enforced by
  T024 index-order assertions).

## Phase 5 — User Story 3: health and recovery

### T034-T039 — smoke checker, workflow wiring, health summaries

- `scripts/smoke-demo.mjs` (T037): bounded-retry entry availability
  (default 2-minute budget), entry/module/content-type checks, module
  identity assertions, six representative stamped asset checks, exact
  failing-URL diagnostics, manual-recovery guidance, zero mutation.
- T034 drives the real CLI against in-process HTTP fixture servers:
  **12/12 tests** covering transient-then-recovered entry (reports 3
  attempts), permanent HTTP 500, connection-refused, wrong entry
  content-type, missing module reference, missing module, identity
  mismatch, missing asset, empty body, SPA-fallback masking, and recovery
  instructions. All bounded (each failing drill completed in ~1.5 s against
  a 1.5 s budget).
- **Hardening found live**: `vite preview` (like SPA-fallback hosts) serves
  `index.html` with HTTP 200 for missing asset paths. The checker now
  rejects `text/html` responses for representative assets as "resolved to
  the HTML entry fallback; the asset is missing" (regression test added).
- `deploy-demo.yml` gained the read-only post-deployment `smoke` job (T038):
  receives only the returned page URL plus expected tag/revision, checks out
  the deployed revision for the versioned checker, and marks health without
  any deployment authority. T039: deploy and smoke jobs publish tag,
  revision, URL, and healthy/unhealthy result to `GITHUB_STEP_SUMMARY`.
  T035 statically enforces no-rollback/no-recursive-deployment shape.

### T036/T040 — operator runbook

README gained "Demo deployment (GitHub Pages)": one-time Pages enablement,
tag-then-dispatch publishing, gate sequence, summary/footer inspection,
ordinary releases, manual previous-tag rollback, and local validation
commands. T036 contract-tests the required runbook content (4 tests).

### T041 — failure-triage and recovery evidence templates

Build/verification failure (pre-deployment):

```text
Failed stage: <tag-validation | gates | build | audit>
Release tag: <demo-vX.Y.Z>
Evidence: workflow run URL, failed step log
Public impact: none — the live demo is unchanged
Action: fix forward at the source, re-tag or re-dispatch the same tag
```

Hosting/runtime failure (post-deployment smoke):

```text
Failed resource: <exact URL from smoke output>
Last status/error: <HTTP status or network error>
Release tag / revision: <demo-vX.Y.Z> / <sha>
Action: manually re-dispatch Deploy demo release with the previous healthy
demo tag (README: Manual rollback). No automatic rollback runs.
```

### T042 — local prefixed-server drill results

Against `npm run build:pages` + `npm run preview:pages`
(`http://localhost:4173/auto-racer/`, revision `f103e9f`):

| Drill | Result |
|---|---|
| Healthy simulated release `demo-v0.1.0` | exit 0 — `healthy … after 1 attempt(s)` |
| Forced missing asset (`title-race.svg` removed) | exit 1 — unhealthy, names `…/assets/title-race.svg?rev=f103e9f` and the HTML-fallback cause |
| Forced identity mismatch (`--tag demo-v9.9.9`) | exit 1 — unhealthy, `identity-tag` names the module URL |
| Previous-tag recovery (`demo-v0.0.9` rebuilt through the same pipeline) | exit 0 — healthy; bundle carries the restored tag (title footer source confirmed) |

## Phase 6 — Polish and release gates

_(pending)_
