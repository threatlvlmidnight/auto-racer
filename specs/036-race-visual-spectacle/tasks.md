# Tasks: Race Visual Spectacle

**Input**: Design documents from `/specs/036-race-visual-spectacle/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/race-visual-spectacle-contract.md`, and `quickstart.md`

**Tests**: Unit and integration coverage is required because the specification
requires deterministic retained-result, exact-once, budget, and fallback
guarantees. Write the listed tests first and keep existing playback-boundary
assertions intact.

**Organization**: Tasks are grouped by user story so each increment can be
implemented and tested independently after the shared foundation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can be completed in parallel with other tasks in the same phase when
  their listed files do not overlap.
- **[Story]**: Maps work to a user story in `spec.md`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish fixtures and verification boundaries before touching the
race scene.

- [ ] T001 Create retained-race fixture builders for 8/10/12/14/16 laps,
  eventless playback, player events, rival-only events, and simultaneous
  boundaries in `tests/fixtures/race-spectacle-fixtures.ts`.
- [ ] T002 [P] Document the feature-specific manual verification matrix and
  commands in `specs/036-race-visual-spectacle/quickstart.md`.
- [ ] T003 [P] Produce or import four distinct 2D player-vehicle art files in
  `public/assets/race/vehicles/` and record each source/license or generation
  provenance, stable texture key, and fallback expectation in
  `specs/036-race-visual-spectacle/vehicle-asset-manifest.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build pure, read-only presentation models all stories consume.

**⚠️ CRITICAL**: Complete this phase before integrating rendering or PiP into
`ContestScene`.

- [ ] T004 Define presentation-only race visual profile types, fallback marker
  descriptors, and stable identity invariants in `src/content/raceVisualProfiles.ts`.
- [ ] T005 Define pure circuit decoration, moment, budget, focus-window, and
  race-local spectacle state types in `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T006 [P] Add failing unit coverage for the supported lap-budget table and
  rejected unsupported lap counts in `tests/unit/raceSpectaclePresentation.test.ts`.
- [ ] T007 [P] Add failing unit coverage for deterministic entrant/rival profile
  lookup, number/pattern/label identity, and asset fallback descriptors in
  `tests/unit/raceVisualProfiles.test.ts`.
- [ ] T008 Implement the exact 8→2, 10→2, 12→3, 14→4, 16→4 PiP budget resolver
  in `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T009 Implement four mechanically neutral player profiles and deterministic
  reusable rival profile assignment in `src/content/raceVisualProfiles.ts`.
- [ ] T010 Register and safely preload the four manifested player texture keys,
  then implement geometric/labeled fallback lookup without changing existing
  texture behavior in `src/scenes/visualAssets.ts` and `src/scenes/BootScene.ts`.
- [ ] T011 Add a pure circuit visual-model builder that derives bounds, road
  layers, start/finish, and decoration anchors solely from retained `Track`
  geometry in `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T012 Add foundational unit assertions that visual-model construction never
  calls track generation and preserves every retained path point in
  `tests/unit/raceSpectaclePresentation.test.ts`.

**Checkpoint**: The presentation model is deterministic, framework-free, and
cannot modify contest, track, schedule, or playback-controller authority.

---

## Phase 3: User Story 1 — Watch a credible, readable race (Priority: P1) 🎯 MVP

**Goal**: Make the retained circuit and full field more credible and readable
while preserving the wide broadcast view, current marker path, controls, and
final result.

**Independent Test**: Replay retained compact and switchback-like multi-car
fixtures at 1× and 2×; marker coordinates/order and final result match the
baseline while the rendered circuit has layered top-down presentation and every
car remains identifiable without color alone.

### Tests for User Story 1

- [ ] T013 [US1] Add integration coverage that the enhanced track renderer
  uses `schedule.track`, retains all marker paths, and never invokes
  `generateTrack` in `tests/integration/race-spectacle.test.ts`.
- [ ] T014 [US1] Add integration coverage for compact/hairpin/switchback
  fixtures at normal and fast playback, asserting unchanged finish order and
  results transition in `tests/integration/race-spectacle.test.ts`.
- [ ] T015 [P] [US1] Add unit coverage for circuit decoration anchors and
  start/finish derivation across retained track shapes in
  `tests/unit/raceSpectaclePresentation.test.ts`.

### Implementation for User Story 1

- [ ] T016 [US1] Create layered enhanced top-down circuit rendering—road,
  shoulder, verge, start/finish, region-aware landmarks, shadows, and local
  emphasis—from `CircuitVisualModel` in `src/scenes/raceSpectacleVisuals.ts`.
- [ ] T017 [US1] Replace the direct road stroke in `renderTrack` with the
  retained-geometry circuit renderer while keeping the existing wide layout in
  `src/scenes/ContestScene.ts`.
