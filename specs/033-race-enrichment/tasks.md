# Tasks: Race Enrichment

**Input**: Design documents from `/specs/033-race-enrichment/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/race-enrichment-contract.md`, `quickstart.md`

**Testing approach**: Strict test-first development for phase assignment,
eligibility, Composure, action ordering, timing/stat effects, incidents, ranking,
seed isolation, playback boundaries, and settlement. Presentation models receive
pure tests before Phaser wiring.

## Phase 1: Setup and deterministic baselines

**Purpose**: Preserve existing contest authority and measure the corpus that will
govern tuning before enrichment changes it.

- [ ] T001 Record current 8/10/12/14/16-lap field outcomes, post-opening lead retention, whole-race durations, playback labels, repeated 8-car/16-lap synchronous resolution timing, and the numeric no-material-delay tolerance in `specs/033-race-enrichment/acceptance-evidence.md`
- [ ] T002 [P] Add immutable native/foreign/mixed build, entrant, rival, setup, track, and seed fixtures in `tests/fixtures/race-enrichment-fixtures.ts`
- [ ] T003 [P] Add pre-enrichment N-car result/event absence and stable replay baselines in `tests/integration/race-enrichment-baseline.test.ts`
- [ ] T004 [P] Add a representative deterministic baseline corpus runner and metrics projection in `tests/fixtures/race-enrichment-corpus.ts`
- [ ] T005 Run T003-T004 against the current resolver and record baseline winner prediction, post-Opening event metrics, resolution timing distribution, and accepted performance tolerance in `specs/033-race-enrichment/acceptance-evidence.md`
- [ ] T006 Reconcile Feature 032 changes touching `src/simulation/types.ts`, `src/simulation/laps.ts`, `src/simulation/contest.ts`, `src/simulation/playback.ts`, `src/scenes/PreRaceScene.ts`, `src/scenes/ContestScene.ts`, and `src/scenes/ResultScene.ts` before feature edits

---

## Phase 2: Foundational authority and configuration

**Purpose**: Establish closed types, validated tuning, identity content, phases,
isolated seed derivation, and stable ordering required by every story.

**Critical**: Blocks all user-story implementation.

- [ ] T007 [P] Add failing validation/default/injection tests for every centralized tuning lever and toggle in `tests/unit/enrichmentConfig.test.ts`
- [ ] T008 [P] Add failing exact phase-coverage fixtures pinning 8=`2/4/2`, 10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, 16=`4/8/4`, plus valid one-lap test behavior in `tests/unit/raceEnrichment.test.ts`
- [ ] T009 [P] Add failing named-sub-seed stability and incident-toggle isolation tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T010 [P] Add failing driver catalog completeness, equal-schema, and no-stock-scalar tests in `tests/unit/driverRaceIdentities.test.ts`
- [ ] T011 Define RacePhase, identity, eligibility, ledger, action-window, enrichment-event, risk, and enriched-result types in `src/simulation/types.ts`
- [ ] T012 Implement immutable defaults and strict `RaceEnrichmentConfig` validation in `src/simulation/enrichmentConfig.ts`
- [ ] T013 Implement deterministic phase schedules, named sub-seed derivation, event IDs, and stable event-kind/roster ordering in `src/simulation/raceEnrichment.ts`
- [ ] T014 Implement all four entrant identity definitions and generated-opponent schema in `src/content/driverRaceIdentities.ts`
- [ ] T015 Run T007-T014 and record exact default config/version and phase fixtures in `specs/033-race-enrichment/acceptance-evidence.md`

**Checkpoint**: Framework-free inputs, content, configuration, and ordering are stable.

---

## Phase 3: User Story 1 — Watch a race that remains contested (Priority: P1) 🎯 MVP

**Goal**: Authoritative N-car races gain shared phases, contextual action windows,
Composure-backed attacks/defenses, and retained completed passes.

**Independent Test**: Resolve close and separated deterministic fields at every
lap count; verify credible passes, immutable event order, identical replay, and
bounded outcome disruption without any Phaser scene.

### Tests

