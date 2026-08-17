# Tasks: Onboarding and Decision Context

**Input**: Design documents in `/specs/045-onboarding-decision-context/`  
**Prerequisites**: `spec.md`, `research.md`, `tutorial-content.md`,
`future-scripted-tutorial.md`, `data-model.md`, contract, plan, and quickstart  
**Implementation status**: Ready for coding handoff after Features 041/042 land;
nothing here is implemented.  
**Ownership**: T001–T054 are `[CODE-DEEPSEEK]`. T055 is optional
`[ASSET-FRONTIER-OPTIONAL]`. T056 is `[MANUAL-FRONTIER-OR-OWNER]`.
DeepSeek must not execute or claim T055/T056.

## Phase 1 — Fixtures and reversible Test Day UI suppression (US5)

- [ ] T001 [P] [CODE-DEEPSEEK] Create deterministic tutorial, installation,
  region, next-race, acquisition-host, pending-confirmation, storage-error, and
  Test Day control fixtures in `tests/fixtures/onboarding-context-fixtures.ts`.
- [ ] T002 [P] [US5] [CODE-DEEPSEEK] Add failing player-control enumeration
  tests covering Title, Run, Prepare, Inventory, Pre-Race, Results, help, and
  keyboard shortcuts in `tests/unit/playerFeatureVisibility.test.ts` and
  `tests/integration/test-day-visibility.test.ts`.
- [ ] T003 [US5] [CODE-DEEPSEEK] Create presentation-only
  `src/scenes/playerFeatureVisibility.ts` with one typed `testDay: false` policy;
  prohibit imports from simulation modules.
- [ ] T004 [US5] [CODE-DEEPSEEK] Gate/remove normal Test Day controls and
  shortcuts in `src/scenes/RunScene.ts`, `src/scenes/PrepareScene.ts`,
  `src/scenes/PreRaceScene.ts`, and any player help/control registry through the
  central policy; do not delete methods/scenes/domain code.
- [ ] T005 [P] [US5] [CODE-DEEPSEEK] Add source/registry and existing-suite
  assertions proving `TestDayScene`, `PracticeContestScene`,
  `PracticeResultScene`, practice/recovery modules, and all current Test Day
  tests remain registered, unchanged in authority, and directly testable.

**Checkpoint**: Test Day is absent from normal UI but fully retained internally.

## Phase 2 — Measured regional demand authority (US3)

- [ ] T006 [P] [US3] [CODE-DEEPSEEK] Add failing validation and deterministic
  ≥1,000-circuit-per-region sensitivity-corpus tests in
  `tests/unit/regionalDemand.test.ts`, including finite/range/version/provenance
  and ±1 regeneration bounds.
- [ ] T007 [US3] [CODE-DEEPSEEK] Add demand vector/profile/snapshot types and
  strict validators in `src/simulation/types.ts` and
  `src/simulation/regionalDemand.ts`; reject rather than clamp malformed facts.
- [ ] T008 [US3] [CODE-DEEPSEEK] Implement the deterministic reference-build
  +1-canonical-point sensitivity measurement and global 0–100 normalization in
  `src/simulation/regionalDemand.ts`, reusing track/lap authority without
  mutating generated circuits.
- [ ] T009 [US3] [CODE-DEEPSEEK] Add `scripts/audit-regional-demand.mjs` to run
  the fixed seed corpus, emit stable text/JSON evidence, and fail checked-in
  profile drift beyond ±1; this is a development audit, never runtime code.
- [ ] T010 [US3] [CODE-DEEPSEEK] Check in all seven validated measured vectors,
  corpus version, sample count, and provenance in
  `src/content/regionalDemandProfiles.ts`; do not choose values from region prose.
- [ ] T011 [P] [US3] [CODE-DEEPSEEK] Add import/call-count tests proving runtime
  acquisition projections read checked-in profiles and never call track
  generation, race simulation, corpus code, or RNG.

**Checkpoint**: Four-stat regional guidance is reproducible authority, not art
or flavor copy.

## Phase 3 — Visual demand chart and optional plate fallback (US3)

