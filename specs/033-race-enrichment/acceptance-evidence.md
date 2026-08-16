# Feature 033 acceptance evidence

**Feature**: Race Enrichment · **Branch**: `033-race-enrichment`

Live-recorded evidence for Feature 033's executable/validation gates. This record
is the acceptance-evidence target named throughout `specs/033-race-enrichment/`
(quickstart.md, tasks.md). Entries are appended as implementation proceeds and
never rewritten to hide a failed measurement.

## Phase 1 — Setup and deterministic baselines (T001–T006)

Run date: 2026-08-15 on branch `033-race-enrichment`.

Build/tooling baseline:

- Node 20.19.5, Vitest 2.1.9, TypeScript 5.5.
- `npm test`: **86 files / 1563 tests passed** (includes the new
  `race-enrichment-baseline.test.ts`, 8 tests).
- `npm run lint`: exit 0, no findings.
- `npm run build`: exit 0 (vite build + `tsc --noEmit`).

### T001 — Current 8/10/12/14/16-lap field baseline (pre-enrichment)

Recorded against the current resolver (`resolveNCarContest`) with the frozen
baseline fixtures (`tests/fixtures/race-enrichment-fixtures.ts`). `meanPlayerSecs`
is the player car's whole-race duration; `winRate` is over seeds {1,7,42,1337,9001}
for the empty/strong/weak profiles at level 1.

| Laps | meanPlayerSecs | player winRate (empty/strong/weak pool) |
|-----:|---------------:|----------------------------------------:|
|    8 |         225.994 |                                  0.600 |
|   10 |         282.493 |                                  0.600 |
|   12 |         338.991 |                                  0.600 |
|   14 |         395.490 |                                  0.600 |
|   16 |         451.988 |                                  0.600 |

- **Post-opening lead retention (measured)**: `leaderRetainedFromOpeningRate = 1.000`
  (100%) across the corpus — confirms the reported “race settles after the opening
  lap” behaviour that Feature 033 must enrich (plan.md Summary; US1 goal).
- **Playback labels (current)**: `PlaybackSpeed = "normal" | "fast"`; every new
  playback initializes to `"fast"` (`createPresentationClock` default), i.e. the
  displayed `2×`, target ≈ `RACE_ANIMATION_SECONDS = 20` seconds. `"normal"` is the
  `1×` slow watch. Feature 033 relabels so new `1x` ≈ legacy 20s and new `2x` ≈ 10s
  (spec.md playback-speed clarification).
- **Synchronous 8-car/16-lap resolution timing** (`timingMs`, see T005): median ≈
  0.97 ms, mean ≈ 1.20 ms, min 0.59 ms, max 8.50 ms.
- **Numeric no-material-delay tolerance (accepted)**: `250 ms` for one enriched
  8-car/16-lap synchronous resolution — more than two orders of magnitude above the
  measured pre-enrichment median, retained for T086 benchmarking. Asserted as
  `BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS = 250` in
  `tests/integration/race-enrichment-baseline.test.ts`.

### T002 — Fixtures (tests/fixtures/race-enrichment-fixtures.ts)

Added deep-frozen immutable fixtures: 8/10/12/14/16 lap counts, five seeds, the four
entrants, empty/native-corner/foreign-corner/mixed-corner/strong/weak builds, the
fixed 7-rival roster, a deterministic track factory, and a balanced-only
`LockedRaceSetup`. Native/foreign/mixed cornering builds carry an identical resolved
cornering total so later signature-eligibility tests (US2) compare origin equality
directly. `racerItem` is intentionally inert for installation behavior
(`testItem` default), mirroring the `race-setup-fixtures.ts` convention.

### T003 — Pre-enrichment baseline test (tests/integration/race-enrichment-baseline.test.ts)

8 tests passing, pinning: (1) the N-car result and every `CarResult` carry **no**
enrichment surface today; (2) full 8-car field with unique 1..8 positions and a
retained track at every supported lap count; (3) repeated resolution is deeply
equal across the whole corpus (replay identity); (4) the corpus reports zero
post-Opening events and zero emphasis pre-enrichment; (5) the clearly stronger build
dominates the weak build across seeds; (6) median resolution stays inside the 250 ms
no-material-delay budget.

