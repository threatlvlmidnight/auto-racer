# Research: Pre-Race Setup

## Decision 1 — Model setup as versioned selections, not mutated item/build data

**Decision**: A locked setup is a separate immutable selection set containing a
rules version, track/encounter binding, and one selection per eligible control
family. The build remains unchanged.

**Rationale**: Setup is race-specific and must be reproducible from asynchronous
ghost evidence. Mutating item definitions or the vehicle build would leak a
temporary choice into later encounters and make canonical replay dependent on
current content.

**Rejected**: Clone and modify item physics. This obscures attribution and makes
same-family aggregation and legacy validation fragile.

## Decision 2 — Use a frozen control catalog with item references

**Decision**: `raceSetup.ts` owns the launch family definitions, position labels,
and exact deltas. Item authoring references a family key and magnitude multiplier
instead of repeating the full labels/deltas in every item.

**Rationale**: Nell and Inez share brake balance. A central catalog guarantees
identical semantics and makes a version hash/ID meaningful.

**Rejected**: Fully inline each item's three choices. This permits near-duplicate
families to drift and complicates cross-pool stacking.

## Decision 3 — Apply summed setup deltas after item stat resolution

**Decision**: Resolve all existing tier/installation/synergy/buff item stats as
today, then add the locked setup's aggregate four-stat delta, clamp to the
existing positive-stat minimum, and pass the resulting stats into segment
physics.

**Rationale**: Setup is an operator/adjustment layer, not another item eligible
for buffs or tiering. This preserves exact signed deltas and avoids unexpected
amplification.

**Rejected**: Materialize setup as synthetic items. Buffs and synergies could
then amplify driver behavior or an equipment adjustment, violating disclosed
values.

## Decision 4 — Preserve setup per car in canonical evidence

**Decision**: `CarResult` (and future ghost records) carries its own validated
setup evidence. `NCarContestResult` does not use one player-only top-level setup.

**Rationale**: Async parity requires every car's time to derive from its own
recorded build and setup. Per-car evidence also supports Results inspection.

**Rejected**: Store only the viewer's setup. That makes rivals mechanically
weaker and prevents canonical multi-viewer replay.

## Decision 5 — Generated rivals use a deterministic temporary policy

**Decision**: Until recorded multiplayer ghosts exist, generated rivals derive
legal controls from their resolved build, enumerate all legal three-position
combinations, resolve the complete race time for each combination on the exact
upcoming track by summing canonical `simulatePlayerLaps` output, and select the
lowest-time setup. Exact ties use canonical
family order then `low`, `balanced`, `high` position order. They call the same
lock/validation and lap simulation as humans; the search runs before
playback and contains no randomness.

**Rationale**: Maintains parity without pretending generated choices are future
network ghost data. Determinism is required by contest integrity.

**Rejected**: Balanced-only rivals; unfair. Random selections; non-canonical.
Demand-score heuristics; they can disagree with the actual engine and produce a
different "best" setup than canonical full-race simulation.

## Decision 6 — Remembering is run state, not global preference

**Decision**: `Run` stores `rememberSetup: boolean` and remembered positions by
family. Start Race writes them only when enabled. Ineligible remembered values
remain dormant and may return later in that run.

**Rationale**: “Until changed” applies within the championship while avoiding
cross-run hidden state or account storage. Family keys survive item replacement.

**Rejected**: Always persist; creates accidental carryover. Store by item ID;
breaks shared-family aggregation.

## Decision 7 — Test Day receives a temporary locked snapshot on the same track

**Decision**: Setup-origin Test Day receives the exact upcoming `Track` and a
temporary locked selection set. It does not write remembered setup or scored
state and restores the draft selection/focus on return.

**Rationale**: A setup system is only learnable if players can test the actual
track interaction before commitment, satisfying Constitution V.

**Rejected**: Existing generic Test Day track; it cannot validate track-aware
tuning. Committing setup before practice; violates no-mutation boundaries.

## Decision 8 — Layout supports the natural maximum, without a gameplay cap

**Decision**: The setup presentation model supports Driver Aggression plus up to
four distinct installed equipment families. At narrow/800×450 layouts, controls
use compact rows and a shared selected-control detail/stat region rather than
five full panels.

**Rationale**: Ignoring a legal installed control is a mechanical bug. Compact
rows preserve readability within the established viewport.

**Rejected**: Cap visible controls. This silently disables acquired equipment.

## Decision 9 — Strict test-first for outcome math

**Decision**: Setup catalog, eligibility, aggregation, validation, stat folds,
per-car contest parity, and Test Day/scored boundaries require failing tests
before implementation. Phaser composition uses pure presentation tests plus
visual verification.

**Rationale**: Resolves the constitution's testing-discipline TODO for this
simulation-changing feature while retaining a practical UI workflow.