- [ ] T012 [P] [US3] [CODE-DEEPSEEK] Add failing pure-model tests for axis order,
  39/69/100 grids, band boundaries, polygon coordinates, solid/circle regional
  styling, dashed/diamond next-race styling, ties, item alignment, exact text,
  accessibility, and invalid fallback in
  `tests/unit/regionalDemandPresentation.test.ts`.
- [ ] T013 [US3] [CODE-DEEPSEEK] Implement pure `DemandChartModel` projection in
  `src/scenes/regionalDemandPresentation.ts`, consuming validated profile and
  optional retained snapshot only.
- [ ] T014 [US3] [CODE-DEEPSEEK] Create the code-native Phaser axes/grid/polygon/
  marker/label renderer in `src/scenes/regionalDemandVisuals.ts`; all meaning
  must survive with no image texture.
- [ ] T015 [P] [US3] [CODE-DEEPSEEK] Add a typed optional plate manifest key,
  preload-safe lookup, 760/1024 safe area, missing/corrupt fallback, and tests;
  do not add, generate, crop, or approve the PNG.
- [ ] T016 [US3] [CODE-DEEPSEEK] Add deterministic compact/expanded chart layout
  bounds and fallback priorities for dense three-card hosts in
  `src/scenes/regionalDemandPresentation.ts` and geometry tests.

**Checkpoint**: The regional visualization is complete without the optional
frontier asset.

## Phase 4 — Every typed acquisition surface (US3)

- [ ] T017 [P] [US3] [CODE-DEEPSEEK] Add failing no-side-effect integration
  fixtures for Parts Supplier, Reward Draft, Cross-Pollination, Tag Specialist,
  Feature 042 neutral/Loot supplier, and a future typed acquisition host in
  `tests/integration/acquisition-demand-flow.test.ts`.
- [ ] T018 [US3] [CODE-DEEPSEEK] Add one acquisition-context adapter/registry in
  `src/scenes/encounterPresentation.ts` that supplies region, optional retained
  snapshot, selected item, compact/expanded mode, and fallback without RNG.
- [ ] T019 [P] [US3] [CODE-DEEPSEEK] Integrate the shared demand model/renderer
  into Parts Supplier, Reward Draft, and Cross-Pollination in
  `src/scenes/PrepareScene.ts` without moving offer/transaction authority.
- [ ] T020 [P] [US3] [CODE-DEEPSEEK] Integrate the same model into Tag Specialist
  and other typed item-acquisition variants in `src/scenes/RunScene.ts`.
- [ ] T021 [US3] [CODE-DEEPSEEK] Integrate Feature 042's neutral supplier/Loot
  source through the registry after rebasing; prove future declared acquisition
  hosts receive context automatically and non-acquisition encounters do not.
- [ ] T022 [US3] [CODE-DEEPSEEK] Add selected-item factual High-demand alignment
  rows via canonical item contributions in shared item/acquisition presentation;
  prohibit best-item, time, outcome, or finish predictions.

**Checkpoint**: Every item choice has the same truthful visual regional context
and opening it changes no game state.

## Phase 5 — Prominent Improvised state (US2)

- [ ] T023 [P] [US2] [CODE-DEEPSEEK] Add failing badge/state tests for Fitted,
  Flexible, consequential Improvised, no-additional-effect Improvised, Adapted
  Mount, stored, compact/full, monochrome, and reduced motion in
  `tests/unit/installationPresentation.test.ts`.
- [ ] T024 [US2] [CODE-DEEPSEEK] Create the pure shared badge projection in
  `src/scenes/installationPresentation.ts`, mapping authoritative state only and
  assigning large prominence exclusively to Improvised.
- [ ] T025 [US2] [CODE-DEEPSEEK] Extend `src/scenes/itemPresentation.ts` and
  `src/scenes/garagePresentation.ts` with the shared compact badge while keeping
  canonical full inspector ordering and exact active/lost behavior.
- [ ] T026 [P] [US2] [CODE-DEEPSEEK] Integrate badge and details into placement
  previews and installed garage cards in `src/scenes/PrepareScene.ts`, including
  keyboard/pointer/touch-equivalent preview parity.
- [ ] T027 [P] [US2] [CODE-DEEPSEEK] Integrate the compact badge into
  `src/scenes/InventoryScene.ts` and `src/scenes/PreRaceScene.ts` using current
  preview/locked evidence only.