- [ ] T018 [US1] Render profile-aware vehicle bodies, visible number/pattern,
  accessible label, heading, and labeled no-asset fallback without changing
  `pointAtProgress` placement in `src/scenes/raceSpectacleVisuals.ts`.
- [ ] T019 [US1] Integrate profile-aware marker creation, updates, trails, and
  fallback cleanup into the scored-race lifecycle in `src/scenes/ContestScene.ts`.
- [ ] T020 [US1] Preserve and regression-test existing projection rows, ticker,
  lap label, 1×/2× controls, skip/result lifecycle, and board inspector
  placement after the enhanced main rendering in `src/scenes/ContestScene.ts`.
- [ ] T021 [US1] Add full-field integration assertions for stable non-color
  identity and an unavailable-vehicle-art fallback in
  `tests/integration/race-spectacle.test.ts`.

**Checkpoint**: A full retained race is visually richer but uses the same
geometry, playback clock, standings, and results as before.

---

## Phase 4: User Story 2 — Feel consequential signature and pass moments (Priority: P1)

**Goal**: Present a bounded, player-relevant PiP treatment from immutable
Feature 033 event evidence without altering race progression.

**Independent Test**: Use fixtures with player signatures, completed passes,
defenses, incidents, rival-only events, simultaneous events, and no events;
verify selected PiPs are exact-once retained evidence, respect every lap budget,
and leave playback timing and controls unchanged at 1×, 2×, and reduced motion.

### Tests for User Story 2

- [ ] T022 [US2] Add failing unit coverage for player-only eligibility,
  display priority, retained Feature 033 ordering tie-breaks, and eventless
  selection while proving PiP does not alter Feature 033 `EmphasisClass` in
  `tests/unit/raceSpectaclePresentation.test.ts`.
- [ ] T023 [US2] Add failing unit coverage for exact-once moment transitions,
  active-PiP conflict suppression, and terminal-state non-reactivation in
  `tests/unit/raceSpectaclePresentation.test.ts`.
- [ ] T024 [US2] Add failing unit coverage for reduced-motion text content
  containing driver, event/signature, and recorded consequence in
  `tests/unit/raceSpectaclePresentation.test.ts`.
- [ ] T025 [P] [US2] Add integration coverage that speed changes and skipped or
  late-frame crossed boundaries cannot change selected IDs, duplicate a PiP, or
  delay results in `tests/integration/race-spectacle.test.ts`.

### Implementation for User Story 2

- [ ] T026 [US2] Implement Feature 033 evidence adapters that preserve retained
  event ID, boundary ID, participants, name, and recorded consequence in
  `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T027 [US2] Implement pure player-involvement eligibility, fixed display
  priority, retained-order tie-break, and bounded selected-moment construction
  in `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T028 [US2] Implement the exact-once spectacle reducer for pending, active,
  rendered, and suppressed moments without access to playback time in
  `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T029 [US2] Implement an accessible static/reduced-motion PiP model and a
  no-art text/panel fallback in `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T030 [US2] Render the bounded PiP panel with retained driver, event or
  signature name, consequence, and optional three-quarter cut-in art in
  `src/scenes/raceSpectacleVisuals.ts`.
- [ ] T031 [US2] Initialize selected moments once from the immutable result and
  feed only existing crossed playback boundaries into the spectacle reducer in
  `src/scenes/ContestScene.ts`.
- [ ] T032 [US2] Integrate active PiP rendering, deterministic suppression,
  completion cleanup, and ticker continuity without pausing, rewinding, or
  changing the playback controller in `src/scenes/ContestScene.ts`.
- [ ] T033 [US2] Add integration assertions for every supported budget, no
  fabricated event panel, rival-only exclusion, simultaneous conflict policy,
  and retained result equivalence in `tests/integration/race-spectacle.test.ts`.

**Checkpoint**: Every displayed PiP is one retained player-relevant event; it
is bounded, deterministic, accessible, and observational only.

---

## Phase 5: User Story 3 — Recognize machines and race context (Priority: P2)

**Goal**: Let players follow their selected machine or another named car through
a persistent focus window, while retaining recognizable player/rival vehicles.

**Independent Test**: Start races for all four player entrants and a full rival
field; select each named car, trigger a selected PiP, and confirm the window
returns to the selection with no change to playback state or final result.

### Tests for User Story 3

- [ ] T034 [US3] Add failing unit coverage for player-default focus,
named-car selection, PiP temporary override, and restoration on rendered or
suppressed outcomes in `tests/unit/raceSpectaclePresentation.test.ts`.
- [ ] T035 [US3] Add integration coverage for all four player vehicle
  profiles and manifested texture keys, reusable rival identities, and missing
  cut-in/profile asset fallback in `tests/integration/race-spectacle.test.ts`.
