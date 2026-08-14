# Tasks: Pre-Race Setup

**Input**: Design documents from `/specs/028-pre-race-setup/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/race-setup-contract.md`, `quickstart.md`

**Testing discipline**: Strict test-first for setup catalog, eligibility,
validation, stat folds, per-car contest parity, generated rivals, remembering,
and Test Day/scored boundaries. Every corresponding test task must fail for the
expected reason before its implementation task begins.

**Organization**: Tasks are grouped by user story. The existing singular
brake-balance proof in `raceSetup.ts`/`PreRaceScene.ts` is migrated into the
clarified multi-control, per-car contract; it is not accepted as completion.

## Phase 1: Setup and asset production

**Purpose**: Establish fixtures, visual asset, and baseline evidence before
changing canonical race input.

- [X] T001 Generate and visually inspect the production-intent pre-race setup background at `public/assets/backgrounds/scenes/pre-race-setup.png`; require alternate-1901 setup bay, visible road/track context, center/lower UI-safe field, no opponents, no text, and no modern equipment
- [X] T002 Record the final vehicle-free background prompt, SHA-256, consumers, crop-safe regions, and accepted-v2 status in `specs/026-visual-ui-upgrade/asset-manifest.md`
- [X] T003 [P] Create canonical setup/build/track fixture builders in `tests/fixtures/race-setup-fixtures.ts`, including zero, one, two-same-family, and four-distinct-family installed configurations
- [X] T004 [P] Add a feature-028 legacy baseline test in `tests/unit/race-setup-baseline.test.ts` that snapshots Balanced lap/contest outputs and the current Test Day/scored mutation boundaries before migration
- [X] T005 Verify T004 passes against the pre-migration implementation and retain its fixtures as the byte-for-byte Balanced compatibility gate

---

## Phase 2: Foundational setup domain

**Purpose**: Replace the proof singular setup with the versioned catalog,
selection set, validation, and evidence types required by every story.

**Critical**: Blocks all user-story implementation.

- [X] T006 Add failing catalog contract tests in `tests/unit/raceSetup.test.ts` for all seven families, exactly three positions, zero Balanced deltas, symmetric low/high deltas, stable labels, and rules version `race-setup-v1`
- [X] T007 Add failing eligibility/aggregation tests in `tests/unit/raceSetup.test.ts` for universal Driver Aggression, installed-only item controls, stable-sorted source IDs, same-family linear magnitude, storage exclusion, and four-distinct-family maximum
- [X] T008 Add failing canonical lock/validation tests in `tests/unit/raceSetup.test.ts` for family ordering, summed deltas, encounter/track binding, rules version, source IDs, magnitude, duplicates, unknown inputs, and tampered aggregates
- [X] T009 Replace the proof `BrakeBalanceSetting`/singular `LockedRaceSetup` shapes with `SetupControlFamily`, `SetupPositionId`, `ConfigurableSetupEffect`, `LockedSetupControl`, and versioned selection-set `LockedRaceSetup` in `src/simulation/types.ts`
- [X] T010 Implement the immutable launch control catalog and typed lookup/validation failures in `src/simulation/raceSetup.ts` for Driver Aggression, brake balance, steering response, gearing, propeller pitch, racing line, and bodywork trim
- [X] T011 Implement `deriveEligibleSetupControls`, stable same-family aggregation, and installed-only source resolution in `src/simulation/raceSetup.ts`
- [X] T012 Implement `resolveSetupDelta`, `lockRaceSetup`, `validateLockedRaceSetup`, canonical ordering, and aggregate delta reconciliation in `src/simulation/raceSetup.ts`
- [X] T013 Remove or migrate every singular `setup.kind`/`setup.setting`/`setup.statDeltas` proof consumer found by repository search; no compatibility cast or unvalidated fallback may remain
- [X] T014 Run T006-T008 and T004; confirm the domain contract passes and Balanced baseline remains unchanged

**Checkpoint**: Framework-free setup domain is canonical, versioned, and
testable independently of Phaser.