- [ ] T028 [US2] [CODE-DEEPSEEK] Integrate retained-only badge/details into
  selected race evidence and `src/scenes/ResultScene.ts`; do not add an always-
  visible log or recompute installation from catalog/coordinates.
- [ ] T029 [P] [US2] [CODE-DEEPSEEK] Add end-to-end reconciliation and layout
  tests across all required surfaces in
  `tests/integration/improvised-visibility-flow.test.ts`.

**Checkpoint**: Improvised is unmistakable without adding confirmation friction
or changing the legal placement result.

## Phase 6 — Deck content, preference, and pure presentation (US1)

- [ ] T030 [P] [US1] [CODE-DEEPSEEK] Add failing preference tests for missing,
  completed, skipped, unknown-version, malformed, read/write-throwing, replay,
  and fail-open cases in `tests/unit/tutorialPreference.test.ts`.
- [ ] T031 [US1] [CODE-DEEPSEEK] Implement injected versioned storage adapter in
  `src/scenes/tutorialPreference.ts`; use one namespaced key and never access
  Run/practice recovery storage.
- [ ] T032 [P] [US1] [CODE-DEEPSEEK] Author exactly the ten stable slide
  definitions from `tutorial-content.md` in `src/content/howToPlay.ts`, with no
  Test Day reference and no copied numerical mechanics.
- [ ] T033 [P] [US1] [CODE-DEEPSEEK] Add failing deck schema/order, 55-word body,
  required-capability, accessibility, navigation, Skip-every-page, and no-Test-
  Day tests in `tests/unit/howToPlayPresentation.test.ts`.
- [ ] T034 [US1] [CODE-DEEPSEEK] Create pure deck/page/navigation/capability
  validation and authoritative visual adapters in
  `src/scenes/howToPlayPresentation.ts`.
- [ ] T035 [P] [US1] [CODE-DEEPSEEK] Add fixtures/tests for all ten visual kinds,
  including Feature 041/042 unavailable/version-incompatible fallbacks without
  invented tutorial facts.
- [ ] T036 [US1] [CODE-DEEPSEEK] Implement bounded code-native slide layouts and
  geometry assertions in `src/scenes/howToPlayPresentation.ts`; use current
  approved textures only and add no new image assets.
- [ ] T037 [US1] [CODE-DEEPSEEK] Create `src/scenes/HowToPlayScene.ts` with
  Back/Next/Finish/Skip/Exit, page `n/10`, pointer/touch/keyboard controls,
  visible focus, reduced-motion equivalence, and idempotent actions.

**Checkpoint**: The complete current rules course is truthful, static,
skippable from page one, and isolated from real gameplay.

## Phase 7 — First-run, Title, Settings, and contextual Help (US1/US4)

- [ ] T038 [P] [US1] [CODE-DEEPSEEK] Add failing routing tests for first Begin,
  compatible completed/skipped preferences, storage failure, Finish/Skip to
  entrant selection, Title Replay, Settings Replay/Exit, and duplicate commands
  in `tests/integration/how-to-play-flow.test.ts`.
- [ ] T039 [US1] [CODE-DEEPSEEK] Update `src/scenes/TitleScene.ts` so Begin
  consults preference before entrant selection and a persistent How to Play /
  Settings route remains available after Skip/completion.
- [ ] T040 [P] [US4] [CODE-DEEPSEEK] Create pure minimal Settings/Help model with
  `Replay How to Play` in `src/scenes/settingsPresentation.ts`; do not absorb the
  future full settings-suite scope.
- [ ] T041 [US4] [CODE-DEEPSEEK] Create `src/scenes/SettingsScene.ts`, register it
  and `HowToPlayScene` in `src/main.ts`, and implement correct caller-aware Exit
  without creating/restarting a run.
- [ ] T042 [P] [US4] [CODE-DEEPSEEK] Add failing contextual Help tests for
  selection, pending replacement confirmation, offer/receipt feedback, focus,
  cancel, duplicate close, and run/RNG deep equality in
  `tests/integration/contextual-help-flow.test.ts`.
