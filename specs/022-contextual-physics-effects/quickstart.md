# Quickstart: Contextual Physics Effects

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/contextual-physics-contract.md](./contracts/contextual-physics-contract.md).

## Prerequisites

- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. Zero-regression tests confirm: `simulateLapPhysics` called with its
   existing two-argument signature (no conditional contributions) produces
   byte-for-byte identical output to `021`'s shipped behavior, on the same
   real generated tracks `021`'s own tests already use (FR-005, SC-003).
2. Corner-tightness matching tests confirm: an `"at-least"` condition
   matches corners with `turnDegrees` at or above its threshold and no
   others; an `"at-most"` condition matches at or below and no others —
   verified against real corner angles from `generateTrack`, not hand-
   picked values.
3. Per-phase association tests confirm (research.md Decision 1): an
   `accelerationDelta` condition matching a track's sharpest corner boosts
   only the accelerating phase exiting that corner; a `brakingPowerDelta`
   condition boosts only the braking phase entering its matched corner; a
   `corneringSpeedDelta` condition changes only that corner's own apex
   speed; a `topSpeedDelta` condition's cruising-phase boost is present
   whenever either bounding corner matches, confirmed against a span where
   only one of the two bounding corners qualifies.
4. Track-shape-sensitivity tests confirm (SC-001): the same conditional
   item's total lap-time contribution differs between two real generated
   tracks with different corner-angle distributions, and is smaller in
   magnitude than an otherwise-identical unconditional item on the same
   track.
5. Stacking tests confirm (FR-004): an unconditional and a conditional
   contribution targeting the same stat sum additively wherever the
   condition is met, with no interaction or precedence.
6. Inspectability tests confirm (FR-006, SC-002): the phase breakdown
   returned for a build holding a conditional item identifies exactly
   which phases that item's condition matched, checkable directly against
   the track's own segment data.
7. Regression tests confirm every pre-existing `021` physics test
   (`solveSpan`, `simulateLapPhysics`, `simulatePlayerLaps` no-track and
   with-track paths) passes unchanged, and that `solveSpan`'s own
   four-argument signature is untouched.

## Local Browser Run

This feature adds a capability to the simulation layer only — no scene,
UI, or authored content changes. There is nothing new to click through in
`npm run dev` until `020-character-item-pools` (or a later feature)
authors an item using `conditionalPhysics`. Validation is via the
automated suite above; a manual browser pass is not required to confirm
this feature's own scope.

If a `tasks.md`-authored example/test item using `conditionalPhysics`
exists (Foundational or US1 phase, for test purposes only, not shipped
content):

1. Start the dev server: `npm run dev`.
2. Reach a PvP stage holding that example item.
3. Confirm the race completes with no console errors — the conditional
   resolution is exercised end-to-end through the real render path, even
   though its effect isn't yet surfaced in any UI.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS — see plan.md). Acceptance requires all automated checks and
coverage items above, plus zero regression in any existing `021` test.
