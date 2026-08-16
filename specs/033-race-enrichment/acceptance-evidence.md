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

**Isolation**: toggling `incidentsEnabled` adds/removes exactly the `incidents` named seed stream; base streams (`opponent-setup`, `action-ties`) are unchanged; a disabled master switch consumes no streams. Named sub-seeds are stable across calls (deterministic FNV-1a) and distinct per stream/seed.

## Phase 3 — US1 MVP authority (T016–T029)

Run date: 2026-08-15. Basis commit `d6d64ac` onwards. Strictly test-first; the pure
reducer and enriched resolver were verified GREEN before any milestone commit.

### T016–T018 / T022–T024 — Pure Composure reducer and boundary evaluation

- `createComposureLedger` / `canAffordComposure` / `debitComposure` (+
  `ComposureOverspendError`): finite, race-local, non-replenishing budgets;
  every debit is atomic, immutable, and evidenced with `before`/`after` — an
  unaffordable action throws without a partial debit.
- `evaluateBoundary`: processes each car once in stable roster order; a legal
  pass window requires directly-ahead proximity within `passingRange` (30 s)
  and a projected pace advantage ≥ `minimumPaceAdvantage` (0.15) × the
  defender's lap. Attack/defense come from the same ledger and never overspend
  (FR-012). An unaffordable attacker is skipped with no partial debit (contract
  §5). A defender-paid pass resolves an isolated `action-ties` coin; an
  un-defended attack completes. Completed passes retain before/after position;
  an attempt never presents before/after (FR-011). Events sort by documented
  kind priority, then roster/sequence (contract §8).

### T019 / T025 — Bounded temporary-effect lap enrichment

- `enrichLapsWithTemporaryEffects` (laps.ts) folds `target-pace` (bounded
  fraction) and `stat-window` (bounded seconds) windows over explicit lap
  ranges onto authored `baseTime`, clamped to the positive `MIN_LAP_TIME`
  floor. Authored build values are never mutated (FR-010). Now accepts a
  `lapNumberBase` so per-boundary calls keep the correct 1-indexed lap context.

### T020 / T026 / T027 — One authoritative enriched resolution pass

- `resolveEnrichment` (raceEnrichment.ts) walks every lap boundary, emits one
  `phase-transition` per phase, activates eligible contextual signatures once
  (spending Composure, folding a bounded temporary window), evaluates
  Composure-backed attack/defense windows, and returns immutable events + final
  ledgers + enriched lap evidence. Purely deterministic — equal input → equal
  events/laps/ledgers (contract §2/§3/§8).
- `resolveEnrichedContest` (contest.ts, NEW — the legacy resolver is untouched
  so T003 pre-enrichment baseline pins stay byte-identical) computes base laps,
  resolves origin-agnostic signature eligibility, runs the single enrichment
  pass, then ranks **exactly once** from the retained enriched totals. Returns
  `EnrichedContestResult` with `configVersion`, `phaseSchedule`, `events`,
  `incidentsEnabled`, `driverIdentities`, and `eligibility` retained (T027).

### T021 / T029 — Regression corpus and gates

| Metric | Measured |
|---|---|
| Separated-build preservation (strong vs weak, same field) | `strongBetterRate = 1.000` across seeds; strongWins `5` ≥ weakWins `4` |
| Winner-change rate (enriched vs baseline winner) | `0.022` (2.2%) — bounded, below the chaotic threshold; full 10–25% band tuning is T085 |
| Repeat-identity | `100%` deep-equal over seeds × lap counts × profiles |
| Full 8-car unique-position field | verified at 8/10/12/14/16 laps |

**Total suite after US1**: 91 files / **1639 tests** passing, lint exit 0,
`tsc --noEmit` exit 0, production `vite build` exit 0.

### Remaining US1 item (flagged)

`T028` (running `src/scenes/runPresentation.ts` / `src/simulation/run.ts`
through the enriched resolver) and `T029`'s manual browser/viewport evidence are
the presentation/bridge follow-ons — see HANDOFF.

## Phase 4/5 — US2 driver identities + US3 incidents (T030–T052)

Run date: 2026-08-15.

### US2 — signatures and passives (T030–T038)

- **T030/T031 eligibility**: exact-threshold equality qualifies; a value one ULP
  below the threshold is ineligible (display rounding cannot qualify); non-finite
  committed values are ineligible; and eligibility depends only on the resolved
  own-stat vs threshold — never origin. Native/foreign/mixed same-stat builds
  yield byte-identical player eligibility (T031 integration).