- [ ] T043 [US4] [CODE-DEEPSEEK] Create pure concise topology/demand help models
  and overlay lifecycle in `src/scenes/helpPresentation.ts`; retain live host
  model references/IDs and never clone or serialize a run.
- [ ] T044 [US4] [CODE-DEEPSEEK] Integrate contextual Help into garage and all
  acquisition hosts, restoring exact focus/selection/confirmation state on
  close and adding no persistent chrome to contest playback.
- [ ] T045 [P] [US4] [CODE-DEEPSEEK] Add pointer/touch/keyboard, focus order,
  Escape/Back, no-hover, monochrome, reduced-motion, and host-restoration parity
  assertions for deck, Settings, and contextual overlays.

**Checkpoint**: Players can skip, replay, and request help without losing the
decision in front of them.

## Phase 8 — Compatibility, automated gates, and separate asset/manual lanes

- [ ] T046 [P] [CODE-DEEPSEEK] Add a static content/scene audit proving all
  player-facing Test Day strings/targets are suppressed while internal files,
  registrations, and tests remain present in
  `tests/integration/test-day-visibility.test.ts`.
- [ ] T047 [P] [CODE-DEEPSEEK] Rebase against Features 041/042 and pass deck,
  adjacency, Loot, neutral supplier, item-role, and Improvised compatibility
  tests without weakening their contracts.
- [ ] T048 [P] [CODE-DEEPSEEK] Add acquisition and help invariance tests comparing
  offer IDs/order, RNG calls, prices, stock, affordability, transactions, track,
  schedule, run, and contest outputs before/after.
- [ ] T049 [P] [CODE-DEEPSEEK] Add deterministic layout-region tests for ten
  slides, Settings, contextual overlay, large badges, compact/expanded charts,
  long labels, dense cards, and optional-plate fallback.
- [ ] T050 [CODE-DEEPSEEK] Run `node scripts/audit-regional-demand.mjs`, check in
  its corpus summary/evidence reference, and reconcile every region to ±1
  without hand-tuning values to flavor.
- [ ] T051 [CODE-DEEPSEEK] Run all focused commands in `quickstart.md`, repair
  only Feature 045 regressions, and record exact automated outcomes there.
- [ ] T052 [CODE-DEEPSEEK] Run `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run build`, and `npm run build:pages`; confirm existing Test Day suites
  pass and no image/audio/screenshot artifact was added.
- [ ] T053 [CODE-DEEPSEEK] Update Feature 045 implementation notes with changed
  files, preference key/version, seven profile values/corpus version, acquisition
  host registry, exact hidden Test Day entries, routes/fixtures for later manual
  review, and optional plate status.
- [ ] T054 [CODE-DEEPSEEK] Mark T001–T053 code-complete but leave the optional
  asset and manual comprehension/visual gates open; do not claim Feature 045
  fully accepted.
- [ ] T055 [ASSET-FRONTIER-OPTIONAL] Generate/select/approve the decorative
  regional demand plate per `optional-demand-plate.md`, record provenance, and
  provide the exact named PNG. This may occur before or after code and does not
  block the code-native chart.
- [ ] T056 [MANUAL-FRONTIER-OR-OWNER] Execute the qualitative browser and
  comprehension matrix in `quickstart.md`, including optional plate present and
  absent when available. DeepSeek MUST NOT execute, check off, or claim this.

## Dependencies and execution order

- Feature 041 and 042 code must land before T032–T037/T047 final compatibility.
- Phase 1 may land independently and immediately hides Test Day UI.
- Phase 2 blocks chart content; Phase 3 blocks acquisition integration.
- Phase 5 is independent of demand after shared fixtures/types compile.
- Phase 6 consumes authoritative models from Features 041/042 and Phases 2/5.
- Phase 7 follows deck/persistence and blocks final host-state acceptance.
- T055 is optional and never blocks T001–T054. T056 follows automated success.

## Parallel opportunities

- T001/T002/T006/T012/T023/T030 may be prepared in parallel.
- T019/T020 can proceed in parallel after T018; T021 follows Feature 042 rebase.
- Improvised host integrations T026–T028 can proceed in parallel after T025.
- Preference/content tests T030/T032/T033 can proceed in parallel.
- T046/T048/T049 can be prepared in parallel before the final gate run.

