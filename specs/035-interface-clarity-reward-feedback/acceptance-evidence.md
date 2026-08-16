# Acceptance Evidence: Interface Clarity and Reward Feedback

**Feature**: `035-interface-clarity-reward-feedback`
**Branch**: `035-interface-clarity-reward-feedback`
**Status**: Implementation complete — automated gates green; owner browser QA required for visual/input evidence (T003/T043).

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

Disposition of landscape findings at implementation time:

| Case | Scene | Status | Disposition |
| --- | --- | --- | --- |
| identity | Pre-Race / Result / Run-history / Test-Day | **fixed** | retained track name + explicit `LOCATION:` (scored) or `FIXED CONFIGURATION · UNSCORED` (Test Day) |
| rarity card | Offers / garage / inspector | **fixed** | text label, a11y token, frame — never color alone |
| adjustable | Garage / pre-race / inventory | **fixed** | one ADJUSTABLE badge + control label/current value for eligible installed items |
| focus/selected | shared cards | **fixed** | structural ring/underline/strike tokens (`focusPresentation.ts`) |
| per-scene pixel collisions | all four viewports | **owner QA** | browser screenshot + keyboard/touch sweep at each viewport; no genuine host-reflow defect is claimed |
| narrow portrait reflow | 390×844 | **Feature 026** | explicitly out of scope (spec.md scope boundaries) — recorded here, not silently waived |

No failed case has been silently waived; any defect requiring host/canvas reflow
is recorded as a Feature 026 dependency.

## T003 — Baselines

- Prior implementation baseline: 116 test files / 1830 tests.
- Post-implementation: 124 test files / 1864 tests (34 new Feature 035 tests).
- `npm test` ✅ · `npm run lint` ✅ · `npm run build` ✅ · `npm run build:pages`
  ✅ · `npm run audit:artifact` ✅.

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