- **T036 passives**: each car's always-active passive contributes a bounded
  per-lap target-pace improvement (`passivePaceFraction(magnitude)`, clamped to
  ≤6% of a lap). It applies to ineligible cars too and never charges a signature.
- **T037 activation**: eligible + context phase + affordable → one Composure
  debit (3), a bounded temporary window, and a retained `signature-activation`
  event. No activation/spend in the opening phase (context never matches).
- **T038/T033 briefing**: pure `driverBriefing`/`incidentRiskModel` in
  `src/scenes/raceEnrichmentPresentation.ts` project stat/current/threshold/
  eligibility/sources/Composure and risk bands without recomputing authority.

### US3 — bounded incidents (T042–T050)

- **T047 risk projection**: `projectIncidentRisk` derives a low/guarded/elevated
  band from braking demand + braking/cornering stat deficits, with concrete
  sources and safer setup alternatives; `revealsOutcome` is always `false`.
- **T048 selection**: `resolveIncidentDecision` consumes ONLY the isolated
  `incidents` stream (base streams untouched). `maxTimeLossSeconds` (3) bounds
  every accepted incident; disabled toggle emits no incident.
- **T049 integration**: `resolveEnrichment` fans incident time-loss into the
  enriched lap (`incidentTimeLoss`) and emits an immutable `incident` event;
  results carry no damage/fine/economy mutation (T045).
- **T050 risk presentation**: `buildIncidentRiskModel`/`incidentRiskModel`
  expose static labeled source rows and safer adjustments; never a spoiler.

### Measured gates (both incident toggle states)

| Metric | Value |
|---|---|
| `npm test` | **92 files / 1662 tests** passing |
| lint / `tsc --noEmit` / `vite build` | exit 0 each |
| Separated-build preservation (strong vs weak) | 5/5 seeds ahead, incidents on |
| Winner-change vs baseline | ≤ 0.5 (measured 0%) |
| Incident event presence (strong @16 lap, 5 seeds) | 4/5 races contained an incident |
| US2/US3 unit tests added (`raceEnrichment.test.ts`) | 46 total (was 31) |
| presentation tests added | 5 in `raceEnrichmentPresentation.test.ts` |

### Flagged US2/US3 items
## Phase 9 — Corpus tuning and gates (measured to date)

Run date: 2026-08-15.

### T085 — Tuning-band measurement (defaults do NOT yet meet all targets)

Measured over 5 seeds × 5 lap counts × 6 profiles with the **enriched** resolver
(default config, incidents enabled):

| Band | Target | Measured | Status |
|---|---|---|---|
| post-Opening consequential event rate | ≥ 0.50 | **1.000** | ✅ PASS |
| full-emphasis race rate | ≤ 1/3 | **1.000** | ❌ needs tuning (signature events classed `full`) |
| winner-change rate vs baseline | 0.10–0.25 | **0.007** | ❌ needs tuning (default passing rarely flips the winner) |
| separated-build preservation | strong ahead of weak | 5/5 seeds | ✅ PASS |

`T087` (tuning only centralized validated defaults) is therefore **pending**:
narrowing `full` emphasis to player signatures only (FR-022) and easing
attack/incident cadence toward the winner-change band.

### T086 — Enriched 8-car / 16-lap resolution timing

- Budget (T001 baseline): `BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS = 250`.
- Measured enriched mean **2.70 ms**, median **2.05 ms**, max **7.85 ms**
  (5 seeds × 3 warm runs) — ~93× under budget, ~2.8× the pre-enrichment median.
- Regression `race-enrichment-performance.test.ts` (T086) keeps this gate.

### T090 — Full gates
`npm test` **93 files / 1672 tests** passing, `npm run lint` exit 0,
`npm run build` exit 0. No assertions were weakened.

### T092 / T093 — Finalization status (pending completion)
The Constitution Check and HANDOFF/DEFERRED/034/035-bounds reconciliation
(T092/T093) are **not yet run** — they are gated on the un-implemented US4/US5/US6
scenes and the T085/T087 tuning pass (see HANDOFF).

`T039`/`T040`/`T051` (PreRaceScene/TestDayScene briefing + risk rendering) and
the manual portions of `T041`/`T052` require Phaser scene wiring/manual QA — see
HANDOFF.