- [ ] T016 [P] [US1] Add failing finite/non-replenishing/atomic Composure ledger and overspend tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T017 [P] [US1] Add failing proximity, pace-advantage, context, attack, defense, attempt, and completed-pass tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T018 [P] [US1] Add failing simultaneous-event priority, roster tie-order, and double-spend prevention tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T019 [P] [US1] Add failing temporary target-pace/stat-window and enriched lap-time evidence tests in `tests/unit/laps.test.ts`
- [ ] T020 [P] [US1] Add failing repeat-resolution deep-equality and no-playback-RNG tests in `tests/integration/enriched-contest.test.ts`
- [ ] T021 [P] [US1] Add failing clearly-separated-build preservation and configurable winner-change-band corpus tests in `tests/regression/race-enrichment-corpus.test.ts`

### Implementation

- [ ] T022 [US1] Implement immutable Composure creation, affordability, debit, and final ledgers in `src/simulation/raceEnrichment.ts`
- [ ] T023 [US1] Implement authoritative cumulative boundary state, proximity, pace advantage, and candidate selection in `src/simulation/raceEnrichment.ts`
- [ ] T024 [US1] Implement deterministic attack, defense, attempt, completed-overtake, and before/after event evidence in `src/simulation/raceEnrichment.ts`
- [ ] T025 [US1] Apply bounded temporary effects to authoritative effective stats/lap time while preserving authored build values in `src/simulation/laps.ts`
- [ ] T026 [US1] Orchestrate phases/action windows/enriched lap evidence before one final stable ranking in `src/simulation/contest.ts`
- [ ] T027 [US1] Retain config identity, phase schedule, ledgers, and ordered enrichment events on the N-car result in `src/simulation/types.ts` and `src/simulation/contest.ts`
- [ ] T028 [US1] Preserve enriched result/event evidence through run presentation, history, settlement, and replay bridges in `src/scenes/runPresentation.ts` and `src/simulation/run.ts`
- [ ] T029 [US1] Run T016-T028 plus contest, track, setup, ranking, settlement, and async ghost regressions; record MVP authority evidence in `specs/033-race-enrichment/acceptance-evidence.md`

**Checkpoint**: The simulation produces replay-stable, genuinely contested races without presentation work.

---

## Phase 4: User Story 2 — Build toward a driver identity (Priority: P1)

**Goal**: Passives always apply, while named signatures become eligible through
resolved-stat thresholds achievable with parts from any origin.

**Independent Test**: Reach every threshold using native, foreign, and mixed
builds; verify equal eligibility, contextual activation, costs, temporary effects,
and below-threshold passive-only behavior.

### Tests

- [ ] T030 [P] [US2] Add failing exact-threshold, below-threshold, display-rounding, and non-finite-value eligibility tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T031 [P] [US2] Add failing native/foreign/mixed same-stat eligibility equivalence tests for all entrants in `tests/unit/raceEnrichment.test.ts`
- [ ] T032 [P] [US2] Add failing always-active passive, eligible-no-context, context-no-budget, and successful signature tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T033 [P] [US2] Add failing relevant-stat/current/threshold/source pre-race projection tests in `tests/unit/raceEnrichmentPresentation.test.ts`
- [ ] T034 [P] [US2] Add failing generated-rival identity parity and deterministic activation tests in `tests/integration/enriched-contest.test.ts`

### Implementation

- [ ] T035 [US2] Resolve authoritative committed physical stats and complete contributing item/setup sources for signature gates in `src/simulation/raceSetup.ts`
- [ ] T036 [US2] Implement origin-agnostic signature eligibility and passive evaluation in `src/simulation/raceEnrichment.ts`
- [ ] T037 [US2] Implement contextual signature activation, priority, Composure debit, temporary effect, and retained evidence in `src/simulation/raceEnrichment.ts`
- [ ] T038 [P] [US2] Implement pure passive/signature/threshold/Composure briefing models in `src/scenes/raceEnrichmentPresentation.ts`
- [ ] T039 [US2] Render shared phase, passive, signature, current/threshold progress, eligibility, source, and Composure briefing in `src/scenes/PreRaceScene.ts`
- [ ] T040 [US2] Add the same eligibility and rule explanation to Test Day preparation in `src/scenes/TestDayScene.ts`
- [ ] T041 [US2] Run T030-T040 for all four entrants and generated opponents; record foreign-item exploration evidence in `specs/033-race-enrichment/acceptance-evidence.md`

**Checkpoint**: Character identity rewards engineering direction rather than item origin.

---

## Phase 5: User Story 3 — Understand and manage race risk (Priority: P2)

**Goal**: Players can inspect actionable incident risk; enabled incidents apply
only bounded time loss, and the engine toggle removes them cleanly.

