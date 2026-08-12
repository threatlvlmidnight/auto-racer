# Implementation Plan: Contextual Physics Effects

**Branch**: `022-contextual-physics-effects` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-contextual-physics-effects/spec.md`

## Summary

Extend `021`'s physics simulation so an item's stat contribution can be
gated by corner-tightness, alongside (never replacing) its existing flat,
whole-lap contribution. Concretely: `simulateLapPhysics` moves from
resolving one `PhysicalStats` object for an entire build to resolving,
per span, which conditional deltas actually qualify — an accelerating
phase's effective `acceleration` depends on the corner it just exited, a
braking phase's effective `brakingPower` depends on the corner it's about
to enter, and a corner's own apex speed depends on `corneringSpeed`
conditions evaluated against that corner directly. Builds with zero
conditional items produce byte-for-byte identical results to `021`'s
shipped model (FR-005/SC-003).

## Technical Context

**Language/Version**: TypeScript (existing project toolchain — Phaser 3,
Vite, Vitest, ESLint; no version change)

**Primary Dependencies**: None new — same closed-form algebra `021` already
uses (`Math.sqrt`, arithmetic), extended with plain threshold comparisons.
No physics engine, no new runtime dependency.

**Storage**: N/A — pure in-memory simulation, same as every existing
`src/simulation/` module.

**Testing**: Vitest, strict test-first (RED before implementation), matching
this repository's established convention for every `src/simulation/`
contract.

**Target Platform**: Existing web build (Vite + Phaser 3), no platform
change.

**Performance Goals**: Unchanged from `021` — still `O(corners)` closed-form
kinematics per lap. Conditional evaluation adds a handful of threshold
comparisons per span/corner, not a new algorithmic order.

**Constraints**: Every `src/simulation/` module stays framework-free (zero
Phaser imports). Zero behavior change permitted for any build with no
conditional items (FR-005) — this is a stronger, explicit guarantee than
"no new required field," verified directly against `021`'s existing
regression suite.

**Scale/Scope**: One feature; touches `src/simulation/tracks.ts`
(`simulateLapPhysics` gains per-span/per-corner conditional resolution,
resolving an effective `PhysicalStats` before each existing `solveSpan`
call — `solveSpan`'s own signature is untouched) and
`src/simulation/types.ts` (new `PhysicsCondition`/
`ConditionalPhysicsContribution` types, `ItemDefinition` gains one new
optional field). `src/simulation/laps.ts` gains a small helper to collect
conditional contributions from active items, mirroring
`resolvePhysicalStats`'s existing shape. No scene, no UI, no content —
this feature builds the capability only (spec.md Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Prepare → Contest Integrity**: PASS. Still closed-form algebra
  evaluated once per car per lap — conditional resolution adds threshold
  comparisons, not a live/interactive/non-deterministic step.
- **II. Fairness**: PASS. Conditional contributions are earned through held
  items exactly like `021`'s flat contributions — same mechanism, no
  purchasable-content path exists.
- **III. Transparency & Legibility**: PASS, and directly load-bearing —
  FR-006 requires the per-lap breakdown to show, per phase, which
  conditional item(s) actually applied there. A conditional item whose
  activity can't be seen would be exactly the kind of invisible modifier
  this principle prohibits.
- **IV. Spectation-First**: PASS. Zero change to track rendering,
  `pointAtProgress`, standings, or commentary — only which stat value feeds
  a given phase's kinematics changes, never how the race is drawn.
- **V. Build Testing Access**: PASS. No change to Test Day/Practice's
  legacy 2-car path — conditional physics only activates where `021`'s
  physics already does (a supplied track), same scoping `021` established.
- **VI. Async-First Architecture**: PASS. No live opponent, no matchmaking
  dependency — unchanged from `021`.

**Result**: All gates PASS. No Complexity Tracking entries required.

**Post-design re-check** (after Phase 1 — `data-model.md`/`contracts/`):
Confirmed still PASS on every principle. Principle III's requirement
sharpened during design: contracts §3 below makes "which phases a
conditional item touched" a directly verifiable per-phase field, not just
an aggregate claim — matching `021`'s own precedent of strengthening
Transparency guarantees during Phase 1 rather than merely preserving them.
No new violation surfaced; no Complexity Tracking entries added.

## Project Structure

### Documentation (this feature)

```text
specs/022-contextual-physics-effects/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── contextual-physics-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/simulation/
├── tracks.ts       # simulateLapPhysics gains per-span/per-corner
│                   # conditional resolution + a new PhysicsCondition-
│                   # matching helper. solveSpan's own 4-arg signature is
│                   # untouched — only what its caller passes in changes.
│                   # cornerArcLength/apexSpeed signatures extend, not
│                   # replace.
├── laps.ts         # new small helper collecting active items' conditional
│                   # contributions, mirroring resolvePhysicalStats's own
│                   # active-item filtering — passed into simulateLapPhysics
│                   # alongside the existing base PhysicalStats.
└── types.ts        # PhysicsCondition, ConditionalPhysicsContribution;
                     # ItemDefinition gains one new optional field.

tests/unit/
└── tracks.test.ts   # new conditional-resolution tests, alongside untouched
                      # existing solveSpan/simulateLapPhysics tests
```

**Structure Decision**: Extends `021`'s existing physics functions in place
— no new files, no new module boundary. Mirrors both `018` and `021`'s own
decision to extend `tracks.ts`/`laps.ts` rather than introduce a parallel
module, since this is additive resolution logic inside functions that
already exist, not a new subsystem.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*

## Delivery Order

1. **Foundational** — `PhysicsCondition`/`ConditionalPhysicsContribution`
   types; the corner-tightness matcher, unit-tested in isolation (pure
   function, no simulation wiring yet).
2. **US1** — `simulateLapPhysics`/`solveSpan` resolve conditional deltas
   per span/corner; the concrete motivating case (tight-corner acceleration
   specialist) works end to end against a real generated track.
3. **US2** — Zero-regression guard: every `021` physics test still passes
   unmodified; a build with zero conditional items is byte-for-byte
   unchanged. Ordered immediately after US1, before US3/US4, mirroring
   `021`'s own "regression guard before enrichment" ordering.
4. **US3** — Per-phase inspectability: the physics breakdown surfaces which
   conditional item(s) matched which phase.
5. **US4** — Generalize: all four stats, both threshold directions: at
   least one working example item per stat/direction combination. Ordered
   last among the user stories (unlike `021`'s US4, this one is enrichment,
   not a regression guard — plain priority order applies: P1, P1, P2, P3).
6. **Polish** — Full regression, quickstart validation.
