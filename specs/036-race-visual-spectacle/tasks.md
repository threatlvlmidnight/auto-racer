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

- [X] T001 Create retained-race fixture builders for 8/10/12/14/16 laps,
  eventless playback, player events, rival-only events, and simultaneous
  boundaries in `tests/fixtures/race-spectacle-fixtures.ts`.
- [X] T002 [P] Document the feature-specific manual verification matrix and
  commands in `specs/036-race-visual-spectacle/quickstart.md`.
- [X] T003 [P] Produce or import four distinct 2D player-vehicle art files in
  `public/assets/race/vehicles/` and record each source/license or generation
  provenance, stable texture key, and fallback expectation in
  `specs/036-race-visual-spectacle/vehicle-asset-manifest.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build pure, read-only presentation models all stories consume.

**⚠️ CRITICAL**: Complete this phase before integrating rendering or PiP into
`ContestScene`.

- [X] T004 Define presentation-only race visual profile types, fallback marker
  descriptors, and stable identity invariants in `src/content/raceVisualProfiles.ts`.
- [X] T005 Define pure circuit decoration, moment, budget, focus-window, and
  race-local spectacle state types in `src/scenes/raceSpectaclePresentation.ts`.
- [X] T006 [P] Add failing unit coverage for the supported lap-budget table and
  rejected unsupported lap counts in `tests/unit/raceSpectaclePresentation.test.ts`.
- [X] T007 [P] Add failing unit coverage for deterministic entrant/rival profile
  lookup, number/pattern/label identity, and asset fallback descriptors in
  `tests/unit/raceVisualProfiles.test.ts`.
- [X] T008 Implement the exact 8→2, 10→2, 12→3, 14→4, 16→4 PiP budget resolver
  in `src/scenes/raceSpectaclePresentation.ts`.
- [X] T009 Implement four mechanically neutral player profiles and deterministic
  reusable rival profile assignment in `src/content/raceVisualProfiles.ts`.
- [X] T010 Register and safely preload the four manifested player texture keys,
  then implement geometric/labeled fallback lookup without changing existing
  texture behavior in `src/scenes/visualAssets.ts` and `src/scenes/BootScene.ts`.
- [X] T011 Add a pure circuit visual-model builder that derives bounds, road
  layers, start/finish, and decoration anchors solely from retained `Track`
  geometry in `src/scenes/raceSpectaclePresentation.ts`.
- [X] T012 Add foundational unit assertions that visual-model construction never
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

- [X] T013 [US1] Add integration coverage that the enhanced track renderer
  uses `schedule.track`, retains all marker paths, and never invokes
  `generateTrack` in `tests/integration/race-spectacle.test.ts`.
- [X] T014 [US1] Add integration coverage for compact/hairpin/switchback
  fixtures at normal and fast playback, asserting unchanged finish order and
  results transition in `tests/integration/race-spectacle.test.ts`.
- [X] T015 [P] [US1] Add unit coverage for circuit decoration anchors and
  start/finish derivation across retained track shapes in
  `tests/unit/raceSpectaclePresentation.test.ts`.

### Implementation for User Story 1

- [X] T016 [US1] Create layered enhanced top-down circuit rendering—road,
  shoulder, verge, start/finish, region-aware landmarks, shadows, and local
  emphasis—from `CircuitVisualModel` in `src/scenes/raceSpectacleVisuals.ts`.
- [X] T017 [US1] Replace the direct road stroke in `renderTrack` with the
  retained-geometry circuit renderer while keeping the existing wide layout in
  `src/scenes/ContestScene.ts`.
- [X] T018 [US1] Render profile-aware vehicle bodies, visible number/pattern,
  accessible label, heading, and labeled no-asset fallback without changing
  `pointAtProgress` placement in `src/scenes/raceSpectacleVisuals.ts`.
- [X] T019 [US1] Integrate profile-aware marker creation, updates, trails, and
  fallback cleanup into the scored-race lifecycle in `src/scenes/ContestScene.ts`.
- [X] T020 [US1] Preserve and regression-test existing projection rows, ticker,
  lap label, 1×/2× controls, skip/result lifecycle, and board inspector
  placement after the enhanced main rendering in `src/scenes/ContestScene.ts`.
- [X] T021 [US1] Add full-field integration assertions for stable non-color
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

- [X] T022 [US2] Add failing unit coverage for player-only eligibility,
  display priority, retained Feature 033 ordering tie-breaks, and eventless
  selection while proving PiP does not alter Feature 033 `EmphasisClass` in
  `tests/unit/raceSpectaclePresentation.test.ts`.
- [X] T023 [US2] Add failing unit coverage for exact-once moment transitions,
  active-PiP conflict suppression, and terminal-state non-reactivation in
  `tests/unit/raceSpectaclePresentation.test.ts`.
- [X] T024 [US2] Add failing unit coverage for reduced-motion text content
  containing driver, event/signature, and recorded consequence in
  `tests/unit/raceSpectaclePresentation.test.ts`.
- [X] T025 [P] [US2] Add integration coverage that speed changes and skipped or
  late-frame crossed boundaries cannot change selected IDs, duplicate a PiP, or
  delay results in `tests/integration/race-spectacle.test.ts`.

### Implementation for User Story 2

- [X] T026 [US2] Implement Feature 033 evidence adapters that preserve retained
  event ID, boundary ID, participants, name, and recorded consequence in
  `src/scenes/raceSpectaclePresentation.ts`.
- [X] T027 [US2] Implement pure player-involvement eligibility, fixed display
  priority, retained-order tie-break, and bounded selected-moment construction
  in `src/scenes/raceSpectaclePresentation.ts`.
- [X] T028 [US2] Implement the exact-once spectacle reducer for pending, active,
  rendered, and suppressed moments without access to playback time in
  `src/scenes/raceSpectaclePresentation.ts`.
- [X] T029 [US2] Implement an accessible static/reduced-motion PiP model and a
  no-art text/panel fallback in `src/scenes/raceSpectaclePresentation.ts`.
- [X] T030 [US2] Render the bounded PiP panel with retained driver, event or
  signature name, consequence, and optional three-quarter cut-in art in
  `src/scenes/raceSpectacleVisuals.ts`.
- [X] T031 [US2] Initialize selected moments once from the immutable result and
  feed only existing crossed playback boundaries into the spectacle reducer in
  `src/scenes/ContestScene.ts`.
- [X] T032 [US2] Integrate active PiP rendering, deterministic suppression,
  completion cleanup, and ticker continuity without pausing, rewinding, or
  changing the playback controller in `src/scenes/ContestScene.ts`.
- [X] T033 [US2] Add integration assertions for every supported budget, no
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

- [X] T034 [US3] Add failing unit coverage for player-default focus,
named-car selection, PiP temporary override, and restoration on rendered or
suppressed outcomes in `tests/unit/raceSpectaclePresentation.test.ts`.
- [X] T035 [US3] Add integration coverage for all four player vehicle
  profiles and manifested texture keys, reusable rival identities, and missing
  cut-in/profile asset fallback in `tests/integration/race-spectacle.test.ts`.
- [X] T036 [US3] Add integration coverage that focus selection is
presentation-only and does not alter schedule time, standings, selected PiP
IDs, or final result in `tests/integration/race-spectacle.test.ts`.

### Implementation for User Story 3

- [X] T037 [US3] Implement the pure focus-window reducer and display-model
builder for default selection, named-car selection, PiP override, and restore
in `src/scenes/raceSpectaclePresentation.ts`.
- [X] T038 [US3] Render a persistent focus window and named-car selector with
non-color accessible labels, selected state, and compact fallback layout in
`src/scenes/raceSpectacleVisuals.ts`.
- [X] T039 [US3] Wire named-car input and focus/PiP restoration to scene-local
state without writing to the result or controller in `src/scenes/ContestScene.ts`.
- [X] T040 [US3] Wire all four manifested bespoke player vehicle models into
  their entrant descriptors and reusable rival silhouette classes in
  `src/content/raceVisualProfiles.ts` and `src/scenes/visualAssets.ts`.
- [X] T041 [US3] Verify focus controls, PiP restoration, profile fallback, and
existing playback controls remain reachable in narrow-layout fallback cases in
`tests/integration/race-spectacle.test.ts`.

**Checkpoint**: The player can follow any named machine and recover their
selection after a cut-in without affecting the retained race.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close the feature contract across stories and preserve quality.

- [X] T042 [P] Add regression coverage that no visual path introduces a second
  resolver, live input, unseeded randomness, or track regeneration in
  `tests/integration/race-spectacle.test.ts`.
- [X] T043 [P] Profile race-scene object lifecycle and clean up PiP/focus/marker
  objects on scene shutdown in `src/scenes/ContestScene.ts` and
  `src/scenes/raceSpectacleVisuals.ts`.
- [ ] T044 Validate the full manual matrix in
  `specs/036-race-visual-spectacle/quickstart.md` and record any visual-only
  owner review evidence in `specs/036-race-visual-spectacle/quickstart.md`.
- [X] T045 Run the focused test files, full test suite, lint, type-check, and
  production build; repair only Feature 036 regressions in `package.json` task
  scripts and affected `src/` or `tests/` files.

---

## Phase 7: Post-Implementation Review Remediation

**Purpose**: Resolve the development gaps found in the implementation review
before beginning T044's owner-led manual visual verification. The completed
tasks above record the initial implementation pass; these unchecked tasks are
the authoritative remaining development work for Feature 036.

- [X] T046 [US1] Replace the recolored single-silhouette vehicle outputs with
  four visibly distinct top-down player-vehicle models in
  `public/assets/race/vehicles/`; update
  `scripts/generate-race-vehicles.mjs` and
  `specs/036-race-visual-spectacle/vehicle-asset-manifest.md` so each asset has
  distinct geometry, stable provenance, correct forward orientation under
  track heading rotation, and a documented labeled fallback.
- [X] T047 [US1] Make rival non-color identity valid for a complete race field:
  assign collision-free visible numbers within the field and render the
  profile's pattern or silhouette distinction in both textured and fallback
  marker paths in `src/content/raceVisualProfiles.ts` and
  `src/scenes/raceSpectacleVisuals.ts`.
- [X] T048 [P] [US1] Add assertions that the four player assets have distinct
  silhouettes rather than color-only differences, that vehicle forward
  orientation follows retained track heading, and that every rival in a full
  field has a unique visible number plus a rendered non-color distinction in
  `tests/unit/raceVisualProfiles.test.ts` and
  `tests/integration/race-spectacle.test.ts`.
- [X] T049 [US2] Correct Feature 033 evidence adaptation so PiP driver labels,
  actor/target roles, pass/defense/incident wording, and recorded consequences
  describe the player correctly whether the player acts or receives the event
  in `src/scenes/raceSpectaclePresentation.ts`.
- [X] T050 [P] [US2] Add exact semantic assertions for player-as-actor and
  player-as-target signature, pass, defense, and incident events; tests must
  verify the expected driver name and consequence text instead of merely
  checking for nonempty strings in
  `tests/unit/raceSpectaclePresentation.test.ts`.
- [X] T051 [US2] Upgrade the active PiP from a text-only information card to a
  visual cut-in that depicts the retained player-relevant event using available
  vehicle/track presentation data, while retaining the accessible reduced-motion
  static treatment and labeled no-art fallback in
  `src/scenes/raceSpectaclePresentation.ts`,
  `src/scenes/raceSpectacleVisuals.ts`, and `src/scenes/ContestScene.ts`.
- [X] T052 [US2] Prevent a colliding event that becomes suppressed from
  restarting or extending the currently active PiP timer; add reducer/scene
  assertions that the winning event's duration is invariant to suppressed
  arrivals in `src/scenes/ContestScene.ts`,
  `tests/unit/raceSpectaclePresentation.test.ts`, and
  `tests/integration/race-spectacle.test.ts`.
- [X] T053 [US2] Exercise real scene-level speed changes, multi-boundary
  late-frame advances, and `ContestScene.skip()` behavior; prove these paths
  cannot change selected moment IDs, duplicate or defer a PiP, extend playback,
  or alter the retained final result in
  `tests/integration/race-spectacle.test.ts`.
- [X] T054 [US3] Replace the text-only focus panel with a persistent visual
  focus view that receives retained track geometry plus the selected car's
  current presentation position, visibly follows the player or chosen named
  car, temporarily reflects an active PiP when required, and restores the prior
  selection afterward without writing to race authority in
  `src/scenes/raceSpectaclePresentation.ts`,
  `src/scenes/raceSpectacleVisuals.ts`, and `src/scenes/ContestScene.ts`.
- [X] T055 [P] [US3] Add integration assertions over focus-view position data
  for player default, every named-car selection, movement across playback
  frames, PiP override, rendered/suppressed restoration, and narrow-layout
  fallback; prove focus changes remain presentation-only in
  `tests/integration/race-spectacle.test.ts`.
- [X] T056 Fix the verification commands and feature status documentation:
  replace or define the nonexistent `npm run typecheck` command, record the
  automated review evidence, and keep T044's manual matrix explicitly pending
  in `specs/036-race-visual-spectacle/quickstart.md` and related Feature 036
  status text.
- [X] T057 After T046–T056, run the focused Feature 036 tests, full test suite,
  lint, explicit TypeScript check, and production build; resolve Feature 036
  regressions and record the exact successful commands in
  `specs/036-race-visual-spectacle/quickstart.md` without completing T044.

**Remediation checkpoint**: T046–T057 are complete, automated checks pass, and
the only remaining Feature 036 task is the genuinely manual T044 matrix.

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
- **Post-review remediation (Phase 7)** depends on the initial implementation
  pass and blocks T044 manual verification. T048, T050, and T055 may begin in
  parallel where their files do not overlap; serialize all edits to
  `ContestScene.ts`.

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
  T019–T020, T031–T032, T039, T043, and remediation tasks T051–T054.

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