### T004 — Baseline corpus runner (tests/fixtures/race-enrichment-corpus.ts)

- Corpus size: **150 cases** (5 seeds × 5 lap counts × 6 build profiles).
- Metrics projected: winner counts per profile, strong-vs-weak dominance, lap-1
  leader retention, resolution timing distribution, and (pre-enrichment) zero
  post-Opening-event/emphasis rates.
- Strong-vs-weak over the shared field: **strong 25/25, weak 20/25** — the clearly
  superior build is never upset (separated-build preservation, US1 acceptance
  scenario 5).

### T005 — Baseline projection (this record)

| Metric | Value (measured) |
|---|---|
| post-Opening consequential-event rate | **0.000** (no enrichment events exist pre-enrichment) |
| full-emphasis rate | **0.000** |
| leader retained from opening lap | 1.000 |
| resolution `timingMs` (min/median/mean/max) | 0.588 / 0.966 / 1.203 / 8.499 |
| accepted no-material-delay tolerance | 250 ms |

### T006 — Feature 032 reconciliation

Audited the seven Feature 032-touched surfaces Feature 033 will modify before any
enrichment edits were made: `src/simulation/{types,laps,contest,playback}.ts` and
`src/scenes/{PreRaceScene,ContestScene,ResultScene}.ts`. Feature 032 is closed
(specs/032) and its suite is green; the N-car result/car shapes retain no enrollment
of enrichment state (verified by T003 assertions). All Phase 1 additions are new
test/fixture files only — no Feature 032 surface has been edited yet, so the
reconciliation is satisfied and the enrichment foundation can proceed additively.

## Phase 2 — Foundational authority and configuration (T007–T015)

Run date: 2026-08-15. Strictly test-first: failing tests (T007–T010) were written
and confirmed RED (target modules absent) before any implementation, then
T011–T014 made them GREEN.

Verification: `npx tsc --noEmit` exit 0; the Phase 2 suites pass — enabled by
`enrichmentConfig.test.ts` (23), `raceEnrichment.test.ts` (13),
`driverRaceIdentities.test.ts` (5) = **41 tests GREEN** (3 files).

### T015 — Exact default config (version) and phase fixtures

**Config identity**: `RACE_ENRICHMENT_CONFIG_VERSION = "race-enrichment-v1"`.

| Lever | Default |
|---|---|
| `enabled` / `incidentsEnabled` | `true` / `true` |
| `phaseFractions` | opening `0.25`, contest `0.5`, finalPush `0.25` |
| `initialComposure` | `6` |
| `attackCost` / `defenseCost` / `signatureActivationCost` | `2` / `2` / `3` |
| `passingRange` / `minimumPaceAdvantage` | `30` / `0.15` |
| `signatureThresholds` (4 keys) | `40` each |
| `signatureTemporaryEffectCaps` | target-pace `0.15`, stat-window `12` |
| `incidentRiskCaps` | maxRisk `1`, maxTimeLossSeconds `3` |
| `corpusBands` | post-Opening `>=0.5`, emphasis `<=1/3`, winner-change `0.10–0.25` |

**Phase fixtures** (exact `computePhaseSchedule` counts, verified O(n)):

| Laps | Opening | Contest | Final Push |
|---:|---:|---:|---:|
| 8 | 2 | 4 | 2 |
| 10 | 2 | 5 | 3 |
| 12 | 3 | 6 | 3 |
| 14 | 3 | 7 | 4 |
| 16 | 4 | 8 | 4 |

**Isolation**: toggling `incidentsEnabled` adds/removes exactly the `incidents`
named seed stream; base streams (`opponent-setup`, `action-ties`) are unchanged;
a disabled master switch consumes no streams. Named sub-seeds are stable across
calls (deterministic FNV-1a) and distinct per stream/seed.