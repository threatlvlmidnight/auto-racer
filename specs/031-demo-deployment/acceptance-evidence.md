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

_(pending)_