- [ ] T036 [US3] Add integration coverage that focus selection is
presentation-only and does not alter schedule time, standings, selected PiP
IDs, or final result in `tests/integration/race-spectacle.test.ts`.

### Implementation for User Story 3

- [ ] T037 [US3] Implement the pure focus-window reducer and display-model
builder for default selection, named-car selection, PiP override, and restore
in `src/scenes/raceSpectaclePresentation.ts`.
- [ ] T038 [US3] Render a persistent focus window and named-car selector with
non-color accessible labels, selected state, and compact fallback layout in
`src/scenes/raceSpectacleVisuals.ts`.
- [ ] T039 [US3] Wire named-car input and focus/PiP restoration to scene-local
state without writing to the result or controller in `src/scenes/ContestScene.ts`.
- [ ] T040 [US3] Wire all four manifested bespoke player vehicle models into
  their entrant descriptors and reusable rival silhouette classes in
  `src/content/raceVisualProfiles.ts` and `src/scenes/visualAssets.ts`.
- [ ] T041 [US3] Verify focus controls, PiP restoration, profile fallback, and
existing playback controls remain reachable in narrow-layout fallback cases in
`tests/integration/race-spectacle.test.ts`.

**Checkpoint**: The player can follow any named machine and recover their
selection after a cut-in without affecting the retained race.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close the feature contract across stories and preserve quality.

- [ ] T042 [P] Add regression coverage that no visual path introduces a second
  resolver, live input, unseeded randomness, or track regeneration in
  `tests/integration/race-spectacle.test.ts`.
- [ ] T043 [P] Profile race-scene object lifecycle and clean up PiP/focus/marker
  objects on scene shutdown in `src/scenes/ContestScene.ts` and
  `src/scenes/raceSpectacleVisuals.ts`.
- [ ] T044 Validate the full manual matrix in
  `specs/036-race-visual-spectacle/quickstart.md` and record any visual-only
  owner review evidence in `specs/036-race-visual-spectacle/quickstart.md`.
- [ ] T045 Run the focused test files, full test suite, lint, type-check, and
  production build; repair only Feature 036 regressions in `package.json` task
  scripts and affected `src/` or `tests/` files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependencies.
- **Foundational (Phase 2)** depends on the fixture baseline and blocks scene
  integration.
- **US1 (Phase 3)** depends on foundational visual/profile models.
- **US2 (Phase 4)** depends on the foundation and can begin alongside US1
  rendering work once Feature 033 event evidence is available; both integrate
  sequentially in `ContestScene.ts`.
- **US3 (Phase 5)** depends on the same foundation and the PiP state model from
  US2 for override/restoration.
- **Polish (Phase 6)** depends on the desired story phases.

### User Story Dependencies

- **US1**: MVP; no story dependency after Phase 2.
- **US2**: Needs Feature 033's stable retained evidence and shares the scene
  integration point with US1, but its pure selection reducer is independently
  implementable after Phase 2.
- **US3**: Uses the focus/PiP state contract from US2; profile content can be
  prepared in parallel with US1.

### Parallel Opportunities

- T002–T003 and T006–T007 can proceed in parallel.
- T009 and T010 can proceed after T004 while T011 proceeds after T005.
- Within US1, T015 can proceed alongside either integration test. Within US2,
  T025 can proceed alongside the unit-test sequence. Within US3, T034 can
  proceed alongside either integration-test sequence once their shared files
  are serialized.
- Avoid concurrent edits to `src/scenes/ContestScene.ts`: serialize T017,
  T019–T020, T031–T032, T039, and T043.

## Parallel Example: User Story 2

```text
Task: "T022 eligibility and deterministic ordering tests in tests/unit/raceSpectaclePresentation.test.ts"
Task: "T023 exact-once conflict-state tests in tests/unit/raceSpectaclePresentation.test.ts"
Task: "T024 reduced-motion semantic tests in tests/unit/raceSpectaclePresentation.test.ts"
Task: "T025 playback-boundary integration tests in tests/integration/race-spectacle.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete T001–T012.
2. Complete US1 through T021 and validate unchanged retained playback with a
   richer track and field.
3. Stop for the MVP demonstration before PiP or focus-window work.

### Incremental Delivery

1. Add credible stable-wide circuit and field presentation (US1).
2. Add deterministic, player-only event PiP with no authority changes (US2).
3. Add selected-car focus behavior and finalized visual identity (US3).
4. Complete cross-cutting lifecycle, performance, and full validation work.

## Notes

- All 45 tasks use the required checkbox, sequential ID, and exact-path format.
- `[P]` is only used where the target files can be safely worked independently.
- The Feature 033 contract remains the authority for event evidence and order;
  Feature 036 must never reconstruct or resolve race events.
