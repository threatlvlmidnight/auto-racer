# Research: Demo Feedback Bug Pass

## Decision 1 — Project live stats from retained lap evidence

Extend the existing contribution evidence with before/current values and source
at activation boundaries. A presentation reducer consumes crossed boundaries and
never reruns buffs, synergy, track physics, or contest ordering. Per-frame
recalculation was rejected because it could diverge from settlement and violate
contest integrity.

## Decision 2 — Treat “scaling” as an audited vocabulary

Classify every shipped scaling-like rule as `composition`, `fitted-value`, or
`lap-activation`. The current catalog has no persistent cross-race/day growth.
Cards expose the category's actual inputs and next activation/match. Adding a
generic progression store was rejected because it would legitimize mechanics
that do not exist and expand the balance surface.

## Decision 3 — Centralize tag inspection in one pure selection model

A tag interaction has `idle`, `preview`, or `pinned` state. Hover may preview;
click/tap/keyboard pins. The projection returns full name, held-match count, and
all matching garage locations. Each surface renders the same state rather than
implementing its own tag scan.

## Decision 4 — Preserve authoritative acquisition and garage commands

Purchased offer slots retain an unavailable receipt state until restock; restock
replaces all three offers. Tier-up feedback is a receipt derived from the
already-committed duplicate result. Inventory movement calls existing preview
and commit garage commands. Scenes never mutate arrays directly.

## Decision 5 — Model Undo as one bounded compensating command

An immediate sale records one `SaleUndoSnapshot` containing item identity, tier,
exact prior location, base/modifier payout, and credit values. Undo calls a pure
validated restore command. Any later inventory mutation or scene transition
invalidates it. A general history stack was rejected as unnecessary complexity
and a source of stale-state restoration bugs.

## Decision 6 — Use one inventory session over multiple host scenes

The host captures a typed context token before opening inventory. A pure layout
projection selects overlay or full-window from measured safe bounds, never user
agent. Closing returns the token plus authorized mutations. A new parallel
inventory scene with copied run state was rejected because exact return and
single authority are already known failure points.

## Decision 7 — Make economy effects transaction modifiers

Bookmaker's Chit modifies scored-win settlement, Engine Builder's Nameplate
modifies sale value, and Patron's Brass Plaque modifies successful sponsor
settlement. A held-item scanner returns item/tier/location contributions used by
the owning transaction. This keeps stored items active and produces an itemized
receipt without embedding economy behavior in rendering code.

## Decision 8 — Store race facts; derive the final record

Retained scored history supplies race kind and ordered placement. Wins are
placements 1–3; losses 4–8. Local, Championship, and Elite Finale entries each
count once. Persisting separate counters was rejected because counters can drift
from history during retries or migration.

## Decision 9 — Tune from a reproducible two-gate balance harness

The harness runs fixed seeds/draft policies for representative performance and
enumerates or deterministically searches legal optimized builds for ceiling
performance. Tune existing Evelyn/Lucien/Inez exclusive values and synergy rules
until rate spread is at most five percentage points and ceiling spread at most
2%. Nell and baseline vehicle constants are immutable controls. New items are a
last resort requiring recorded proof that existing tuning cannot pass.

## Decision 10 — Crop once, render responsively

Keep the approved chroma source and transparent master. Define named source
rectangles and nine-slice margins in code; do not create per-label bitmaps.
Runtime text/icons sit over neutral centers. Generate remaining sheets only
after the first controls are validated in-game. This limits asset cost and lets
layout testing guide later decoration.

## Decision 11 — Resolve testing discipline for this simulation-touching pass

Use strict red-green-refactor for all consequential pure logic: lap evidence,
economy modifiers, settlement, sale/Undo, history, and balance. Pure presentation
contracts receive failing model tests before scene wiring. Pixel polish may
iterate after semantic/input/layout tests exist. This satisfies the constitution
TODO without imposing screenshot-first development on art iteration.
