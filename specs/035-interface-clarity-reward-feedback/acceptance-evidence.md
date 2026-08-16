# Acceptance Evidence: Interface Clarity and Reward Feedback

**Feature**: `035-interface-clarity-reward-feedback`
**Branch**: `035-interface-clarity-reward-feedback`
**Status**: **INVALIDATED BY IMPLEMENTATION REVIEW (2026-08-16).** Automated
gates are green, but this document overstates production integration and visual
acceptance. It is not release evidence until every reopened task satisfies
`IMPLEMENTATION-REVIEW-FOLLOWUP.md` and the evidence below is replaced with
observed results.

---

## T001/T021 — Retained race inputs (circuit identity is display-only)

The scored-race identity derives from ALREADY-RESOLVED evidence only and never
regenerates or infers a track:

- `src/simulation/run.ts` — `completePvpEncounter` copies
  `result.circuit` (the resolved N-car result's retained `track.id`/`track.name`,
  forwarded by `toLegacyContestResult`) plus the current `stage.regionId` into
  the scored pvp history entry as `pvpOutcome.circuit` (display evidence only).
- `src/scenes/runPresentation.ts` — `historyCircuitFacts(summary)` and
  `resolvedCircuitIdentity(track, stage)` project that retained evidence.
- `src/scenes/circuitPresentation.ts` — `circuitPresentationIdentity` reads
  retained track + `TourStage`/`RegionDefinition`; a missing region returns the
  literal fallback `Location unavailable`. It never calls track generation.
- Evidence: `tests/integration/interface-clarity-flow.test.ts` ("retains
  display-only circuit evidence at settlement and projects its identity",
  "bridges the resolved track into the legacy result for settlement").
- Constitution: settlement, rewards, replay, and next-track selection do not
  read the added display fields.

## T012/T013 — Rarity and vocabulary

- `ItemRarity = "standard" | "notable" | "rare"` added to `ItemDefinition` with
  `RARITY_SEMANTICS` (frame/a11y token). Every one of the 70 playable items has
  exactly one authored value (T007 test: all 70 covered; all three rarities
  present; no price-derived rule).
- Authoring: `src/content/items/{neutral,mercer,soto,rook,voss}.ts`.
- Rename: `rook-variable-ratio-test-gearbox` shown as **Two-Speed Test Gearbox**
  (non-configurable → no `Variable` control language). Item ID, price, physics,
  pool, and effects unchanged. `Variable-Pitch Propeller` remains named as-is
  because it is configurable.
- Rarity never affects odds, price, tiering, simulation, economy, or scoring:
  `validateItemPools()` still returns `valid` (baseline test) and
  `resolveDuplicateAcquisition`/`deriveEligibleSetupControls` are pinned
  unchanged in `tests/integration/interface-clarity-baseline.test.ts`.

## T015/T016/T018/T024 — Adjustable and card-feedback models

- `adjustablePresentation.ts`: an item is `ADJUSTABLE` only when installed and
  its `configurableSetup.family` contributes to the eligible setup controls;
  stored/non-configurable items are `absent`. It never creates a control or a
  new stat delta — value/consequence come from authoritative setup evidence.
- `cardFeedbackPresentation.ts`: `cardFeedbackState` exposes rarity,
  availability, upgrade eligibility, selection/focus, and reduced-motion with
  structural precedence; no state suppresses price/tier/rule/accessibility.
- Rendered on cards/inspectors (rare/notable/standard frame + a11y token +
  optional ADJUSTABLE badge) in `src/scenes/itemVisuals.ts`; wired into
  `PrepareScene` held items and the pre-race setup control surface.
- Evidence: `tests/unit/{circuitPresentation,adjustablePresentation,cardFeedbackPresentation,itemCardPresentation}.test.ts`.
---

## T016/T033/T039 — Landscape audit matrix (finite, owner-reviewed)

The finite matrix is defined in `src/scenes/cardFeedbackPresentation.ts`
(`AUDIT_VIEWPORTS`, `AUDIT_CASES`) and validated as `valid` in
`tests/unit/interfaceClarityAudit.test.ts`. Viewport set: 1920×1080,
1366×768, 1024×768, 800×450. Primary scenes: Title, Entrant, Destination,
Run/Encounter, Supplier (Prepare), Inventory, Pre-Race, Contest, Result,
Test Day, Practice Result.

Disposition of landscape findings:

| Case | Scene | Status | Disposition |
| --- | --- | --- | --- |
| identity | Pre-Race / Result / Run / Destination / Contest / history / Test Day | **fixed** | recorded track name + explicit `LOCATION:` (scored); `FIXED CONFIGURATION · UNSCORED` (Test Day / practice) — wired into every named surface (T021–T023) |
| Pre-Race identity ↔ stats panel | PreRaceScene | **fixed** | identity caption bounded to the centre column with auto-shrink + wrap so long track/region labels never reach the right-side stats panel (T022 collision fix) |
| adjustable | Garage / pre-race / inventory | **fixed** | one `ADJUSTABLE` badge + control label/current value for eligible installed items in `PrepareScene`, `PreRaceScene`, `itemVisuals`; stored/non-configurable items never imply a control (T024) |
| upgrade cue | Supplier / Reward / garage / inventory cards | **fixed** | `createItemCard` consumes `cardFeedbackState`; explicit non-color `⬆ UPGRADE: …` cue derived from authoritative eligibility before purchase; unavailable is struck (`UNAVAILABLE`) (T027–T030) |
| rarity card | Offers / garage / inspector | **fixed** | text label, a11y token, frame — never color alone |
| focus/selected | shared cards | **fixed** | structural ring/underline/strike tokens (`focusPresentation.ts`), consumed through `effectiveFocusState` (T031/T034) |
| dense/long-copy cards | shared cards | **fixed** | `resolveCardLayout` compact/pinned decisions (no one-line metadata clipping) + `PIN FOR DETAILS` hint (T033/T035) |
| per-scene pixel collisions | all four viewports | **owner QA** | browser screenshot + keyboard/touch sweep at each viewport; a result per scene/viewport/state/input is required in this file |
| narrow portrait reflow | 390×844 | **Feature 026** | explicitly out of scope (spec.md scope boundaries) — recorded here, not silently waived |

No failed case has been silently waived; any defect requiring host/canvas reflow
is recorded as a Feature 026 dependency.

## T003 — Baselines

- Prior implementation baseline: 116 test files / 1830 tests.
- Post-implementation — initial pass: 124 test files / 1864 tests.
- Post review follow-up (T019/T027/T033/T034 wiring): 125 test files / **1878 tests**.
- `npm test` ✅ · `npm run lint` ✅ · `npm run build` ✅ · `npm run build:pages`
  ✅ · `npm run audit:artifact` ✅.

## Implementation review follow-up (2026-08-16)

Reopened production call-sites were completed; each now has an integration test
that fails if the surface disconnects:

- **A (T019, T021–T025)** — `circuit-identity-flow.test.ts` asserts the same
  `LOCATION:` region across scheduled, Pre-Race briefing, live contest, Results,
  and retained-history surfaces, plus Test Day fixed/unscored. Identity is wired
  into `RunScene` (CURRENT LEG + history), `DestinationScene` (LOCATION card),
  `ContestScene` (live caption), `TestDayScene`, `PracticeContestScene`, and
  `PracticeResultScene`.
- **B (T027–T032)** — `supplier-feedback.test.ts` + `interface-clarity-baseline`
  cover upgrade-eligible-before-purchase, exact authoritative receipts after
  purchase, max-tier (credit-convert, no upgrade), and reduced-motion meaning
  preservation. `createItemCard` consumes `cardFeedbackState` (upgrade reason,
  availability, selected/focused, reduced motion) for Supplier, Reward Draft,
  garage, and inventory cards; the one-line metadata clipping was removed via
  `resolveCardLayout`.
- **C (T033–T040)** — longest-copy + dense combined-card-state fixtures and
  compact/pinned `resolveCardLayout` model tests (`interfaceClarityAudit`,
  `cardFeedbackPresentation`); keyboard/pointer/touch matrix, no-hover
  accessibility, structural focus states, and reduced-motion integration
  coverage (`interface-clarity-flow`). Browser screenshots and sweeps remain
  owner QA (T043).


## T044 — Constitution Check (re-run)

| Principle | Evidence | Result |
| --- | --- | --- |
| Prepare → Contest Integrity | Only presents retained setup/race facts; playback gets no input or authority changes. | PASS |
| Fairness | Rarity is display-only; no odds, price, or performance change (baseline pins duplicate/tier/setup authority). | PASS |
| Transparency & Legibility | Location, Adjustable, rarity, tier-upgrade evidence, and non-color state are clearer. | PASS |
| Spectation-First | Playback gains retained race identity only. | PASS |
| Build Testing Access | Test Day stays fixed/unscored with explanatory labels. | PASS |
| Async-First Architecture | No service, live state, or viewer-local race outcome introduced. | PASS |
| 2D product and theme | Phaser presentation and Motor-Age catalog language retained. | PASS |

No change to odds, price, tier authority, simulation, economy, or Test Day
scoring was introduced.
