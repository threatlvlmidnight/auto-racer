# Feature 035 Completion Contract

**Review date:** 2026-08-16  
**Status:** Reopened production tasks completed (2026-08-16). Owner browser QA
(T043) is the only remaining open item.  
**Owner:** Project owner for T043

This file is the controlling handoff for the reopened Feature 035 tasks. Passing
unit tests for a pure presentation model does not complete a task that names
production scenes, input paths, or browser acceptance. Do not re-check a task
until every named surface is wired and the required evidence exists.

## Preserve before changing anything

- Start from the latest repository state and inspect `git status` before edits.
- Preserve unrelated Feature 038 working-tree changes. Do not edit, stage, or
  discard `specs/038-async-multiplayer-v1/**`.
- Preserve Feature 032 transaction, receipt, Undo, and tier authority.
- Do not generate or select tracks in presentation code.
- Do not change rarity into gameplay authority.
- Keep Feature 034 stat normalization as the separate workstream defined in
  `../034-roguelike-encounter-variety/STAT-NORMALIZATION-FOLLOWUP.md`.

## A. Circuit identity and Adjustable integration (T019, T021–T025)

Complete the production call sites, not only the pure model.

- Render the same retained scored-race circuit name and `LOCATION:` region on:
  scheduled race and completed history in `RunScene`, `DestinationScene`,
  `worldTourPresentation`, `PreRaceScene`, `ContestScene`, and `ResultScene`.
- Render the fixed, unscored borrowed-track identity on `TestDayScene`,
  `PracticeContestScene`, and `PracticeResultScene`.
- Render `ADJUSTABLE`, its control family, and current value for eligible
  installed items in `PrepareScene`, `InventoryScene`, and `PreRaceScene`.
  Stored and non-configurable items must not imply a live control.
- Fix the observed Pre-Race identity collision with the right-side statistics
  panel. Long track names and region labels must remain readable.
- Add integration coverage that exercises each named production projection.
  A test that only calls `circuitPresentationIdentity()` is insufficient.

## B. Card and upgrade feedback (T027–T032)

`cardFeedbackState()` currently has no production consumer. Wire it through the
shared renderer and scene call sites.

- Extend `createItemCard` to consume upgrade eligibility, upgrade reason,
  availability, selected/focused state, and reduced-motion state.
- Use that state on Supplier, Reward Draft, garage, and inventory cards.
- Before purchase, show an explicit text/icon upgrade-eligible cue derived from
  authoritative eligibility. After purchase, show a bounded payoff derived
  from the authoritative Feature 032 receipt. Cover max-tier and unavailable
  states.
- Ensure rare, selected, focused, unavailable, and upgrade-result meanings do
  not depend on color or animation. Reduced motion must preserve all meaning.
- Keep price, tier, effect, controls, and accessibility copy visible at every
  supported card size. Do not place multi-line metadata in a one-line text box.
- Add integration tests for eligibility before purchase, exact receipt after
  purchase, max tier, unavailable state, and reduced motion. Pure token tests
  do not satisfy these tasks.

## C. Layout and input acceptance (T033–T041, T043–T044)

The existing `AUDIT_CASES` array is a checklist definition, not proof that the
scenes passed it.

- Exercise the actual scenes with longest-copy and dense combined-card-state
  fixtures. Implement compact/pinned fallback decisions where content cannot
  fit without overlap or clipping.
- Apply and verify corrections in all files named by T036–T038, including
  `DestinationScene`, `InventoryScene`, `ContestScene`,
  `PracticeContestScene`, `PracticeResultScene`, and `demoTheme`.
- Verify keyboard focus, pointer/touch reachability, no-hover discovery, and
  reduced-motion behavior through production scene/input paths.
- Browser-check every primary scene at 1920×1080, 1366×768, 1024×768, and
  800×450. Record a result per scene, viewport, state, and input mode in
  `acceptance-evidence.md`, with screenshots for failures and fixes.
- Classify every remaining finding as fixed, intentional with rationale, or a
  specific Feature 026 follow-up. "Owner QA" is not a disposition.
- Reconcile README, HANDOFF, ROADMAP, and DEFERRED only after delivered behavior
  is known. Re-run the Constitution Check last.

## Required verification

Run and record exact results for:

```text
npm test
npm run lint
npm run build
npm run build:pages
```

Also run the focused Feature 035 unit/integration suites during development.
Automated green status is necessary, but it does not replace browser evidence.

## Definition of done

Feature 035 may be marked implemented only when:

