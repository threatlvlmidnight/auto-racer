# Handoff

**Last updated**: 2026-08-12, feature `020-character-item-pools` complete.

**State**: `main` is in sync with `origin/main` through `e08a158`
("Implement feature 022: contextual physics effects"). **Everything since
then is uncommitted, sitting in the working tree** — do not commit until
told to. That includes:
- All of `023-stat-targeted-amplifiers` (spec through implementation),
  which was built in an earlier part of this same session, before the most
  recent compaction, and never got its own commit.
- All of `020-character-item-pools`'s Foundational phase, User Story 1, a
  new engine capability (value-scaled Buffs) added mid-authoring, and
  the complete 70-item catalog and all feature-020 integration work.
- `specs/024-item-stat-presentation/spec.md` — a separate, unrelated
  feature idea that only got as far as a spec draft before attention
  shifted back to `020`. Not started, not blocking anything. `.specify/
  feature.json` currently points at it even though `020` is the actually
  active feature — check `specs/020-character-item-pools/` directly rather
  than trusting that file if picking this up cold.

Run `git status`/`git diff --stat` first thing — this doc summarizes the
diff, it doesn't replace reading it.

## What happened this session, in order

1. **`023-stat-targeted-amplifiers`** — full spec-kit cycle, 44 tasks, all
   complete. `Buff`/`SynergyEffect` gained an optional `targetStat` so
   amplifiers can target a physical stat (`acceleration`/`topSpeed`/
   `brakingPower`/`corneringSpeed`) instead of only the legacy flat `time`
   path. This required moving physics resolution from once-per-build to
   once-per-lap inside `simulatePlayerLaps` (`laps.ts`) — the core
   architectural shift — proven byte-identical to the old behavior for
   every build with no lap-varying amplifier. Two real evidence-integrity
   bugs found and fixed mid-implementation (stat-targeted buffs' displayed
   `appliedPercent` had briefly diverged from what was actually simulated).
