# LLM Handoff: Test Day Blocker Resolution

**Date**: 2026-08-08  
**Repository**: `/Users/micah/Documents/repos/auto-racer`  
**Git branch**: `main`  
**Active Spec Kit feature**: `specs/011-build-test-day` via `.specify/feature.json`  
**Purpose**: Finish feature 011 so feature 010 (`entrant-vehicle-garage`) can pass its constitutional T001 gate.

## Current State (updated 2026-08-08, Phase 7 complete — one row from PASS)

Feature 011 implementation and evidence-gathering are fully done: **T001-T067, 67/67
tasks.** SC-008 (T066) was run by the project owner following the script this session
provided — 5/5 participants passed both questions unprompted, recorded in
`acceptance-evidence.md` Section 10.

- All Phase 1-6 functionality (availability, recovery, accessibility) is implemented,
  tested (262 automated tests), and manually verified in a real browser.
- `specs/011-build-test-day/acceptance-evidence.md` is the authoritative, honest gate
  record. **Its overall verdict is still FAIL, on exactly one remaining row**:
  - **390x844 viewport**: measured directly (not estimated) — the shared 800x450
    `Phaser.Scale.FIT` canvas scales text down to ~7.8px/~6.8px at that width, well under
    the 16px/14px floors. This is a pre-existing, project-wide gap (every scene shares the
    same canvas/scale config), not something Test Day's own code can fix in isolation —
    it needs the responsive/mobile frame work `specs/visual-overhaul.md` Slice 1 already
    anticipates.
- Two real bugs were found and fixed via manual browser testing (not caught by unit
  tests): `createDemoButton`'s `.once()` click wiring silently broke repeatable
  PAUSE/SPEED controls, and the unavailable-recovery screen's RETURN button discarded a
  perfectly good run instead of returning to it. Both fixed; see acceptance-evidence.md
  Section 6.2/6.3 for repro details.
- Known scope boundary: recovery write/read/clear is wired at realistic in-session
  points (Start Test, cancel, return, repeat), but this codebase has no run-persistence
  layer at all (nothing survives an actual page reload today), so full reload-survives
  rehydration was not built — only the data-layer + live-browser round trip is verified.
  This is documented explicitly in acceptance-evidence.md Section 5 rather than claiming
  untested reload behavior.

**What this means for feature 010**: it remains correctly blocked at T001 on the single
390x844 viewport row. Before `specs/010-entrant-vehicle-garage/gate-evidence.md` can record
PASS, a project owner needs to either (a) scope and ship a minimal mobile/responsive canvas
pass, or (b) consciously decide to relax/waive that requirement for a pre-release
prototype. This is a product decision, not something to resolve by further LLM
implementation work — though if (a) is chosen, implementing it is a normal follow-on
feature (likely its own `/speckit.specify` cycle, since it touches `src/main.ts`'s shared
scale config and every scene, not just Test Day).

Validation at this update:

```text
npx vitest run  -> PASS (22 files, 262 tests)
npm run build   -> PASS
npx eslint .    -> PASS
npx tsc --noEmit -> PASS
```

Known non-failing warnings:

- Vite reports the Phaser bundle is larger than 500 kB.
- ESLint reports TypeScript 5.9.3 is newer than the parser's officially supported `<5.6.0` range.

## Authoritative Artifacts

Read these before editing:

1. `specs/011-build-test-day/tasks.md` - exact execution order and acceptance gates.
2. `specs/011-build-test-day/spec.md` - requirements and success criteria.
3. `specs/011-build-test-day/plan.md` - architecture and constitution checks.
4. `specs/011-build-test-day/contracts/test-day-contract.md` - public contracts.
5. `specs/011-build-test-day/data-model.md` - immutable state model.
6. `specs/011-build-test-day/quickstart.md` - validation workflow.
7. `.specify/memory/constitution.md` - especially Principles I, III, and V.
8. `specs/010-entrant-vehicle-garage/tasks.md` - downstream T001 evidence consumer.

## Implemented Behavior

The implementation currently provides:

