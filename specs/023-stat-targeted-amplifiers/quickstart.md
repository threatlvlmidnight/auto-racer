# Quickstart: Stat-Targeted Amplifiers

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/stat-targeted-amplifiers-contract.md](./contracts/stat-targeted-amplifiers-contract.md).

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

1. **Legacy-target zero-regression** confirms: a Buff or `SynergyEffect`
   authored with no `targetStat` (or `targetStat: "time"`) produces
   byte-for-byte identical simulation output to today's shipped behavior,
   on every existing fixture (FR-001, FR-002, FR-005, FR-006).
2. **Stat-targeted amplification** confirms: a flat or count-synergy Buff,
   and a Boost-Others/Self-Conditional Synergy effect, each targeting a
   physical stat, measurably change that stat's resolved value (and
   simulated lap time) for a matching held item on a real generated track
   (SC-001).
3. **No-match zero contribution** confirms: a stat-targeted amplifier whose
   candidate item has no delta for the targeted stat contributes exactly 0
   for that item, verified against the candidate's authored shape, not the
   track (SC-003, FR-004).
4. **Compounding composition** confirms: a target item under both a
   stat-targeted Synergy effect and a stat-targeted Buff simultaneously
   receives the compounding, multiplicative combination described in
   contracts §3 — not an additive sum (research.md Decision 4).
5. **Per-lap growth/decay** confirms: a stat-targeted stacking Buff's effect
   on its target strictly grows across a multi-lap run when its own
   `boostPercent` is positive, and strictly shrinks when negative — verified
   by comparing early-lap vs. late-lap `PlayerLap.physics.stats` for the
   same build (SC-002).
6. **Synergy stays lap-invariant** confirms: in a build holding both a
   stat-targeted Synergy effect and an unrelated lap-varying stacking Buff,
   the Synergy-attributable portion of the resolved stat is identical on
   every lap — only the Buff's portion varies (Clarifications, Session
   2026-08-12; FR-012).
7. **Zero-regression, full suite** confirms: every pre-existing test in the
   repository passes unchanged; a build with no lap-varying stat-targeted
   amplifier produces `toEqual`-identical `PlayerLap` output (stats and
   totals, every lap) to its pre-feature output (SC-004, FR-008).
8. **Inspectability** confirms: `BuffApplication`/`SynergyApplication`
   entries identify which `StatTarget` they amplified and whether a match
   was found, directly from the evidence, without re-deriving from the
   simulation (SC-006, FR-010).
9. **Tiering** confirms: a tier-3 duplicate of a Physics-role item produces
   a `TIER_BONUS_PERCENT * 2`-percent larger resolved stat delta than a
   tier-1 copy of the same item, for both flat `physics` and matching
   `conditionalPhysics` entries (SC-005, FR-011).

## Local Browser Run

This feature adds a capability to the simulation layer only — no scene, UI,
or authored content changes. There is nothing new to click through in
`npm run dev` until `020-character-item-pools` authors an item using
`targetStat`. Validation is via the automated suite above; a manual browser
pass is not required to confirm this feature's own scope.

If a `tasks.md`-authored example/test item using a stat-targeted Buff or
Synergy effect exists (Foundational or US1 phase, for test purposes only,
not shipped content):

1. Start the dev server: `npm run dev`.
2. Reach a PvP stage holding that example item alongside a matching
   physics-role item.
3. Confirm the race completes with no console errors — the stat-targeted
   resolution is exercised end-to-end through the real render path, even
   though its effect isn't yet surfaced in any UI.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all
PASS — see plan.md). Acceptance requires all automated checks and coverage
items above, plus zero regression in any existing `021`/`022` test.
