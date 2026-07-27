# Phase 0 Research: Core Loop — Baseline Build vs. Sample Ghost

All Technical Context unknowns were resolved through direct discussion rather than
requiring standalone research spikes, since the decisions were project-wide
(engine, testing rigor, platform) rather than feature-specific. Recorded here in
the standard Decision / Rationale / Alternatives format for traceability.

## Decision: TypeScript + Phaser 3, bundled with Vite

**Rationale**: The project's stated sequencing is web first, with mobile as the
primary revenue platform later. Current guidance on Unity's WebGL export is that
it's the right tool when porting an *existing* Unity project to web, not when web
is the starting point — builds run 8–80MB even for simple 2D projects, load
slower than web-native alternatives, and have inconsistent mobile-browser memory
behavior. Since this project is starting fresh and targeting web specifically, a
web-native stack fits the sequencing better than Unity would. Phaser was chosen
over PixiJS because Phaser is a complete 2D framework (scene management, tweening,
input, asset pipeline) rather than a renderer only — PixiJS is faster and smaller,
but would require hand-building the game-loop/scene scaffolding Phaser already
provides, which isn't a good trade for a solo project prioritizing speed to a
playable slice. Vite is Phaser's own official bundler choice (`phaserjs/template-vite-ts`)
and pairs naturally with Vitest for the testing layer (shared config, same team,
no extra bundler integration work).

**Alternatives considered**:
- *Unity (C#), WebGL export now + native mobile export later*: one codebase/pipeline,
  mature 2D toolkit, but wrong-shaped for a web-first start per the guidance above.
  Also less transferable to the owner's general software work than TypeScript.
- *PixiJS instead of Phaser*: lighter and faster for pure rendering, but this
  project is UI/logic-heavy (menus, item choice, results) rather than
  rendering-heavy, and none of it is performance-critical (see Performance Goals) —
  Phaser's batteries-included approach costs nothing here and saves real time.
- *React Native (mobile-first) with a secondary web build*: inverts the project's
  stated sequencing (web first); React Native Web exists but is a secondary,
  less mature path compared to the reverse direction (web-first, wrap for mobile).

## Decision: Capacitor as the future mobile wrapping path (not built in this feature)

**Rationale**: Capacitor is the modern, actively-documented way to ship a web
codebase as a real iOS/Android app, including a dedicated games guide covering
WebGL/canvas rendering. This project's performance profile has no twitch-action
requirement anywhere — the "contest" is a calculation, optionally replayed as an
animation, never a real-time input-driven sequence — which is specifically where
a wrapped app's usual weaknesses would show up. Since they don't apply here, the
web-first-then-wrap path carries little of its typical risk. Not implemented in
this feature; recorded so future features build the client in a way that keeps
this path open (see Constraints in plan.md — framework-free simulation core).

**Alternatives considered**: Rewriting natively per-platform later (rejected —
throws away the entire web codebase instead of reusing it); Flutter/native mobile
frameworks (rejected — mobile-first tools, same sequencing mismatch as React Native).

## Decision: Vitest for the simulation module; no enforced framework for presentation tests

**Rationale**: Directly implements the constitution's resolved TESTING_DISCIPLINE
decision — strict TDD (red-green-refactor) is required only for the
contest-resolution/simulation logic, where correctness is load-bearing for
Transparency & Legibility (Principle III) and for Success Criteria SC-003/SC-004
(consistent, explainable, measurably different results). Phaser scene/UI code is
tested lightly or manually; enforcing strict TDD there would slow a solo prototype
without a corresponding correctness payoff.

**Alternatives considered**: Jest (rejected — Vitest is the natural pairing with
Vite, avoids a second bundler-adjacent config, and is ESM-native); strict TDD
project-wide (rejected — explicitly decided against; too slow for a solo
first-slice prototype with no correctness risk in the UI layer).

## Decision: Framework-free simulation core, time-series internally even though only a final result is shown

**Rationale**: This is architectural insurance, not scope creep. Clarification Q1
deferred live/broadcast presentation out of this feature, but Constitution
Principle IV (Spectation-First) is non-negotiable for the project as a whole —
it must be satisfied eventually. If the simulation only ever computed a final
scalar time, a later feature adding live playback would need to rewrite the
simulation core to produce a replayable sequence. Modeling the race internally as
a time-series from the start costs nothing now (this feature still only *surfaces*
the final result) and avoids that rewrite. Logged as a forward-compatibility
decision, not a deferred item, since it's being built now rather than later.

**Alternatives considered**: Final-result-only simulation (rejected — cheapest
today, but creates known future rework against a non-negotiable principle).