- Pure practice/Test Day state outside `Run` in `src/simulation/practice.ts`.
- Fixed disclosed practice configuration: `ghost-001`, 5.85-second laps, 10 laps.
- Immutable build snapshots and deterministic practice resolution through the authoritative `resolveContest` path.
- Deep protected-run projections and mutation detection.
- No practice settlement, purse, sponsor resolution, run advancement, history entry, or scored-result mutation.
- Exact return-context support from run hub, Supplier, Reward Draft, and pre-start PvP briefing.
- Dedicated `TestDayScene`, `PracticeContestScene`, and `PracticeResultScene`.
- Shared playback facts and transparent lap/item/buff/storage/clamp contribution evidence.
- Practice scenes registered in `src/main.ts`.
- Tests proving deterministic repeats, authority boundaries, protected state, route preservation, playback invariance, and scored-flow regression.

Primary implementation files:

```text
src/simulation/practice.ts
src/simulation/contest.ts
src/simulation/laps.ts
src/simulation/playback.ts
src/simulation/types.ts
src/scenes/TestDayScene.ts
src/scenes/PracticeContestScene.ts
src/scenes/PracticeResultScene.ts
src/scenes/practicePresentation.ts
src/scenes/RunScene.ts
src/scenes/PrepareScene.ts
src/main.ts
```

## Non-Negotiable Constraints

- Do not add practice state to `Run`, `RunStage`, encounter history, or scored results.
- Do not create a second contest resolver or recalculate result facts in presentation code.
- Practice must delegate to existing contest and playback authority.
- Starting Test Day locks one immutable deep-copied build snapshot.
- Returning in memory must preserve the original `Run` object and exact origin encounter/UI context.
- Test Day must never award or remove credits, settle sponsors, advance stages, alter offers/restock state, or affect scored analytics.
- Playback controls are presentation-only and cannot affect outcomes.
- No live contest input may alter a result.
- Do not absorb feature 010 garage topology into feature 011.
- The worktree is intentionally very dirty and contains substantial user/previous-agent work. Never revert unrelated changes.
- Do not commit unless explicitly requested.

## Next Work

Phases 1-7 (T001-T067, all 67) are complete. Feature 011 implementation and
evidence-gathering are fully done. What's left is not more implementation work on Test
Day itself — it's a product decision plus, if pursued, a separate feature:

1. Read `specs/011-build-test-day/acceptance-evidence.md` Section 11 for the one remaining
   blocking row (390x844 viewport).
2. Decide how to close it: scope a real mobile-responsive canvas pass (bigger than Test
   Day — touches `src/main.ts`'s shared `Phaser.Scale.FIT` config and every scene) as its
   own feature, or consciously waive/relax that requirement for a pre-release prototype.
3. Only after that row is closed (or explicitly waived by the project owner) should
   `specs/010-entrant-vehicle-garage/gate-evidence.md` be created/updated to index this
   evidence and record PASS, unblocking feature 010 T001.

Do not silently mark the gate PASS to unblock 010 — that defeats the point of the gate.
If the project owner decides to proceed with 010 anyway despite the FAIL, that must be an
explicit, visible decision (e.g. amending the constitution or spec 011/010's dependency),
not something quietly done in `gate-evidence.md`.

## Suggested First Commands

```sh
cat specs/011-build-test-day/acceptance-evidence.md   # read Section 11 first
npx vitest run
npm run build && npx eslint .
git status --short
```

## Copy/Paste Continuation Prompt

```text
Continue Spec Kit feature 011-build-test-day in /Users/micah/Documents/repos/auto-racer. Read specs/011-build-test-day/HANDOFF.md and specs/011-build-test-day/acceptance-evidence.md (especially Section 11). Feature 011 is fully implemented and complete (T001-T067, 67/67, including a real 5-participant SC-008 study that passed 5/5); the gate's overall verdict is FAIL on exactly one remaining row: the 390x844 viewport (a real, pre-existing, project-wide canvas-scaling gap, not unique to Test Day — the shared Phaser.Scale.FIT canvas shrinks text below the 14px/16px floor at phone width). Do not silently flip the gate to PASS. The next step is a project-owner decision on how to close that row (a dedicated responsive/mobile feature, or an explicit waiver), then creating specs/010-entrant-vehicle-garage/gate-evidence.md to index the evidence once it legitimately passes. The worktree is intentionally dirty; do not revert unrelated changes or commit unless asked.
```
