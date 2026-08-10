# Implementation Plan: Tag-Targeted Synergy Behavior

**Branch**: `014-item-synergy-tags` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-item-synergy-tags/spec.md`

## Summary

Add a new, extensible `synergyEffects` field to `ItemDefinition`, separate
from the existing identity-tag-only `buff` field (which stays unchanged so
item-012/014/015 keep working exactly as today). A synergy effect targets
a `synergyTags` value or an `installationCategory`, applies either to
other matching items (Boost-Others) or to the source item itself
(Self-Conditional), and is gated by one of two initial condition shapes
(linear per-count, exact-other-count) authored as a discriminated union so
a third shape can be added later without touching existing items. Synergy
resolution happens once per build (only actively installed items count,
never storage), reusing the exact "fold an additional delta into the
item's effective values" pattern `laps.ts` already uses for Fitted/
Improvised — not a new simulation architecture, an extension of the one
that exists.

## Technical Context

**Language/Version**: TypeScript 5.5, ECMAScript 2020

**Primary Dependencies**: Phaser 3.80, Vite 5; no new runtime dependency

**Storage**: N/A — still no backend. Synergy effects are authored,
static content on `ItemDefinition`, the same way Fitted/Improvised
behavior is today.

**Testing**: Vitest. Strict test-first coverage for all changed
`src/simulation/` contracts: synergy target matching, both condition
shapes (linear and exact-other-count), the active-only counting rule,
self-exclusion, multi-effect composition (two Boost-Others items
targeting the same third item), and full attribution in contribution
evidence. Focused garage-inspector tests for live per-item value display.

**Target Platform**: Modern desktop and mobile web browsers, existing
800x450 Phaser logical game size.

**Project Type**: Single-project 2D web game client

**Performance Expectations**: Synergy resolution is a single pass over
`build.slots` computed once per build (not per lap, since composition
doesn't change mid-race) — no new per-lap cost, consistent with how
Fitted/Improvised resolution already works today.

**Constraints**:
- `synergyEffects` is a new, separate field from `item.buff` — existing
  buff items MUST NOT change behavior or require test changes (FR-008).
- Only actively installed items (on `build.slots`) count toward any
  synergy target; `build.storage` is never counted (FR-005) — a
  deliberate divergence from `007-count-synergy-buff`'s existing
  precedent, which does count storage.
- A synergy effect's source item never counts toward its own target
  (FR-006), matching the existing identity-tag buff exclusion rule.
- The condition vocabulary MUST be a discriminated union (or equivalent
  open shape) so a third condition kind can be added later without
  reworking existing items, tests, or already-shipped effects (FR-012).
- No build-wide "active synergies" overview ships in this pass — only
  per-item live values through each item's own inspector, extending
  `010-entrant-vehicle-garage`'s `garageItemInspector` (FR-013).
- Every synergy-derived value MUST remain independently attributable in
  post-race inspection, the same way Fitted/Improvised contributions are
  attributed today (FR-007, Constitution Principle III).
- No effect may read or modify another car's build (FR-010) — single-build
  scope only, matching every existing simulation rule.

**Scale/Scope**: A new field on `ItemDefinition`; extension of `laps.ts`'s
existing effective-item folding step; extension of `ContributionEvidence`
for synergy attribution; extension of `garageItemInspector` for live
per-item display. A small number of new example items authored to prove
the mechanism — not a retrofit of all 20 existing items.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Prepare -> Contest Integrity | PASS | Synergy resolution happens once per build, before any contest resolves — purely a richer input to the same precomputed simulation, no live behavior. |
| II. Fairness | PASS | Synergy authoring/targeting does not vary by entrant or purchasable content (FR-011). |
| III. Transparency & Legibility | PASS | Every synergy-derived value is independently attributable (FR-007), and the garage shows live per-item values before any contest resolves (FR-009, FR-013). |
| IV. Spectation-First | PASS | Synergy contributions flow into the same lap/contribution evidence a spectator-facing result already shows; no new opaque value is introduced. |
| V. Build Testing Access | PASS | Untouched — this feature only changes item content, `laps.ts`, `types.ts`, and garage presentation, never Test Day/Practice mode's own contract. |
| VI. Async-First Architecture | PASS | No live service or synchronization introduced; purely local, static content plus deterministic simulation. |
| Product - 2D medium | PASS | No visual medium change; extends existing garage inspector text/labels. |
| Product - mechanical parity and topology | PASS | Synergy effects are items' own authored content, available to every entrant equally — no capacity or topology rule is touched. |
| Product - theme | PASS | New example items stay within the existing 1901 motor-age vocabulary; no new theme decision. |
| Development Workflow | PASS | Vertically sliced: Boost-Others (US1) and Self-Conditional (US2) are each independently testable and deliverable. Strict test-first applies to every changed `src/simulation/` contract. |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The data model adds one new authored field and
one new attribution field, both additive; existing `buff`-driven items and
their tests are untouched (FR-008 verified structurally, not just by
intent). All principles above remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/014-item-synergy-tags/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── synergy-effect-contract.md
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── simulation/
│   ├── types.ts                     (MODIFIED) - SynergyTarget,
│   │                                   SynergyCondition (discriminated
│   │                                   union), SynergyEffect,
│   │                                   ItemDefinition.synergyEffects,
│   │                                   ContributionEvidence.synergy
│   ├── synergy.ts                   (NEW) - resolveSynergyEffects(build)
│   │                                   -> per-item effective deltas,
│   │                                   pure and build-level (not per-lap)
│   └── laps.ts                      (MODIFIED) - fold synergy deltas into
│                                       effectiveItem alongside the
│                                       existing Fitted/Improvised fold
├── content/
│   └── sample-data.ts               (MODIFIED) - a small number of new
│                                       example items authored with
│                                       synergyEffects (Boost-Others and
│                                       Self-Conditional), demonstrating
│                                       both shapes
└── scenes/
    └── garagePresentation.ts        (MODIFIED) - garageItemInspector
                                        gains live synergy-effect value
                                        display, per FR-009/FR-013

tests/
├── unit/
│   ├── synergy.test.ts              (NEW) - target matching, both
│   │                                   condition shapes, active-only
│   │                                   counting, self-exclusion,
│   │                                   multi-effect composition
│   ├── laps.test.ts                 (MODIFIED) - synergy deltas folded
│   │                                   into contributions, attributed
│   │                                   correctly
│   └── garagePresentation.test.ts   (MODIFIED) - live synergy value in
│                                       garageItemInspector
```

