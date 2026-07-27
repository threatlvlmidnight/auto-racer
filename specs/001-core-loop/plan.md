# Implementation Plan: Core Loop — Baseline Build vs. Sample Ghost

**Branch**: `001-core-loop` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-core-loop/spec.md`

## Summary

Prove the prepare → contest loop end to end: the player is offered one item, chooses to accept or decline it, the resulting build is raced 1v1 against a fixed sample ghost with the outcome computed and displayed instantly, and the result is legible as a qualitative comparison against the baseline. Built as a TypeScript + Phaser web game (Vite-bundled), with the contest-resolution logic implemented as a framework-free core module, isolated from the Phaser presentation layer, so it can be strictly TDD'd in Vitest without a browser environment and carried forward unchanged into a future Capacitor-wrapped mobile build.

## Technical Context

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Phaser 3 (game framework/rendering), Vite (bundler/dev server)

**Storage**: N/A for this feature — the sample ghost and the single offered item are static data bundled with the client. No database or backend exists in this feature's scope.

**Testing**: Vitest for the contest-resolution simulation module, under strict TDD (tests written and failing before implementation, per Constitution Development Workflow). Presentation code (Phaser scenes/UI) is tested lightly or manually — not under strict TDD — per the constitution's simulation-only testing discipline decision.

**Target Platform**: Web (modern desktop and mobile browsers) for this feature. A native mobile app (iOS/Android, via Capacitor wrapping this same codebase) is a planned later milestone and explicitly out of scope for this feature's implementation.

**Project Type**: Single-project web game client. No backend/server exists in this feature's scope.

**Performance Goals**: Contest computation resolves and is displayed within ~100ms of being started — there is no real-time simulation to wait on (Clarification: instant computation, not a live-watched race). UI interactions (item accept/decline, starting a contest, viewing results) feel immediate. No twitch-action performance profile exists anywhere in this feature.

**Constraints**:
- No live multiplayer or matchmaking infrastructure (Constitution Principle VI, Async-First Architecture).
- No player input may affect a contest once started (Constitution Principle I).
- No purchasable content may affect outcomes (Constitution Principle II) — trivially satisfied today since no monetization exists yet.
- The contest-resolution module MUST have zero dependency on Phaser or any rendering/DOM API, so it can be unit tested in isolation under Vitest and carried forward unmodified into a future Capacitor mobile build.
- The contest-resolution module MUST internally model a race as a sequence of positions/time over the run's duration (not only a final scalar result), even though this feature only surfaces the final outcome. This costs nothing now and avoids a rewrite when a future feature adds live/broadcast-style playback (Constitution Principle IV, Spectation-First — deferred, not exempted; see `specs/DEFERRED.md`).

**Scale/Scope**: Solo/small-team project. Single feature slice. No concurrent-user or live-scale concerns in this feature — client-only, one fixed sample ghost, no backend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare → Contest Integrity | PASS | Prepare phase (accept/decline) fully resolves before a contest starts; contest is computed atomically with no input surface during resolution. |
| II. Fairness | PASS | No monetization exists in this feature's scope; nothing to violate yet. |
| III. Transparency & Legibility | PASS | Qualitative baseline-vs-modified comparison is a first-class requirement (FR-007), enforced by the simulation module's tested output shape. |
| IV. Spectation-First | DEFERRED, not violated | This feature only needs a final result (Clarification Q1), but the Constraints section above requires the simulation to model the race as a time-series internally, so a future live/broadcast feature can play it back without recomputation. |
| V. Build Testing Access as Core | DEFERRED, not violated | Retesting/test-day mechanic was removed from this feature during clarify (Q5) and logged in `specs/DEFERRED.md` for a later encounters/events feature. |
| VI. Async-First Architecture | PASS | Fixed sample ghost, no live opponent, no matchmaking infrastructure. |
| Product Constraints — Visual medium | PASS | Phaser is a 2D-first framework. |
| Product Constraints — Spec series | PASS | Single shared baseline car; the offered item is the one axis of deviation from it. |
| Product Constraints — Theme | N/A | Not exercised by this feature; the offered item is illustrative/placeholder content only. |
| Development Workflow | PASS | Followed the Spec Kit phase gate (specify → clarify → this plan); this is the minimal vertical slice per the workflow's stated preference. |

No violations requiring justification — Complexity Tracking table below is empty.

**Post-Phase-1 re-check**: data-model.md, the simulation contract, and quickstart.md introduce nothing that changes the table above. Notably, the `timeline` field in `ContestResult` (data-model.md) is the concrete implementation of the Spectation-First forward-compatibility constraint — still DEFERRED at the feature level, still not violated, and now has a named, tested shape rather than being just a stated intention.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-loop/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/            # Phase 1 output
│   └── simulation-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

```text
src/
├── simulation/            # Framework-free core — strict TDD, no Phaser/DOM dependency
│   ├── contest.ts         # resolveContest(build, ghost) -> ContestResult
│   ├── build.ts           # Build/SpecCar/OfferedItem types and helpers
│   └── types.ts           # Shared simulation types
├── content/               # Static illustrative data for this feature
│   └── sample-data.ts      # The baseline car, the one offered item, the sample ghost
├── scenes/                # Phaser presentation layer — depends on src/simulation, never the reverse
│   ├── PrepareScene.ts     # Offer the item; accept/decline
│   ├── ContestScene.ts     # Trigger resolution, transition to results
│   └── ResultScene.ts      # Display the qualitative comparison
└── main.ts                # Phaser game bootstrap/config

tests/
├── unit/                  # Vitest — strict TDD against src/simulation
└── integration/           # Lighter, optional — scene/UI wiring smoke checks

# Root tooling (standard Vite + Phaser + TS scaffolding)
index.html, vite.config.ts, tsconfig.json, package.json, vitest.config.ts
```

**Structure Decision**: Single web game client project (no backend). The contest-resolution simulation is isolated in `src/simulation/`, has no dependency on Phaser or any DOM/browser API, and is the only part of the codebase held to strict TDD — matching the constitution's simulation-only testing discipline decision and keeping that module portable, unmodified, into a future Capacitor-wrapped mobile build. `src/scenes/` (Phaser presentation) depends on `src/simulation/`; the dependency never runs the other way.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
