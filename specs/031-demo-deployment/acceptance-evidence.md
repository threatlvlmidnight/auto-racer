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

_(pending)_
