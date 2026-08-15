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

### T043 — source/runtime path audit (PASS)

- Codified static audits (T013/T043 tests): zero root-absolute `/assets/`
  literals in `src/` or `index.html`; all 39 authored assets load through
  `runtimeAssetUrl()`; no traversal/leading-slash arguments; no hardcoded
  `/auto-racer` string literal in runtime sources; exactly one normalized
  base in `vite.config.ts`.
- Manual scans confirmed: the only root-absolute reference anywhere is
  `index.html`'s dev-time `<script src="/src/main.ts">`, which Vite rewrites
  base-aware at build time (dist entry verified as
  `/auto-racer/assets/index-*.js`); the only `../` hits in `src/` are
  type-only import specifiers; the only `auto-racer` string hit is the
  `auto-racer:test-day-recovery:v1` localStorage key (not a URL).
- Stable public assets are revision-stamped at runtime in release builds
  (`?rev=<short>`); Vite-hashed modules remain un-stamped (Decision 6).
  Observation (not a violation): `public/assets/entrants/` legacy PNGs ship
  in the artifact but are unreferenced by BootScene — content decision, not
  a deployment-rule breach.

### T044 — workflow audit (PASS)

- Codified: 15 T024 + 5 T035 static tests — trigger isolation (dispatch-only
  release, push/PR-only verify), least-privilege permissions per job,
  pre-checkout grammar/ref validation order, gated job dependencies,
  protected `github-pages` environment, serialized deployment concurrency,
  immutable 40-hex action pins, no mutable action tags, no secrets, no
  recursive deployment/rollback paths, artifact path scope `dist`.
- Manual confirmation: `.github/workflows/` contains exactly `verify.yml`
  and `deploy-demo.yml`; `.github/dependabot.yml` monitors the pinned
  actions weekly.

### T045 — release gate sequence (all PASS)

After a clean `npm ci` (exit 0):

1. Focused deployment suites: **241/241 passed**.
2. Full `npm test`: **63 files, 1432/1432 passed**.
3. `npm run lint`: clean.
4. `npm run build`: ✓ (pre-existing chunk-size warning only).
5. Simulated prefixed release build (`demo-v0.1.0` + HEAD revision):
   `dist/index.html` 1.30 kB, `dist/assets/index-5Irz2J7K.js` 1,715.81 kB.
6. `audit-production-artifact.mjs dist --expect-tag demo-v0.1.0
   --expect-revision <HEAD>`: **PASS**.
7. Local smoke against `preview:pages`: **healthy, 1 attempt, 83 ms**.

### T046 — viewport QA (network-level complete; interactive remains manual)

- Clean-cache network verification under `/auto-racer/`: entry 200/html,
  generated module 200/javascript with compiled identity, all 39 authored
  assets 200 with `?rev=` stamps, direct reload 200 (recorded at T022/T042).
- **Remaining manual item**: human-driven interactive walkthrough at
  1920×1080, 1366×768, 1024×768, and 800×450 (title → entrant → garage →
  pre-race → race → Results, seven regional backgrounds). Tool-driven canvas
  input was not attempted this session, mirroring feature 030's recorded
  approach.

### T047 — Constitution Check re-run against delivered code (PASS)

| Principle | Status | Delivered-code evidence |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | No prepare/simulation/contest/settlement code changed; full 1432-test suite green; deployment has zero outcome authority |
| II. Fairness | PASS | One identical public artifact for every tester; no paid or privileged path introduced |
| III. Transparency & Legibility | PASS | Running demo visibly identifies its exact tag and short revision; identity is compiled, audited, and smoke-checked |
| IV. Spectation-First | PASS | Watched-race experience untouched; the feature only makes it shareable by URL |
| V. Build Testing Access | PASS | Test Day ships inside the same verified static artifact with no service dependency |
| VI. Async-First Architecture | PASS | Demo is entirely static/serverless; no live matchmaking or backend; `specs/DEFERRED.md` now guards the feature-032 boundary |
| Product constraints | PASS | No 2D/topology/parity/theme rule touched |
| Development Workflow | PASS | specify → clarify → plan → tasks → implement with checklist PASS, TDD task gates, and recorded evidence |

Complexity Tracking: no constitutional violations or exceptional architecture.

### T049 — prepared first release (NOT pushed)

```sh
# After merging codex/031-demo-deployment into the default branch:
git checkout main && git pull
git tag -a demo-v0.1.0 -m "First public demo release" <approved-default-branch-commit>
git push origin demo-v0.1.0
# Then: Actions → Deploy demo release → Run workflow → release_tag: demo-v0.1.0
```

Owner checklist:

1. Merge this branch into the default branch (quickstart requires the first
   release tag to point at default-branch history).
2. One-time: Settings → Pages → Build and deployment → Source → **GitHub
   Actions**; confirm the `github-pages` environment permits the workflow
   (optional: add required reviewers for a second human gate).
3. Create and push `demo-v0.1.0` at the approved commit (tagging alone
   deploys nothing).
4. Manually dispatch **Deploy demo release** with `demo-v0.1.0`.
5. Confirm every stage is green and the workflow summary reports the URL,
   tag, revision, and healthy smoke result.
6. Open the URL in a clean browser; confirm the title footer shows
   `demo-v0.1.0 · <short-revision>` and the game is playable.

### T050 — first public release published (owner-authorized)

Owner authorization and administration completed 2026-08-14 (local): the
repository was made public, the one-time Pages enablement was performed
(Settings → Pages → Build and deployment → Source: **GitHub Actions**), and
the owner approved the live dispatch below.

1. `codex/031-demo-deployment` (tip `608f63d`) was merged into `main` as
   `310ab58` ("Merge feature 031: demo deployment"; first parent `c5fade8`,
   second parent `608f63d`).
2. Tag created and pushed at the approved revision:
   `git tag -a demo-v0.1.0 -m "First public demo release" 310ab58 &&
   git push origin demo-v0.1.0`. Remote resolution verified: annotated
   object `b67c7fe0f83718b601789773b341464d894fb954` dereferences to
   `310ab586069d168a2d0f0bad4e5fb22397a62c1e`.
3. The first dispatch (run `31859928398`) was made before the tag existed
   and failed exactly at the pre-checkout guard with
   `Tag 'demo-v0.1.0' does not exist in the repository; create it at the
   approved revision first.` — live confirmation of the no-tag-no-deploy
   behavior (FR-004); nothing was published by that run.
4. Second dispatch (run `31860050113`, 2026-08-15T02:46Z) succeeded end to
   end: "Validate tag, verify gates, build and audit artifact" (55s),
   "Deploy to GitHub Pages" (12s), "Post-deployment public smoke check"
   (15s) — all green; the smoke job reported the deployment healthy.
5. Independent verification from a clean client:
   `https://threatlvlmidnight.github.io/auto-racer/` → `200 text/html`;
   entry bundle `assets/index-BK_rZZTE.js` → `200` and contains both
   `demo-v0.1.0` and `310ab58` (build identity embedded and served).
6. Run URL:
   https://github.com/threatlvlmidnight/auto-racer/actions/runs/31860050113

Remaining manual acceptance: the interactive clean-cache four-viewport
browser walkthrough (title footer visible, full loop playable) — the same
manual-item pattern feature 030 used; its network-level equivalents are
recorded in T022/T046 and exercised by the smoke job above.

Informational: the run carried Node.js 20 deprecation annotations for the
pinned actions (GitHub forced Node 24; every step succeeded). Dependabot
watches the pins; bumping them later is housekeeping, not a release blocker.