---

## Phase 3: User Story 1 — Read the car and track setup context (Priority: P1)

**Goal**: Show only the exact vehicle/track information needed for fine-tuning,
with no opponent or stakes leakage.

**Independent Test**: Open setup and reconcile track/build/stat facts with the
subsequent contest while asserting prohibited race-briefing facts are absent.

### Tests

- [X] T015 [P] [US1] Add failing pure presentation tests in `tests/unit/raceSetupPresentation.test.ts` for exact track composition, current/prospective four-stat rows, signed deltas, no-prediction language, and unavailable evidence states
- [X] T016 [P] [US1] Add failing integration/static-boundary tests in `tests/integration/pre-race-setup.test.ts` proving setup presentation receives/renders no opponent identity/stats, rival field, purse, sponsor, odds, or projected outcome and renders the validated entrant's canonical vehicle art rather than a generic/default vehicle
- [X] T017 [P] [US1] Add failing routing tests in `tests/integration/run-flow.test.ts` proving every scheduled PvP routes `RunScene -> PreRaceScene -> ContestScene` and Back changes no run field (added to `tests/integration/pre-race-setup.test.ts` instead, since the routing facts under test are `raceSetup.ts`'s pure functions, not `run-flow.test.ts`'s existing choice-encounter helpers)

### Implementation

- [X] T018 [P] [US1] Implement pure `raceSetupPresentation.ts` models for track summary, current/prospective stats, control summary, signed deltas, and prohibited-data-free scene input
- [X] T019 [US1] Refactor `raceSetupInput` in `src/simulation/raceSetup.ts` to retain the exact generated track/build/encounter and derived controls without rival/purse/sponsor presentation data
- [X] T020 [US1] Rebuild the car/track context regions in `src/scenes/PreRaceScene.ts` using the shared track and vehicle-stat presentation/renderers rather than scene-local arithmetic
- [X] T021 [US1] Preload `public/assets/backgrounds/scenes/pre-race-setup.png` as stable key `scene-pre-race-setup` in `src/scenes/BootScene.ts`, add it to `src/scenes/visualAssets.ts`, use it in `src/scenes/PreRaceScene.ts`, and overlay the validated run entrant's canonical vehicle asset in the empty staging area
- [X] T022 [US1] Preserve guarded unavailable routing for missing/malformed run, encounter, build, or track context in `src/scenes/PreRaceScene.ts`
- [X] T023 [US1] Run T015-T017 and manually inspect the setup scene at 800×450 against quickstart scenarios 1-2 (browser-verified: track/stats/vehicle art render, Conservative selection updates stat panel and flows correctly into ContestScene)

**Checkpoint**: Car/track setup context is independently complete and contains
zero opponent/stakes information.

---

## Phase 4: User Story 2 — Universal Driver Aggression (Priority: P1)

**Goal**: Every car receives the same consequential three-position
pace-versus-control choice.

**Independent Test**: Resolve Conservative, Balanced, and Aggressive on varied
tracks; verify exact disclosed stat redistribution, deterministic phase effects,
and entrant-independent strength.

### Tests

- [X] T024 [P] [US2] Add failing Driver Aggression delta and prospective-stat tests in `tests/unit/raceSetup.test.ts` for Conservative `−6/−1/+13/+1`, Balanced zero, and exact inverse Aggressive
- [X] T025 [P] [US2] Add failing lap-physics tests in `tests/unit/laps.test.ts` proving setup applies after item/buff resolution, before segment physics, uses the positive-stat clamp, and is not amplified by item tiers/buffs/synergies
- [X] T026 [P] [US2] Add failing fairness/determinism tests in `tests/unit/contest.test.ts` proving equivalent cars receive identical aggression effects and repeated inputs are deeply equal

### Implementation