**Structure Decision**: Preserve the existing single-project split.
Synergy resolution is a new, framework-free `src/simulation/synergy.ts`
module — kept separate from `buffs.ts` (which stays exactly as-is,
serving only identity-tag buffs) rather than merged into it, so
FR-008's "existing buff items unchanged" is a structural guarantee, not
just a testing discipline. `laps.ts` gains one additional fold step,
following the same pattern it already uses for installation behavior.

## Delivery Order

1. Define `SynergyTarget`/`SynergyCondition`/`SynergyEffect` types (the
   condition union open per FR-012) and the new
   `ItemDefinition.synergyEffects` field in `src/simulation/types.ts`.
   Test-first: type-level shape only, no behavior yet.
2. Implement `resolveSynergyEffects(build)` in `src/simulation/synergy.ts`
   — active-only counting (FR-005), self-exclusion (FR-006), both
   condition shapes, multi-effect composition. Test-first: target
   matching, each condition shape, exclusion, composition of multiple
   simultaneous effects.
3. Fold `resolveSynergyEffects`'s output into `laps.ts`'s `effectiveItem`
   step and extend `ContributionEvidence` with a `synergy` attribution
   field. Test-first: contribution evidence correctly attributes a
   synergy-derived delta to its source item and condition.
4. Author a small number of new example items (at least one Boost-Others,
   at least one Self-Conditional) in `src/content/sample-data.ts`
   demonstrating both shapes without touching the 20 existing items'
   behavior.
5. Extend `garageItemInspector` (`garagePresentation.ts`) to show a held
   item's live synergy-effect value given the current build. Test-first:
   inspector output reflects target-met/not-met state live.
6. Run `npm test`, `npm run build`, `npm run lint` green; confirm zero
   behavior change in any existing `007-count-synergy-buff`/identity-tag
   buff test (SC-005).

## Complexity Tracking

*No entries - Constitution Check reported no violations.*
