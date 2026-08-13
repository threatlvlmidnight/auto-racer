# Implementation Plan: Stat-Targeted Amplifiers

**Branch**: `023-stat-targeted-amplifiers` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-stat-targeted-amplifiers/spec.md`

## Summary

Give Buff and Synergy items a `targetStat` — one of the four `PhysicalStats`
dimensions, or the legacy `time` default — so their percentage amplifies a
matching held item's `physics`/`conditionalPhysics` delta instead of only
ever multiplying `timeModifier`. A stacking Buff's targeted-stat boost grows
(or, with a negative magnitude, shrinks) lap over lap, which means a build's
resolved `PhysicalStats` can now genuinely vary across a race for the first
time — `simulateLapPhysics` moves from being called once per build to being
called once per lap, using that lap's own accumulated stacking state. A
build with no lap-varying stat-targeted amplifier resolves stats exactly
once in effect (fresh-each-lap computation with all-zero stat boosts is
proven byte-identical to the old single computation — Decision 5, no
special-cased short-circuit needed). Tiering's `applyTierBonus` is extended
to scale a held item's own `physics`/`conditionalPhysics` deltas the same
way it already scales `timeModifier`/`buff.boostPercent`.

## Technical Context

**Language/Version**: TypeScript (existing project toolchain — Phaser 3,
Vite, Vitest, ESLint; no version change)

**Primary Dependencies**: None new — same plain arithmetic/percent math
`buffs.ts`/`synergy.ts`/`laps.ts` already use. No physics engine change,
no new runtime dependency.

**Storage**: N/A — pure in-memory simulation, same as every existing
`src/simulation/` module.

**Testing**: Vitest, strict test-first (RED before implementation), matching
this repository's established convention for every `src/simulation/`
contract.

**Target Platform**: Existing web build (Vite + Phaser 3), no platform
change.

**Performance Goals**: `simulateLapPhysics` moves from one call per build to
one call per lap — still `O(corners)` closed-form kinematics, so worst case
is `O(corners × lapCount)` (≤10 corners × ≤16 laps = ≤160 calls). No
measurable performance concern; no performance-specific success criterion
needed beyond what `021`/`022` already established.

**Constraints**: Every `src/simulation/` module stays framework-free (zero
Phaser imports). FR-008's zero-regression guarantee is stronger than "no new
required field" — any build not using a lap-varying stat-targeted amplifier
MUST produce byte-for-byte identical `PlayerLap` output, every lap, to
today's shipped behavior.

**Scale/Scope**: One feature; touches `src/simulation/types.ts` (new
`StatTarget` type; `Buff`/`SynergyEffect` gain optional `targetStat`;
`SynergyApplication`/`SynergyResolution` restructured to a per-stat-target
map instead of one flat percent; `BuffApplication` gains `targetStat`),
`src/simulation/buffs.ts` (`computeBoostsForLap` gains a `boostsByStat`
output alongside the existing `boostsByTag`, plus a new pure eligibility
helper), `src/simulation/synergy.ts` (`resolveSynergyEffects`'s per-slot
result becomes stat-aware; `matchesTarget`/`resolveConditionPercent`
unchanged), `src/simulation/laps.ts` (`effectiveItem`/`foldPercentDelta`
extended to fold a stat-targeted synergy percent into an item's own
`physics`/`conditionalPhysics` deltas; `resolvePhysicalStats`/
`resolveConditionalPhysicsContributions` become per-lap-callable, accepting
that lap's `boostsByStat`; `simulatePlayerLaps` moves physics resolution
inside the per-lap loop), `src/simulation/tiering.ts` (`applyTierBonus`
extended). `src/simulation/tracks.ts` is untouched — `simulateLapPhysics`'s
own signature and every contract clause on it stay exactly as `022` left
them; only how often and with what stats its caller invokes it changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Prepare → Contest Integrity**: PASS. Per-lap stat variance is a
  deterministic function of lap number and the build's own held items
  (accumulated stacking state) — closed-form, computed ahead of contest
  playback, never live input or non-deterministic randomness.
- **II. Fairness**: PASS. Stat-targeted amplification is earned through held
  items exactly like every other item mechanic — same mechanism, no
  purchasable-content path.
- **III. Transparency & Legibility**: PASS, and directly load-bearing — US4/
  FR-009/FR-010 require `PlayerLap.physics.stats` to report each lap's real
  effective stats (not a stale shared snapshot) and require contribution
  evidence to name which stat an amplifier targeted. A stat-targeted
  amplifier whose activity couldn't be seen lap-by-lap would be exactly the
  invisible modifier this principle prohibits.
- **IV. Spectation-First**: PASS. Zero change to track rendering,
  standings, or commentary — only which values feed a lap's kinematics
  changes, never how a race is drawn.
- **V. Build Testing Access**: PASS. No change to Test Day/Practice's
  legacy 2-car path — same scoping as `021`/`022`.
- **VI. Async-First Architecture**: PASS. No live opponent, no matchmaking
  dependency — unchanged.

**Result**: All gates PASS. No Complexity Tracking entries required — this
feature is architecturally the deepest restructuring since `021` itself, but
that is engineering scope, not a constitutional violation; every principle
gate above passes cleanly.

**Post-design re-check** (after Phase 1 — `data-model.md`/`contracts/`):
Confirmed still PASS on every principle. Principle III's requirement
sharpened during design exactly as `021`/`022` both did: contracts §4 below
makes "which lap, which stat, which amplifier" a directly verifiable,
per-lap field, not just an aggregate claim. No new violation surfaced; no
Complexity Tracking entries added.

## Project Structure

### Documentation (this feature)

```text
specs/023-stat-targeted-amplifiers/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── stat-targeted-amplifiers-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/simulation/
├── types.ts        # StatTarget type; Buff.targetStat, SynergyEffect.targetStat
│                    # (both optional, default "time"); SynergyApplication/
│                    # SynergyResolution restructured to a per-StatTarget
│                    # percent map; BuffApplication gains targetStat +
│                    # appliedStatDelta (appliedSeconds stays "time"-only).
├── buffs.ts         # computeBoostsForLap gains boostsByStat alongside the
│                    # existing boostsByTag; new pure hasPhysicsDelta-style
│                    # eligibility helper, isolated and unit-tested like
│                    # 022's matchesPhysicsCondition.
├── synergy.ts       # resolveSynergyEffects's per-slot result becomes a
│                    # per-StatTarget map instead of one flat percent, so one
│                    # target item can receive synergy boosts to different
│                    # stats from different source items simultaneously.
│                    # matchesTarget/resolveConditionPercent untouched.
├── laps.ts          # effectiveItem/foldPercentDelta extended to fold a
│                    # stat-targeted synergy percent into an item's own
│                    # physics/conditionalPhysics deltas (mirrors the
│                    # existing timeModifier-folding pattern exactly).
│                    # resolvePhysicalStats/resolveConditionalPhysicsContributions
│                    # become per-lap-callable. simulatePlayerLaps moves
│                    # physics resolution inside the per-lap loop.
└── tiering.ts       # applyTierBonus also scales physics/conditionalPhysics
                      # deltas by the same per-tier percent.

src/simulation/tracks.ts   # UNTOUCHED — simulateLapPhysics's own signature
                            # and every 021/022 contract clause on it stay
                            # exactly as they are; only how often and with
                            # what stats its caller invokes it changes.

tests/unit/
├── buffs.test.ts    # new boostsByStat/eligibility tests, alongside
│                     # untouched existing boostsByTag tests
├── synergy.test.ts  # new per-stat-target resolution tests
├── laps.test.ts     # new stat-targeted amplification + per-lap variance
│                     # + zero-regression tests
└── tiering.test.ts  # new physics/conditionalPhysics scaling tests
```

**Structure Decision**: Extends four existing simulation modules in place —
no new files, no new module boundary. `tracks.ts` is deliberately excluded
from the touched-files list; this feature is entirely about what
`simulatePlayerLaps` computes and how often it calls `simulateLapPhysics`,
never about `simulateLapPhysics`'s own internals — the same "caller changes,
callee's own contract stays untouched" discipline `022` established for
`solveSpan`.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*