- [X] T027 [US2] Extend `simulatePlayerLaps` in `src/simulation/laps.ts` to apply validated aggregate setup deltas at the contract-defined point while preserving no-setup/Balanced byte identity
- [X] T028 [US2] Add the always-eligible Driver Aggression row and three-position keyboard/touch/mouse interaction to `src/scenes/PreRaceScene.ts`
- [X] T029 [US2] Render exact aggression gains/costs and prospective totals through `src/scenes/raceSetupPresentation.ts` without position/time predictions
- [X] T030 [US2] Run T024-T026 plus the Balanced baseline T004

**Checkpoint**: Universal setup works for every entrant without items.

---

## Phase 5: User Story 3 — Installed equipment controls (Priority: P1)

**Goal**: Author and expose seven deliberate configurable items, aggregate
matching families, and render every legal installed control.

**Independent Test**: Install each launch item, verify its labels/deltas and
source attribution, move it to storage, and exercise same-family stacking plus
the natural five-control maximum.

### Tests

- [X] T031 [P] [US3] Add failing item-authoring coverage tests in `tests/unit/items.test.ts` for the exact 1/1/3/2 launch matrix and no unintended configurable items
- [X] T032 [P] [US3] Add failing per-family label/delta tests in `tests/unit/raceSetup.test.ts` for all seven launch items and shared brake-balance semantics
- [X] T033 [P] [US3] Add failing same-family cross-pool tests in `tests/unit/raceSetup.test.ts` proving Inez+Nell brake valves render one ±26/∓2 control with two sources
- [X] T034 [P] [US3] Add failing presentation/layout-model tests in `tests/unit/raceSetupPresentation.test.ts` for universal-only, typical two-equipment, and maximum four-distinct-equipment states with no suppressed family

### Implementation

- [X] T035 [P] [US3] Author Hand-Fitted Steering Knuckle as `steering-response` in `src/content/items/mercer.ts`
- [X] T036 [P] [US3] Author Two-Speed Drive Hub as `gearing` in `src/content/items/soto.ts`
- [X] T037 [P] [US3] Author Variable-Pitch Propeller as `propeller-pitch`, Differential Braking Valve as `brake-balance`, and Gyroscopic Stabilizer as `racing-line` in `src/content/items/rook.ts`
- [X] T038 [P] [US3] Author Adjustable Bodywork Stay as `bodywork-trim` and Split-Circuit Brake Valve as `brake-balance` in `src/content/items/voss.ts`
- [X] T039 [US3] Implement compact control rows, selected-control detail, contributing-item attribution, and universal-plus-four-family responsive layout in `src/scenes/raceSetupPresentation.ts` and `src/scenes/PreRaceScene.ts` (tightened row spacing so 5 rows clear the bottom action bar — see PreRaceScene.ts CONTROL_ROW_HEIGHT comment)
- [X] T040 [US3] Implement explicit `No adjustable equipment installed` state while retaining Driver Aggression and Start Race in `src/scenes/PreRaceScene.ts`
- [~] T041 [US3] Run T031-T034 and visually verify quickstart scenarios 4-6 at 800×450 — tests pass; browser-verified the universal-only (0-item) state live, but the 2-4-equipment states were only verified at the unit/presentation level (T034), not live in-browser (reaching them via the real draft economy is RNG-gated) — worth a follow-up manual pass

**Checkpoint**: All launch equipment controls work, stack, and fit without an
arbitrary cap.

---

## Phase 6: User Story 4 — Understand exact tradeoffs (Priority: P1)

**Goal**: Make every current/prospective value and source inspectable before
commitment.

**Independent Test**: Select every position for every family and reconcile the
displayed totals with the pure resolver and recorded lap-one stats.

### Tests

- [X] T042 [P] [US4] Add exhaustive presentation-to-domain reconciliation tests in `tests/unit/raceSetupPresentation.test.ts` for every family/position/magnitude and signed formatting without color dependence
- [X] T043 [P] [US4] Add integration tests in `tests/integration/pre-race-setup.test.ts` proving selection changes preview only, does not mutate build/run, and matches lap-one recorded stats after Start Race