**Independent Test**: Resolve risky/safer fixtures with incidents on/off; verify
risk sources, isolated determinism, bounded consequences, and zero persistent mutation.

### Tests

- [ ] T042 [P] [US3] Add failing risk-band/source/safer-alternative projection tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T043 [P] [US3] Add failing enabled incident selection, risk/context trigger, time-loss cap, and retained evidence tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T044 [P] [US3] Add failing disabled-toggle no-event/no-loss and unrelated-event deep-equivalence tests in `tests/unit/raceEnrichment.test.ts`
- [ ] T045 [P] [US3] Add failing no-retirement/damage/item/fine/credit/run-mutation tests in `tests/integration/enriched-contest.test.ts`
- [ ] T046 [P] [US3] Add failing risk-summary accessibility and outcome-nondisclosure tests in `tests/unit/raceEnrichmentPresentation.test.ts`

### Implementation

- [ ] T047 [US3] Implement pure incident-risk sources, qualitative bands, and safer setup alternatives in `src/simulation/raceEnrichment.ts`
- [ ] T048 [US3] Implement isolated deterministic incident selection and bounded time-loss events behind `incidentsEnabled` in `src/simulation/raceEnrichment.ts`
- [ ] T049 [US3] Integrate incident timing evidence without persistent build/run/economy mutation in `src/simulation/laps.ts` and `src/simulation/contest.ts`
- [ ] T050 [P] [US3] Implement pure risk-summary presentation and static source labels in `src/scenes/raceEnrichmentPresentation.ts`
- [ ] T051 [US3] Render risk band, sources, and safer legal adjustments without outcome spoilers in `src/scenes/PreRaceScene.ts` and `src/scenes/TestDayScene.ts`
- [ ] T052 [US3] Run T042-T051 with both toggle states and record kill-switch/deep-equivalence evidence in `specs/033-race-enrichment/acceptance-evidence.md`

**Checkpoint**: Incidents add transparent optional drama and can be removed with one engine switch.

---

## Phase 6: User Story 4 — See truthful consequential moments (Priority: P2)

**Goal**: Playback and Results communicate retained events at the revised speeds,
with bounded emphasis, Skip summaries, reduced-motion parity, and full inspection.

**Independent Test**: Consume the same retained race at new `1x`, new `2x`, Skip,
and reduced motion; compare event IDs/order/result and inspect all evidence.

### Tests

- [ ] T053 [P] [US4] Add failing new `1x` legacy-rate, new `2x` double-rate, new-`1x` default, and removed-slow-rate tests in `tests/unit/playback.test.ts`
- [ ] T054 [P] [US4] Add failing enrichment-boundary large-frame/small-frame exactly-once ordering tests in `tests/unit/playback.test.ts`
- [ ] T055 [P] [US4] Add failing full/compact/results-only emphasis classification and frequency tests in `tests/unit/raceEnrichmentPresentation.test.ts`
- [ ] T056 [P] [US4] Add failing Skip, reduced-motion, missing-asset fallback, and deep-equal settlement tests in `tests/integration/enriched-playback.test.ts`
- [ ] T057 [P] [US4] Add failing decisive summary and complete event-inspector projection tests in `tests/unit/raceEnrichmentPresentation.test.ts`
- [ ] T058 [P] [US4] Add failing Test Day retained-event and unscored-settlement parity tests in `tests/integration/enriched-test-day.test.ts`

### Implementation

- [ ] T059 [US4] Change shared playback descriptors/default to new `1x` legacy rate and new `2x` double rate; remove the old slow rate in `src/simulation/playback.ts`
- [ ] T060 [US4] Add retained enrichment events to crossed-boundary derivation and stable same-boundary ordering in `src/simulation/playback.ts`
- [ ] T061 [P] [US4] Implement pure callout, emphasis, reduced-motion, summary, and inspector models in `src/scenes/raceEnrichmentPresentation.ts`
- [ ] T062 [US4] Render bounded banners, marker emphasis, compact callouts, revised controls, and cleanup in `src/scenes/ContestScene.ts`
- [ ] T063 [US4] Consume Skip/reduced-motion event projections without changing authority in `src/scenes/ContestScene.ts`
- [ ] T064 [US4] Render decisive summary and complete retained event inspection in `src/scenes/ResultScene.ts`
- [ ] T065 [US4] Integrate identical event consumption and revised speed meanings into `src/scenes/PracticeContestScene.ts` and `src/scenes/PracticeResultScene.ts`
- [ ] T066 [US4] Run T053-T065 across speed switches, delayed frames, Skip, reduced motion, and missing assets; record parity evidence in `specs/033-race-enrichment/acceptance-evidence.md`