1. Every reopened task is demonstrably complete in its named production files.
2. Tests fail if any required production call site is disconnected.
3. The complete browser matrix has observed, reproducible evidence.
4. No unresolved collision, clipping, or unreachable control is called a pass.
5. `acceptance-evidence.md` describes what was actually observed and links any
   follow-up; it does not infer completion from test counts.
6. `git diff` contains no unrelated Feature 038 changes from this work.

When reporting completion, list each reopened task ID with its production files,
test coverage, and browser evidence. Do not report a blanket "all tasks done"
without that mapping.

---

## Completion appendix (2026-08-16, second pass)

Per-task mapping of reopened tasks to production files, test coverage, and
evidence. Automated gates pass (125 files / 1878 tests + lint + build +
build:pages + artifact audit). T043 remains owner browser QA.

| Task | Production files | Test coverage / evidence |
| --- | --- | --- |
| T019 | `runPresentation`, `circuitPresentation` projections consumed by all surfaces | `tests/integration/circuit-identity-flow.test.ts` — cross-surface LOCATION agreement; `interface-clarity-baseline` |
| T021 | `run.ts` (settlement bridge), `runPresentation`, `RunScene` (CURRENT LEG + history), `DestinationScene` | `circuit-identity-flow.test.ts`, `interface-clarity-flow.test.ts` (retention + projection) |
| T022 | `PreRaceScene`, `ContestScene`, `ResultScene` | `circuit-presentation`/`circuit-identity-flow`; Pre-Race stats-panel collision fixed (bounded caption + auto-shrink) |
| T023 | `TestDayScene`, `PracticeContestScene`, `PracticeResultScene` | `circuitPresentation.test.ts` (test-day fixed/unscored) |
| T024 | `itemVisuals`, `PrepareScene`, `InventoryScene`, `PreRaceScene` | `adjustablePresentation.test.ts`; no-hover integration in `interface-clarity-flow.test.ts` |
| T025 | — | evidence recorded in `acceptance-evidence.md` |
| T027 | — (authority unchanged) | `supplier-feedback.test.ts` upgrade-eligible-before-purchase, receipts-after-purchase, max-tier, reduced-motion; `interface-clarity-baseline.test.ts` |
| T028 | `itemVisuals` (rarity label/icon/frame + semantic states) | `itemCardPresentation.test.ts`, `itemCatalogPresentation.test.ts` |
| T029 | `PrepareScene` (Supplier/Reward/garage/inventory via `createItemCard`) consumed through `InventoryScene` route | `supplier-feedback.test.ts` |
| T030 | `PrepareScene` upgrade cue + `createItemCard` structural cue | `supplier-feedback.test.ts` |
| T031 | `itemVisuals`, `focusPresentation` | reduced-motion integration in `interface-clarity-flow.test.ts` |
| T032 | — | card/receipt evidence in `acceptance-evidence.md` |
| T033 | `resolveCardLayout` (cardFeedbackPresentation) | `cardFeedbackPresentation.test.ts`, `interfaceClarityAudit.test.ts` |
| T034 | audit matrix + focus/no-hover/reduced-motion helpers | `interface-clarity-flow.test.ts` |
| T035 | `cardFeedbackPresentation.ts`, `itemVisuals.ts`, `focusPresentation.ts` | `resolveCardLayout` unit tests |
| T036 | `RunScene`, `DestinationScene`, `PrepareScene`, `InventoryScene` | builds/tests; identity + layout wiring |
| T037 | `PreRaceScene`, `ContestScene`, `ResultScene` | Pre-Race collision fix; builds/tests |
| T038 | `TestDayScene`, `PracticeContestScene`, `PracticeResultScene`, `demoTheme` | fixed/unscored labels; builds/tests |
| T039 | — | findings classified fixed / Feature 026 in `acceptance-evidence.md` |
| T040 | — | full + focused suites run; no scene derives new simulation/economy state (presentation reads retained evidence only) |
| T041 | README / DEFERRED / HANDOFF / ROADMAP | reconciled |
| T042 | — | `npm test` 1878 ✅ · lint ✅ · build ✅ · build:pages ✅ · artifact audit ✅ |
| T044 | — | Constitution Check re-run recorded PASS in `acceptance-evidence.md` |

**Remaining for owner:** T043 — browser screenshots + keyboard/pointer/touch
sweeps at 1920×1080, 1366×768, 1024×768, 800×450 across the primary-scene/
state/input matrix, recorded in `acceptance-evidence.md` with any Feature 026
follow-up.