2. **`020-character-item-pools`** — `/speckit.analyze` ran first (4
   findings: FR-008 determinism coverage gap, a missing `validateItemPools`
   check for sponsor-objective tags, an underspecified `objectiveForKind`
   tag-selection mechanism, a file-location ambiguity), all four remediated
   in `tasks.md`/`data-model.md`/`research.md` before implementation
   started. Then `/speckit.implement`:
   - **Foundational** (T001-T010): `src/simulation/itemPools.ts` (new) —
     `poolForEntrant`/`poolForRival`/`poolForCrossPollination`/
     `validateItemPools`, plus parameterized `resolveEntrantPool`/
     `validatePoolContent` variants added specifically so Foundational
     tests could exercise the logic against synthetic fixtures before real
     content existed (`EXCLUSIVE_ITEMS`'s four pools start as genuinely
     empty arrays, not placeholders). `src/content/items/` (new directory)
     — `neutral.ts` got the real, locked 10-item Neutral pool immediately
     (already fully decided from the pre-implementation authoring pass);
     `mercer.ts`/`soto.ts`/`rook.ts`/`voss.ts` started empty. Parts
     Supplier's dead `identityTag` filter removed. `SponsorObjective`'s
     `"trigger-tagged-items"` variant repointed from `identityTag` to a new
     `tag: string` matched via `synergyTags`, with a new exported
     `SPONSOR_OBJECTIVE_TAGS` constant (`run.ts`) and `rng`-threaded
     selection in `objectiveForKind` so the tag choice stays deterministic
     per `(seed, stage)` rather than hardcoded.
   - **US1** (T011-T018): `chooseEncounter`/`createPayload`/
     `createSupplierPayload`/`restockSupplier` no longer take an `itemPool`
     parameter — they resolve it internally from `run.identity.entrantId`.
     `PrepareScene.ts`/`RunScene.ts` simplified to match.
   - **Two real bugs found and fixed during implementation** (not
     planning-stage issues): (a) `drawItem` (`draft.ts`) could return
     `undefined` for roughly 75% of draws against the new identityTag-less
     catalog — a coin flip landing on the now-always-empty `taggedItems`
     branch indexed out of bounds instead of falling back to
     `neutralItems`, contradicting what `research.md` Decision 2 had
     originally (incorrectly) assumed needed no code change. Fixed with a
     one-line guard; the same latent bug was **already live** in
     `resolveRivalBuild` too, and fixing it shifted one existing
     `playback.test.ts` fixture's expected outcome (updated, not
     silenced — see that test's comment for the full trace). (b) `run
     Presentation.ts`/`RunScene.ts` also read the old `identityTag` field
     name for sponsor-objective display text; missed by the original scope
     list, caught by `tsc`.
   - **Mid-authoring capability addition**: while authoring Evelyn Mercer's
     items, the user asked for a Bazaar-style chase card — a buff that
     scales with the value of fitted parts. Split into two pieces of very
     different cost (raised with the user explicitly, via `AskUserQuestion`
     before proceeding): reading already-authored static `price` (cheap)
     vs. items that *mutate* another item's value (expensive, same class of
     work as the already-deferred Economy capability). Only the first
     shipped: `Buff.scalesWithFittedValue` — boost scales with
     `sumFittedValue` (sum of `price` across fitted/board-only items,
     storage excluded). New pure helpers in `buffs.ts`
     (`isValueScaledBuff`/`sumFittedValue`); `computeBoostsForLap`
     (`buffs.ts`) and `buffPercentFor` (`laps.ts`) both gained an optional
     `fittedValue = 0` parameter, computed once per build in
     `simulatePlayerLaps` exactly like `synergyResolution` already is.
     Full design in `research.md` Decision 8. This is a deliberate,
     explicitly-requested revision to FR-007/plan.md's original "zero
     changes to laps.ts/buffs.ts" framing, tracked as task T019a.
   - **Evelyn Mercer's 15-item pool** — locked and fully stat-blocked in
     `src/content/items/mercer.ts`, not just conceptual. Verified directly
     against the real engine with `tsx` smoke tests (not just `tsc`) —
     confirmed the matching-set synergy and the stacking buff actually
     fire and grow lap-over-lap in a realistic 4-item combo.
3. **Lucien Soto's pool** — complete. Lore, four chase cards, eleven
   supporting items, and all 15 stat blocks were interactively reviewed and
   locked. The final pool is 10 Power / 5 Chassis to match The Needle's
   topology. A direct real-engine smoke test confirmed the two stacking
   chase cards accumulate on their authored rhythms (Crankset: 3/3/6/6/
   9/9/12/12/15/15%; Drive Sprocket: 2/2/2/4/4/4/6/6/6/8%), lap-one to
   lap-ten acceleration/top speed increase, and Double-Butted Tube Frame's
   exact-two-lightweight synergy applies its authored 35%. Full suite
   remains 755/755; build and lint clean.

## The item-authoring process (repeat for Soto, Rook, Voss)

Established this session, run once fully (Mercer) and now mid-flight
again (Soto). Four stages, each requiring the user's explicit go-ahead
before the next starts:

1. **Lore package** — before naming a single item, propose a short table:
   Core identity, Temperament, Era/setting cues, Material vocabulary,
   Naming convention, Tag emphasis, Mechanical throughline (how the
   character's identity should express as *engine mechanics*, not just
   flavor). Iterate on user feedback — this can take more than one pass
   (Soto's took two: an initial "track sprinter" framing, then corrected
   to "bicycle racer building the first motorcycle because it's what he
   knows"). Lock before moving on.
2. **Chase cards** — propose 3-4 top-tier, build-defining items, one per
   major build direction/archetype the character's strategy directions
   imply. These are priced above starting credits (5cr, vs. Cheap 2cr/Mid
   4cr for support items) so they're never turn-one-affordable — genuinely
   aspirational. Present as a compact table (name/category/role-in-
   shorthand/tags/one-line rationale). Lock before moving on.
3. **Supporting items** — propose the remaining ~11 items as a concept
   table (name/category/role/tags/which chase card(s) it feeds), still no
   real numbers yet. Iterate — this is where naming missteps get caught
   (Mercer's "Appraised Toolchest" got renamed to "Oilskin Driving Coat"
   after two rounds of user pushback: first that a toolchest wouldn't
   plausibly be *appraised*, second that "salvaged/reclaimed" framing read
   as Rook-coded, not Mercer-coded). Lock the full 15 before moving on.
4. **Full stat blocks** — write real prices, exact `physics` deltas,
   `synergyEffects` percentages, buff `boostPercent`/`cooldown` values
   directly into `src/content/items/<entrant>.ts`. Magnitudes follow `021`
   's measured per-stat lap-time sensitivity (topSpeed ≈0.14s/lap/point,
   corneringSpeed ≈0.10s/lap/point, acceleration ≈0.02s/lap/point,
   brakingPower ≈0.0096s/lap/point) so a Cheap item is worth
   ~0.10-0.15s/lap regardless of which stat it touches, Mid ~0.25s/lap,
   Chase items meaningfully more (via synergy/buff potential, not just a
   bigger flat number). Every item's `fittedBehavior`/`improvisedBehavior`
   is `{kind: "none"}` — that installation path is still physics-blind
   ([[physics-blind-installation]] in memory). No item sets `identityTag`
   ([[identity-tag-deferred-retirement]]). After writing, verify with a
   direct `tsx` smoke test against the real engine (install a realistic
   combo, confirm synergies/buffs actually fire and change lap times) —
   not just `tsc --noEmit`, which only proves the shape compiles. Then run
   the full suite/lint/build, and check off the relevant `tasks.md` rows.

## Lore profiles so far

### Evelyn Mercer (Coachworks) — LOCKED, ITEMS IMPLEMENTED

| Element | Locked value |
|---|---|
| Core identity | A coachbuilder proving the old trade's standards — fit, finish, load-bearing integrity — are what motor racing is skipping. Not nostalgic; thinks the field is missing steps. |
| Temperament | Unflashy, exacting, quietly competitive. Distrusts anything untested or ostentatious. |
| Era/setting | Coachbuilding trade colliding with the birth of motor racing — wheelwrights, joiners, upholsterers, apprenticeship lineage. |
| Material vocabulary | Ash/elm framing, brass/copper fittings, leather/lacquer, hand-forged iron, joinery terms. |
| Naming convention | *[Material/Technique] + [Part]* — understated, no superlatives. |
| Tag emphasis | `wheel`, `material`, `suspension`, `provenance`. |
| Mechanical throughline | Reliable flat/stacking effects over volatile ones; synergies reward *sets* (matching material/category); a build-around tied to appraising/refurbishing/trading. |

4 chase cards, each anchoring one build archetype: **Matched Coachwork
Wheelset** (matching-set synergy), **Journeyman's Logbook** (stacking
"proven reliability" buff), **Ironbound Axle Assembly** (flat + conditional
durability), **Appraiser's Ledger** (the new value-scaled buff — her
"appraiser" identity, made real rather than left as Economy-inert flavor).
Full 15-item roster with real numbers: `src/content/items/mercer.ts`.

### Lucien Soto (Velodrome) — LOCKED, ITEMS IMPLEMENTED

| Element | Locked value |
|---|---|
| Core identity | A champion cyclist invited to build a car for the first-ever motor race, who — having no coachbuilding trade — builds the only thing he knows: a bicycle, with an engine grafted on. He's not referencing the motorcycle's invention, he's arguably mid-inventing it, because it was the fastest path to the starting line. |
| Temperament | Genuinely out of his depth on the one part he's never touched (the engine), completely unbothered because everything else about a two-wheeled machine — balance, weight, momentum, gearing — he could do blind. An engine, to him, is just a very complicated derailleur. |
| Era/setting | The tail end of the 1890s bicycle boom running headlong into the birth of the motorcycle. |
| Material vocabulary | Steel tube frame, brazed joints, chain/sprocket, spokes, pedal cranks, pneumatic tires (bicycle racers were the actual early adopters). |
| Naming convention | Literal bicycle-part names doing double duty: "Sprocket," "Spoke," "Chain," "Crank," "Frame." Short, componentwise. |
| Tag emphasis | `gearing`, `momentum` (both already established elsewhere in the catalog), `lightweight` (used in the old, now-retired catalog; new to this pass). |
| Mechanical throughline | Builds rhythm through repeated laps: short-cooldown stacking Buffs accumulate acceleration or top-speed amplification, gearing links those two stats, and lightweight synergies reward a tightly curated machine. His late-race sprint emerges from momentum built visibly over the race rather than from a special final-lap rule. Continuous physics items are never misleadingly described as separately "firing"; cadence refers specifically to real cooldown-gated stacking accumulation. |

4 chase cards — **LOCKED** after interactive review: **Racing Crankset**
(Power; short-cooldown stacking acceleration/cadence anchor), **Oversized
Drive Sprocket** (Power; slower stacking top-speed/late-sprint anchor),
**Close-Ratio Chainwheel Set** (Power; mixed acceleration/top-speed gearing
network), and **Double-Butted Tube Frame** (Chassis; exact-count lightweight
curation anchor). All four are 5cr build-defining items. The three-Power/
one-Chassis split is deliberate; the supporting pool leans Chassis and
includes one or two strong 4cr Chassis modifiers that are premium pickups,
not additional archetype anchors.

11 supporting items — **LOCKED** after interactive review: **Pneumatic
Racing Tyres**, **Tensioned Wire-Spoke Wheels**, **Hollow Steel Fork**,
**Cable-Operated Rim Brake**, **Roller-Link Drive Chain**, **Ratchet
Freewheel**, **Chain Tensioner**, **Hand Pump and Pressure Gauge**,
**Two-Speed Drive Hub**, **Kick-Start Chainring**, and **Engine Drive
Pulley**. The complete pool is 10 Power / 5 Chassis, matching The Needle's
Power-heavy topology. Pneumatic Racing Tyres and Tensioned Wire-Spoke
Wheels are premium 4cr Chassis modifiers, intentionally strong pickups but
not separate build-around anchors.

Full 15-item roster with real numbers: `src/content/items/soto.ts`.

### Inez Rook (Fieldworks) — lore and full concept roster LOCKED, stat blocks pending

| Element | Locked value |
|---|---|
| Core identity | An expedition engineer and experimental vehicle designer who refuses to let existing vehicle categories decide what belongs in a racing machine. She transfers serious technology across aviation, industry, expeditions, and transport, using competition to discover combinations convention would never test. |
| Temperament | Animated, technically confident, and delighted by unanswered engineering questions. Audacious but not careless: every experiment has a hypothesis, instrumentation, and a reason to exist. |
| Era/setting | Experimental engineering at the boundary between early aviation, expedition vehicles, industrial power systems, and the newly forming idea of motorsport. |
| Material vocabulary | Aircraft engines, propellers, streamlined canvas, pressure-fed fuel systems, multi-axle steering linkages, articulated wheel bogies, cooling jackets, pumps, gauges, control valves, structural tubing, and test instruments. |
| Naming convention | Direct technical or prototype names describing the experiment — e.g. Aircraft Engine Cradle, Six-Wheel Tracking Bogie, Variable-Pitch Propeller, Pressure-Fed Carburetor. Avoid cracked/patched/scrap/surplus language that implies inferior construction. |
| Tag emphasis | `airflow`, `pressure`, `heat`, `control`, and `experimental`, with bridges to `lightweight`, `information`, `suspension`, and `gearing`. |
| Mechanical throughline | Cross-disciplinary systems rather than cobbled parts: multi-stat components, contextual effects, and multi-tag synergies connect technologies that normally belong to different machines. Exceptional performance in one regime may carry an explicit engineering tradeoff elsewhere. Count amplification represents a complete experimental system coming online, and The Lark's two Flex slots embody her refusal to respect conventional Power/Chassis boundaries. |

Canonical roster, vision, entrant content, vehicle-topology example, visual
language, and task T022 were updated alongside this lock to remove the old
resource-starved salvager framing. Her four directions are aviation power,
experimental running gear, instrumented controlled-limit engineering, and
cross-disciplinary prototypes.

4 chase cards — **LOCKED** after interactive review: **Variable-Pitch
Propeller** (Power; aviation/airflow top-speed anchor), **Six-Wheel Tracking
Bogie** (Chassis; exceptional cornering/braking with an explicit engineering
tradeoff), **Calibrated Pressure Manifold** (Power; count-based instrumented
pressure-system amplifier), and **Interchangeable Test Mounts** (Chassis;
cross-disciplinary Power/Chassis integration anchor). The 2 Power / 2
Chassis split is deliberate for The Lark's balanced core and two Flex slots.

11 supporting items — **LOCKED** after interactive review: **Rotary Aero
Engine**, **Pressure-Fed Carburetor**, **High-Pressure Fuel Pump**,
**Instrumented Cooling Jacket**, **Dynamometer Takeoff**, **Variable-Ratio
Test Gearbox**, **Streamlined Balloon Fabric**, **Articulated Steering
Linkage**, **Differential Braking Valve**, **Gyroscopic Stabilizer**, and
**Airflow Test Vane**. The complete concept roster is 8 Power / 7 Chassis.
Every category is physically legible: Power items generate/feed/cool/measure/
transmit power; Chassis items provide structure, steering, braking,
stabilization, or aerodynamics. Exact prices and stat blocks have not yet
been authored in `rook.ts`; resume at stage 4 after Nell's concept pass if
the user continues character-first authoring.

### Nell Voss (Backroads) — lore LOCKED, chase cards in authoring

| Element | Locked value |
|---|---|
| Core identity | A customs runner and rulebook engineer who treats written regulations and accepted racing etiquette as assumptions waiting to be tested. She builds to the exact limit, finds the unguarded interpretation or racing line, and commits before it closes. |
| Temperament | Watchful, disciplined, dryly amused by institutional confidence, and more aggressive than she first appears. She recognizes narrow opportunities early and commits completely rather than racing recklessly. |
| Background | Rules in her prior work were often written without concern for whether ordinary people could survive beneath them. She learned to distinguish legality from fairness and exploit every available loophole when survival required it. Racing lets her prove that intelligence openly. |
| Era/setting | A first championship inventing technical regulations, inspection standards, timing, and enforcement while competitors are already racing. Definitions and measuring procedures are full of gaps. |
| Material vocabulary | Oversized reserve lines, removable ballast, auxiliary controls, adjustable body panels, interchangeable number plates, inspection seals, measuring tanks, shuttered lamps, document cases, declaration plates, and quick-release equipment. |
| Naming convention | Innocuous official or technical names whose implications emerge from their effects — Declared Fuel Measure, Removable Inspection Ballast, Auxiliary Starting Tank, Adjustable Bodywork Stay, Stamped Compliance Plate. Humor comes from technically truthful wording, never cartoon criminality. |
| Tag emphasis | `loophole`, `information`, `exposure`, `evasion`, `fuel`, and `wager`, with bridges to `provenance`, `pressure`, `control`, and `momentum`. |
| Mechanical throughline | Exact-condition and exact-composition effects represent technical loopholes; strong braking and corner-entry effects represent aggressive moves prepared before the race; exposure pieces exchange safety margin or general performance for exceptional pace in a narrow situation; information identifies the opening; getaway effects accumulate speed after commitment. |
| Moral boundary | She may conceal capacity, exploit measurement procedures, stretch technical definitions, pressure a rival, brake exceptionally late, or take an unfashionable line. She never tampers with another machine, deploys hazards, or deliberately causes a collision. |

Canonical roster, vision, entrant content, and task T023 were updated with
this lock. Opponent-reactive effects remain future capability; this first
pass expresses the identity through exact counts/compositions, contextual
physics, visible tradeoffs, value scaling, and stacking escape speed.

4 chase cards — **LOCKED** after interactive review: **Stamped Compliance
Plate** (Power; exact-composition rulebook anchor), **Late-Braking
Equalizer** (Chassis; exceptional braking/tight-corner attack with a visible
general-performance tradeoff), **Lookout's Timing Board** (Chassis;
information-driven contextual amplifier), and **Auxiliary Starting Tank**
(Power; stacking getaway-acceleration anchor). The 2 Power / 2 Chassis split
matches The Hush. The Compliance Plate's eventual stat block must use a
literal exact-count/category condition the current engine can verify; its
flavor must not overclaim a whole-topology rule the simulation does not read.

11 supporting items — **LOCKED** after interactive review: **Declared Fuel
Measure**, **Oversize Reserve Line**, **Chopped Flywheel**, **Quick-Change
Final Drive**, **Sealed Instrument Case**, **Bookmaker's Declared Margin**,
**Removable Inspection Ballast**, **Adjustable Bodywork Stay**, **Split-Circuit
Brake Valve**, **Unmarked Route Book**, and **Quick-Release Lamp Shutters**.
The complete roster is 8 Power / 7 Chassis. Ten supports are functional;
Bookmaker's Declared Margin is an explicit, honestly presented Economy
placeholder until the deferred capability lands. Full stat blocks live in
`src/content/items/voss.ts`.

## What's fully done, live, and tested (all uncommitted)

- `021-arcade-physics-simulation`, `022-contextual-physics-effects`,
  `023-stat-targeted-amplifiers` — fully implemented, fully tested.
- `020-character-item-pools` — fully implemented through all 42 planned
  tasks: 70-item catalog, entrant gating, cross-pollination, rival integration,
  legacy catalog retirement, documentation, and browser validation.
- The value-scaled Buff capability (T019a) — implemented, tested.
- All four 15-item exclusive pools and the 10-item Neutral pool are implemented
  and validated against the real engine.
- **745/745 tests passing, `tsc --noEmit` clean, `npm run build` clean,
  `eslint .` clean** as of the last full-suite run this session.

## What's still blocked / not started

- No work remains for feature 020. The old 20-item production catalog is gone;
  exact legacy fixtures remain test-only in `tests/fixtures/legacy-item-pool.ts`
  to preserve historical simulation expectations.
- **Deferred by explicit decision, not yet speccable**: a follow-up
  feature bundling (a) real Economy mechanics (income/resale hooked to the
  `Bookmaker's Chit`/`Engine Builder's Nameplate`/`Patron's Brass Plaque`-
  style placeholder items already authored), (b) item-to-item value
  mutation (the Bazaar-style "boosts another item's value" mechanic
  explicitly *not* built this session — only the read-only value-scaled
  buff was), and (c) Fitted/Improvised installation becoming physics-aware.
  All three are the same category of work (see memory: [[economy-items-
  capability-deferred]], [[value-scaled-buff-capability]], [[physics-
  blind-installation]]) — batch them into one feature once the full
  70-item pass is done, per explicit user instruction earlier this
  session. Don't start speccing this until Rook/Voss are also done.