**Checkpoint**: Spectacle is truthful, bounded, accessible, and replaceable by future cutscene art.

---

## Phase 7: Corpus tuning and release gates

**Purpose**: Tune defaults, prove constitutional boundaries, and close full-stack acceptance.

- [ ] T067 [P] Run the representative corpus for post-Opening event ≥50%, full emphasis ≤33%, initial winner-change 10–25%, and stronger-build dominance in `tests/regression/race-enrichment-corpus.test.ts`
- [ ] T068 [P] Run repeated 8-car/16-lap enriched resolution benchmarks against T001's recorded baseline and fail when the approved no-material-delay tolerance is exceeded in `tests/regression/race-enrichment-performance.test.ts`
- [ ] T069 Tune only centralized validated defaults from T067 and document every value/baseline comparison in `src/simulation/enrichmentConfig.ts` and `specs/033-race-enrichment/acceptance-evidence.md`
- [ ] T070 [P] Audit for live RNG, scene-side resolution, origin-gated signatures, hidden stock scalars, unisolated incident consumption, and persistent incident penalties in `tests/integration/race-enrichment-boundaries.test.ts`
- [ ] T071 Run focused enrichment plus existing contest, laps, playback, setup, track, run, history, settlement, sponsor, inventory, Results, Test Day, and demo regression suites; record results in `specs/033-race-enrichment/acceptance-evidence.md`
- [ ] T072 Run full `npm test`, `npm run lint`, and `npm run build` with no weakened assertions or new warnings; record results in `specs/033-race-enrichment/acceptance-evidence.md`
- [ ] T073 Perform browser QA at 1920×1080, 1366×768, 1024×768, and 800×450 for all entrants, both speeds, Skip, reduced motion, incidents on/off, Results inspection, and Test Day in `specs/033-race-enrichment/acceptance-evidence.md`
- [ ] T074 Re-run the Constitution Check from `plan.md` against delivered code and record final PASS evidence in `specs/033-race-enrichment/acceptance-evidence.md`
- [ ] T075 Reconcile `specs/HANDOFF.md`, `specs/DEFERRED.md`, Feature 034/035 boundaries, and future picture-in-picture event-ID requirements after implementation

---

## Dependencies and execution order

### Phase dependencies

- Phase 1 establishes baselines and resolves Feature 032 overlap.
- Phase 2 is the blocking shared authority foundation.
- US1 depends on Phase 2 and is the simulation MVP.
- US2 depends on US1's action/event reducer and adds identity/signatures.
- US3 depends on US1's timing/evidence path but can proceed alongside US2 after shared types stabilize.
- US4 depends on retained US1-US3 events.
- Phase 7 depends on all desired stories.

### User-story dependency graph

```text
Foundation → US1 phases/passing ─┬→ US2 identity/signatures ─┐
                                 └→ US3 optional incidents ──┼→ US4 presentation → Gates
```

### Parallel opportunities

- T002-T004 create independent fixture, baseline, and corpus surfaces.
- T007-T010 cover config, phases/seeds, and identity content independently.
- T016-T021 cover independent Composure, passing, timing, replay, and corpus contracts.
- T030-T034 cover eligibility, origin parity, activation, presentation, and rivals independently.
- T042-T046 cover risk, incidents, toggle isolation, mutation, and presentation independently.
- T053-T058 cover rates, boundaries, emphasis, accessibility, Results, and Test Day independently.
- T067-T068 and T070 are independent corpus, performance, and authority audits after implementation stabilizes.

## Implementation strategy

### MVP first

Complete Phases 1-3. This delivers authoritative phases and credible passing with
replay-stable event evidence before driver identity, incidents, or spectacle.

### Incremental delivery

1. Lock baselines and shared deterministic infrastructure.
2. Deliver phases, Composure, attacks/defenses, and retained passing.
3. Add origin-agnostic stat-gated driver identities.
4. Add toggleable bounded incidents.
5. Project the retained narrative at revised speeds and Results.
6. Tune only through centralized config and close full gates.

### Format validation

All 75 executable tasks use a checkbox, sequential ID, optional `[P]`, required
story label inside story phases, and explicit repository file path.