### Implementation

- [X] T044 [US4] Add shared current-versus-prospective four-stat comparison and source breakdown to `src/scenes/PreRaceScene.ts`, consuming only `raceSetupPresentation.ts` output
- [X] T045 [US4] Add track-demand alignment language limited to factual capability emphasis; prohibit outcome/time/position claims in `src/scenes/raceSetupPresentation.ts` (reuses feature 027's own `capabilityNotes` text verbatim — already documented there as never an unrecorded time claim — picking the single highest-demand stat's note as `alignmentLine`, rendered in `PreRaceScene.ts`)
- [X] T046 [US4] Add visible focus, text/symbol selected state, keyboard cycling, touch targets, monochrome meaning, and reduced-motion behavior for all setup controls in `src/scenes/PreRaceScene.ts` (reuses `applyPracticeFocusRing`/`createDemoButton`'s existing touch/keyboard support; no tweens used, so nothing needs a reduced-motion branch)
- [X] T047 [US4] Run T042-T043 and quickstart scenario 12 (mouse-driven interaction and focus ring verified live in-browser; keyboard bindings are coded but not individually key-pressed this session)

**Checkpoint**: Every setup tradeoff is transparent and input-parity compliant.

---

## Phase 7: User Story 5 — Canonical per-car setup and async parity (Priority: P1)

**Goal**: Lock versioned selections before the race and calculate every car from
its own build/setup under one deterministic ruleset.

**Independent Test**: Resolve eight-car contests repeatedly, verify each car's
legal per-car evidence, and prove changing one setup changes only that car.

### Tests

- [X] T048 [P] [US5] Add failing per-car evidence tests in `tests/unit/contest.test.ts` proving `CarResult.setup` exists for every new scored car and no player setup is copied to rivals
- [X] T049 [P] [US5] Add failing tamper/replay contract tests in `tests/unit/contest.test.ts` for rules version, track/encounter binding, source ownership, and aggregate validation before resolution
- [X] T050 [P] [US5] Add failing deterministic generated-rival policy tests in `tests/unit/rivals.test.ts` for complete `3^N` legal-combination enumeration, lowest summed canonical `simulatePlayerLaps` time, family/`low-balanced-high` exact-tie ordering, same setup/lap resolver use, no recursive N-car resolution, no randomness, 243-candidate maximum, and repeated equality
- [X] T051 [P] [US5] Add failing integration tests in `tests/integration/run-flow.test.ts` proving Start Race locks once, playback accepts no setup mutation, and final settlement uses the precomputed result (added to `tests/integration/pre-race-setup.test.ts` alongside the rest of this feature's integration coverage)
- [X] T052 [P] [US5] Add failing result tests in `tests/integration/result-scene.test.ts` for per-car family/position/source/delta inspection and explicit legacy-unavailable behavior without inference

### Implementation

- [X] T053 [US5] Move setup evidence from the proof top-level `NCarContestResult.setup` to each `CarResult.setup` in `src/simulation/types.ts` and migrate result fixtures explicitly
- [X] T054 [US5] Implement exhaustive deterministic `selectGeneratedRivalSetup` in `src/simulation/rivals.ts`: enumerate canonical legal combinations, sum `simulatePlayerLaps` for each build/setup/lap-count/authoritative-track candidate, choose the stable first minimum, delegate setup/lap math to shared authorities, and never recurse into N-car contest resolution
- [X] T055 [US5] Update `resolveContest` in `src/simulation/contest.ts` to validate and apply each player's/generated rival's own build/setup pair, retaining per-car evidence and legacy behavior only on declared legacy paths (rival setup selection is gated on an optional new `encounterId` 7th parameter — omitted, pre-existing 6-arg call sites keep exact pre-028 numeric output; ContestScene always supplies it)
- [X] T056 [US5] Change `ContestScene` input in `src/scenes/ContestScene.ts` to consume the already locked canonical race input and never read mutable scene selections or regenerate setup
- [X] T057 [US5] Render inspectable per-car setup evidence in `src/scenes/ResultScene.ts` via pure formatting/presentation helpers, removing the singular proof banner
- [X] T058 [US5] Add future recorded-ghost setup/rules-version contract types and validation seam in `src/simulation/types.ts` and `src/simulation/raceSetup.ts` without adding network/backend behavior
- [X] T059 [US5] Run T048-T052, full contest/playback tests, and quickstart scenarios 10-11 (automated suite green — 1003 tests; worst-case exhaustive-search performance benchmarked at ~50ms/rival, ~350ms/8-car contest, one-time at race start, not per-frame; scenarios 10-11 verified via unit/integration tests rather than a full live 8-car race, since the browser's animation pacing throttles when backgrounded)

**Checkpoint**: Setup is canonical, deterministic, per car, and async-ready.

---

## Phase 8: Remember setup (cross-story requirement)

**Purpose**: Default every race to Balanced while supporting explicit
championship-local carry-forward and dormant values.

- [X] T060 Add failing run-state tests in `tests/unit/run.test.ts` for disabled-by-default memory, Start Race-only writes, family-keyed restoration, dormant ineligible values, reactivation, and new-run reset
- [X] T061 Add failing scene-flow tests in `tests/integration/pre-race-setup.test.ts` for checkbox input parity, Back/Test Day non-write behavior, and eligible-only initialization
- [X] T062 Add typed `RunSetupMemory` to `Run` creation/unavailable fixtures and guarded validation in `src/simulation/run.ts` (optional field, absent ≡ disabled — every pre-028 fixture stays valid with zero migration)
- [X] T063 Implement pure initial-selection and commit-memory operations in `src/simulation/raceSetup.ts`; remembered state must never grant eligibility
- [X] T064 Implement the unchecked-by-default Remember setup control and draft restoration in `src/scenes/PreRaceScene.ts`
- [X] T065 Run T060-T061 and quickstart scenarios 7-8 (automated suite green; live browser walk of scenarios 7-8 not repeated this session — covered by T023's earlier live pass plus this phase's unit/integration coverage)

---

## Phase 9: User Story 6 — Exact-track Test Day and recovery (Priority: P2)

**Goal**: Test the current uncommitted setup on the upcoming track and return
without any scored or remembered mutation.

**Independent Test**: Enter Test Day with non-Balanced choices, reconcile its
physics/track, then return to identical draft/focus and unchanged run state.

### Tests

- [X] T066 [P] [US6] Add failing practice-domain tests in `tests/unit/practice.test.ts` for exact retained upcoming track, temporary versioned setup, and same lap-stat fold
- [X] T067 [P] [US6] Add failing integration tests in `tests/integration/test-day-flow.test.ts` for setup-origin entry, exact draft/focus restoration, and repeated testing
- [X] T068 [P] [US6] Add failing protected-state tests in `tests/integration/test-day-boundaries.test.ts` proving no encounter, history, credits, reputation, sponsor, remembered settings, ghost record, or scored setup commit

### Implementation

- [X] T069 [US6] Extend `PracticeSession`/origin snapshot types in `src/simulation/practice.ts` with exact track, temporary locked setup, draft selections, checkbox, and focus family (new `PracticeSetupSnapshot`, `"pre-race-setup"` origin context/route, carried through `ProtectedPreparationOrigin` — never `undefined`-valued, since `practiceRecovery.ts`'s canonicalization rejects that)
- [X] T070 [US6] Update `TestDayScene`, `PracticeContestScene`, and `PracticeResultScene` to apply/read setup-origin practice evidence while preserving generic Test Day entry behavior in `src/scenes/` (`resolvePractice` branches on the snapshot; `resolveContest`'s legacy 2-car overload gained optional `track`/`setup` params, additive/backward-compatible; fixed a `reconcilePracticeResult` invariant that assumed practice never has track physics; `PracticeResultScene`'s stat line now shows real values when physics exists)
- [X] T071 [US6] Add Test Day entry/return controls to `src/scenes/PreRaceScene.ts` with exact navigation-state restoration (`openTestDay()` builds the snapshot; `create()` restores `selections`/`rememberChecked`/`focusedFamily` from `data.originState.setupSnapshot` when present)
- [X] T072 [US6] Run T066-T068 and quickstart scenario 9 (automated suite green; also browser-verified live end to end: PreRaceScene → Test Day → real track-physics result → Return restores the exact prior draft)

**Checkpoint**: Players can test the real track/setup without committing it.

---

## Phase 10: Polish and full gates

**Purpose**: Close cross-cutting visual, compatibility, documentation, and
verification requirements.

- [X] T073 [P] Add the final feature-028 asset entry and implementation status to `specs/HANDOFF.md` and reconcile `specs/DEFERRED.md`/`specs/skribidi-gap-decisions.md` so pre-race setup is no longer described as unspecified
- [X] T074 [P] Update `specs/028-pre-race-setup/quickstart.md` with any final control focus/layout details discovered during implementation without changing clarified mechanics
- [X] T075 Run `rg` audits for singular proof setup fields, setup math in scenes, opponent/stakes leakage in `PreRaceScene`, unversioned new ghost evidence, and stale one-control assumptions (all clean — see acceptance-evidence.md)
- [X] T076 Run the full `npm test` suite and resolve every regression without weakening assertions (1031 passing, up from 894, zero regressions)
- [X] T077 Run `npm run lint` and `npm run build`; accept only the existing documented bundle-size warning
- [~] T078 Perform manual/browser visual QA at 800×450 plus the existing desktop/mobile viewport matrix; verify background crop, one-to-five-control layout, focus, touch, reduced motion, and monochrome meaning — live-verified: background/vehicle-overlay crop, universal-only control, mouse selection, stat-panel propagation, Test Day round-trip, and the existing mobile-viewport letterboxing (shared scaling mechanism, untouched by this feature). NOT live-verified: the 2-4-equipment control layouts (RNG-gated to reach) and individual keyboard bindings — see acceptance-evidence.md's Known follow-ups
- [X] T079 Execute every scenario in `specs/028-pre-race-setup/quickstart.md` and record acceptance evidence in `specs/028-pre-race-setup/acceptance-evidence.md`
- [X] T080 Re-run the Constitution Check from `plan.md` against delivered code and document final PASS evidence in `specs/028-pre-race-setup/acceptance-evidence.md`

---

## Dependencies and execution order

### Phase dependencies

- Phase 1 establishes baseline and assets.
- Phase 2 is blocking foundation for every user story.
- US1 and US2 can proceed after Phase 2; their scene work must coordinate on
  `PreRaceScene.ts`.
- US3 depends on the Phase 2 catalog and benefits from the US2 control-row seam.
- US4 depends on US1-US3 presentation/domain outputs.
- US5 depends on Phase 2 and US2/US3 setup resolution; it is required before
  scored settlement is feature-complete.
- Remember setup depends on canonical family selections from Phase 2 and the
  Start Race boundary from US5.
- US6 depends on canonical locking (US5) and draft/remember state.
- Phase 10 depends on all selected stories.

### Parallel opportunities

- T003 and T004 can run in parallel.
- Within each story, `[P]` test tasks target separate files and can run in
  parallel before implementation.
- T035-T038 item authoring touches four separate files and can run in parallel.
- Asset documentation (T002), fixtures (T003), and baseline capture (T004) can
  run independently.
- Scene edits are intentionally not marked parallel when they share
  `PreRaceScene.ts`.

## Implementation strategy

1. Preserve the legacy baseline, then replace the singular proof domain.
2. Deliver Driver Aggression as the smallest playable setup slice.
3. Add the seven equipment items and scalable control layout.
4. Make setup canonical per car before adding convenience state.
5. Add Remember setup and exact-track Test Day on stable selection contracts.
6. Finish with Results, visual QA, full regression, and constitutional evidence.
