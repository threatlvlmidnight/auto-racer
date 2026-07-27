<!--
Sync Impact Report
Version change: 1.0.0 → 1.0.1 (clarification, no scope change)
Modified principles:
  - V. "Practice Tooling as Core, Not Bolt-On" → "Build Testing Access as
    Core, Not Bolt-On" — decoupled the principle from the "training room"
    implementation specifically (that idea is being reworked, likely toward
    a diegetic non-PvP encounter such as a "test day"). The underlying
    requirement (players get a low-stakes way to test builds and see the
    data behind the result, before it counts) is unchanged; only the
    fixed-implementation language was removed.
Added sections: none
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no change needed.
  - .specify/templates/spec-template.md ✅ no change needed.
  - .specify/templates/tasks-template.md ✅ no change needed.
  - .github/agents/*.agent.md, .github/prompts/*.prompt.md ✅ no change
    needed.
Follow-up TODOs (carried over, unchanged):
  - TODO(ENGINEERING_STACK): Language/engine/tech stack intentionally left
    undecided — this is a /speckit.plan decision, not a constitution one.
  - TODO(TESTING_DISCIPLINE): Whether TDD is strictly enforced (red-green-
    refactor) or looser for early prototyping has not been decided by the
    team; Development Workflow section below states the minimum bar only.
  - TODO(THEME): Narrative/visual theme (gothic, sci-fi, fantastical skin,
    etc.) is explicitly deferred — see Product Constraints.
-->

# Auto Racer Constitution
<!-- Working title; project/game name not yet finalized -->

## Core Principles

### I. Prepare → Contest Integrity (NON-NEGOTIABLE)
Every feature MUST preserve the core loop's two-phase shape: a **prepare**
phase where the player makes every decision (drafting, building, tuning,
adjusting), followed by a **contest** phase that runs to completion without
live player input once started. Contests resolve as 1v1 races against a
recorded opponent (a "ghost"), never a live opponent. Any proposal that
introduces direct player control, live input, or manual intervention during
the contest phase is a constitutional violation, not a design trade-off, and
requires an explicit amendment to this document before it may be built.
**Rationale**: this phase separation is the defining structural bet of the
project — it is what makes the game an auto-battler-in-a-racing-skin rather
than a racing game with a garage screen, and it is the property the whole
design is organized around.

### II. Fairness
No purchasable content, currency, or subscription MAY affect contest
outcomes — win probability, race times, ghost/opponent strength, or any
other competitively relevant value. Monetization, if any, is restricted to
cosmetics, quality-of-life, and convenience that does not touch competitive
balance. **Rationale**: this is a direct, deliberate response to two
documented failures surfaced in this project's pre-production research —
Hearthstone Battlegrounds' pay-gated hero choices and The Bazaar's
pay-to-win beta economy — both of which produced measurable player
backlash and, in the Bazaar's case, a full monetization reversal.

### III. Transparency & Legibility
Every value that determines a contest's outcome — speed, handling,
component effects, scoring modifiers, anything a build change alters — MUST
be inspectable by the player, both in post-race review and in practice
tooling (see Principle V). A modifier that changes the outcome but cannot be
seen or explained by the player is treated as a bug, not as depth. **Rationale**:
direct reaction to The Bazaar's opaque combat math, identified as its most
common player complaint despite the game's otherwise well-regarded depth.

### IV. Spectation-First
Every contest MUST be as meaningful to watch as it is to play. Replay
format, presentation (broadcast-style race view), and shareability MUST be
designed so a third party who never built the watched car can still follow
and understand what is happening and why one build is winning.
**Rationale**: every breakout success identified in this genre's landscape
(The Bazaar, Backpack Battles, Super Auto Pets) grew through spectation,
yet none of them were designed for it — this project treats spectation as
a first-class design input rather than an accident of streaming culture.

### V. Build Testing Access as Core, Not Bolt-On
Players MUST have a low-stakes way to test a build against sample contests
and inspect the numbers behind the result, before that build is committed
to a scored/ranked contest. This capability MUST be scoped and built
alongside core gameplay systems, not deferred as a post-launch or stretch
feature. The delivery mechanism is intentionally unspecified here — a
dedicated sandbox tool, a diegetic non-PvP encounter type (e.g. a "test
day"), or some other form — and is a decision for `/speckit.specify` and
`/speckit.plan`, not fixed by this constitution. **Rationale**: originally
inspired by fighting-game training rooms; the constitution binds the
underlying player need (test before it counts) rather than any one
implementation of it, so a still-evolving design idea doesn't get frozen
into founding law. This is also the project's answer to onboarding depth
without shallowing it, and to Transparency (Principle III) being
actionable rather than merely visible.

### VI. Async-First Architecture
Contests MUST resolve against previously recorded opponent state (ghost
data), never live synchronous opposition. No feature may introduce a hard
dependency on live matchmaking or real-time multiplayer infrastructure.
**Rationale**: keeps the project buildable by a small team (no
matchmaking-at-scale problem to solve), timezone-proof for players, and
consistent with Principle I's contest-phase integrity.

## Product Constraints

**Visual medium**: 2D art is a deliberate, binding choice, not a placeholder
for a future 3D upgrade — chosen for cost discipline and to leave room for a
distinctive illustrated style rather than competing on production budget.

**Structural frame — spec series**: All builds begin from the same shared
baseline car ("spec car"). Team/build identity is expressed through *how
much and where* a build deviates from that baseline (heavy car modification
vs. driver/race-craft focus vs. scoring-interference focus), not through
independently constructed cars. Real-world spec-racing rulesets are a
naming/flavor reference only and are not otherwise simulated or enforced.

**Theme**: TODO(THEME) — narrative and visual theme is explicitly
undecided at this stage and MUST NOT be assumed by any spec, plan, or task
that isn't itself about deciding it.

## Development Workflow

Every feature MUST pass through the Spec Kit phase gate in order
(`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`,
with `/speckit.clarify`, `/speckit.checklist`, and `/speckit.analyze` used as
quality gates for anything with meaningful ambiguity) before implementation
begins. Prefer small, vertically-sliced features (one playable increment of
the prepare→contest loop) over horizontal infrastructure work, so the core
loop is playable and testable as early as possible.

TODO(TESTING_DISCIPLINE): the team has not yet decided whether Test-First
(strict red-green-refactor) is enforced project-wide or reserved for
contest-simulation logic specifically, where correctness matters most.
Resolve before the first `/speckit.plan` that touches simulation code.

## Governance

This constitution supersedes any conflicting practice, template default, or
prior informal agreement. Amendments require: (1) a documented proposal of
the change and rationale, (2) an explicit version bump per the policy below,
and (3) propagation of the change to any dependent template or command file
before the amendment is considered complete.

**Versioning policy**: MAJOR — backward-incompatible removal or redefinition
of a principle (e.g., abandoning Prepare → Contest Integrity or Async-First
Architecture). MINOR — a new principle or materially expanded section added.
PATCH — wording, clarification, or non-semantic fixes.

Every `/speckit.plan` MUST include a Constitution Check gate confirming the
plan does not violate any Core Principle above; violations must be
justified in that plan's Complexity Tracking table or the plan must be
revised.

**Version**: 1.0.1 | **Ratified**: 2026-07-26 | **Last Amended**: 2026-07-26