- **`024-item-stat-presentation`** — a spec draft exists
  (`specs/024-item-stat-presentation/spec.md`) from before this session's
  most recent compaction. Not planned, not started, not currently being
  worked on. Unrelated to `020`; don't conflate the two.
- **Eventual `identityTag` full retirement** — the production catalog no longer
  authors it, but the compatibility field remains in shared types for legacy
  fixtures and older simulation contracts.

## Critical process notes for whoever picks this up

- **This repo has no native Claude Code `/speckit.*` slash commands.**
  They're GitHub Copilot agent-format files at
  `.github/agents/speckit.{specify,clarify,plan,tasks,analyze,implement}.agent.md`.
  Read the file and follow its documented steps exactly; use
  `.specify/scripts/bash/{create-new-feature,check-prerequisites,setup-plan,setup-tasks}.sh`
  for path resolution.
- **Strict test-first (red-green TDD) is a hard project convention** for
  everything under `src/simulation/`/`src/content/`. Followed throughout
  this session — every implementation task had a RED test confirmed first,
  including the two capability additions discovered mid-flight
  (`drawItem`'s guard, the value-scaled buff).
- **Even a fully-planned, analyze-passed spec can still hide a real bug
  that only surfaces at implementation time.** `020`'s `drawItem` fix is
  this session's example — `research.md` Decision 2 originally reasoned
  (on paper, plausibly) that no code change was needed, and was proven
  wrong the moment real tests ran against the real (identityTag-less)
  catalog instead of the old one. When a "should need no change" claim
  meets real content, verify it by running the tests, not by re-reading
  the reasoning.
- **`itemPools.ts` importing `SPONSOR_OBJECTIVE_TAGS` from `run.ts`, which
  itself already imports from `encounters.ts`, which imports `itemPools.ts`,
  is a real three-way circular import — and it works**, because none of the
  three modules read the cross-module value at their own top level, only
  inside function bodies called after the whole graph finishes evaluating.
  Confirmed safe via `tsc`, `vitest`, and `vite build` all passing. This
  mirrors an *existing* two-way `run.ts`↔`encounters.ts` cycle this
  codebase already shipped with — don't be alarmed by the cycle itself,
  just don't add a top-level cross-module read to any of the three.
- **Testability pattern for content-backed pure functions**:
  `poolForEntrant`/`validateItemPools` are effectively zero-argument (they
  close over the real `NEUTRAL_ITEMS`/`EXCLUSIVE_ITEMS`), which leaves no
  seam for testing against synthetic fixtures before real content exists.
  Resolved by exporting a parameterized core (`resolveEntrantPool`/
  `validatePoolContent`) alongside the real public wrapper — the public
  contract (`contracts/item-pools-contract.md`) is unchanged, the
  parameterized variant exists purely for tests. Reuse this pattern for any
  future itemPools.ts-shaped problem.
- **Simulation stays framework-free.** `src/simulation/` has zero Phaser
  imports; scenes only render/format precomputed results.
- **Balance constants remain genuinely unfixed/tunable** — this now
  includes `020`'s own Cheap/Mid/Chase price tiers (2cr/4cr/5cr) and every
  numeric `physics`/`buff`/`synergyEffects` value authored into
  `mercer.ts` so far. Nothing here is final balance, just working values
  consistent with `021`'s sensitivity weights.
- **Automated browser testing note**: the in-app Browser pane's screenshot
  pixel space is 800×450 regardless of visual render size — target that
  space directly. This project's dev server (`vite`) may already be
  running in the background from a prior session on port 5173; check
  before starting a new one.

## Where to look first

1. `specs/020-character-item-pools/tasks.md` — the authoritative task list;
   every task is checked off.
2. `src/content/items/` — the complete 70-item catalog.
3. `specs/020-character-item-pools/research.md` — Decisions 1-8, especially
   2 (the `drawItem` fix) and 8 (the value-scaled buff) if extending either
   mechanism further.
4. Memory files (`/Users/micah/.claude/projects/-Users-micah-Documents-repos-auto-racer/memory/`):
   `item-authoring-format.md`, `identity-tag-deferred-retirement.md`,
   `physics-blind-installation.md`, `economy-items-capability-deferred.md`,
   `value-scaled-buff-capability.md`, `item-signature-notation.md` — all
   directly relevant to continuing the authoring pass.
5. `specs/DEFERRED.md` / `specs/skribidi-gap-decisions.md` — longer-
   standing out-of-scope tracking, still accurate, unrelated to this
   session's work.
