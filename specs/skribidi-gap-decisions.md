# Skribidi Skids Gap Analysis — Recorded Decisions

*Authoritative product direction from the post-demo review of Alex's
"Skribidi Skids" POC (`skribidi_skids_poc.html`, POC v0.2) against the
shipped Auto Racer codebase. These are committed directions, not yet
implemented — each item below becomes its own feature (or extends a planned
one) via `/speckit.specify` before any code is written. The one exception is
the constitution amendment in §1, which is already applied.*

**Source**: gap-analysis artifact comparing `skribidi_skids_poc.html` against
`main @ e374a8a`, walked through as a guided decision session on 2026-08-09.
Nothing in Alex's file is proposed to be merged directly — every "adopt"
below means rebuilt against our stack (TypeScript, strict red-green TDD on
simulation code, deterministic-by-construction), not ported.

---

## 1. Contest field size & model

**Decision**: Adopt N-ghost racing — 6 to 8 simultaneous cars, up from
today's 1v1.

**Constitution impact — already applied (v1.3.0)**: Principle I's "Contests
resolve as 1v1 races against a recorded opponent" was loosened to "one or
more recorded opponents." The actual non-negotiable was never the count of
1 — it was "never a live opponent." See
`.specify/memory/constitution.md`, Principle I, and its Sync Impact Report.

**Adjustments**:
- Non-player cars are authored NPC ghost *profiles* for now, not live
  players. Real async multiplayer (recording and sharing actual other
  players' runs) remains its own future feature — this is `vision.md`'s
  existing "real async ghost recording" open item, not solved here.
- No live contact/wrecking this pass. Cars race the track; collision
  resolution is a later, separate decision if revisited.
- `resolveContest()` extends to N cars as one pure, precomputed function —
  same architecture as today, not a per-car merge step. The result needs
  full N-way standings/positions, not just a single player-vs-one gap.
- Rival ghosts are authored as **scalable stat-weight profiles** (~6 of
  them), reused across a run and re-scaled at different in-run levels —
  e.g. the same profile produces a weaker car at level 1 and a stronger one
  at level 6 — rather than one-off fixed builds. Mirrors the shape of
  Alex's `rivalForRound(riv, round)`.
- All N ghosts count toward real standings/scoring. No decorative-only
  filler cars.

**Owner**: a new feature, working title `multi-ghost-contest`.

---

## 2. Race presentation / track

**Decision**: Full adoption of richer race visuals — a procedural-feeling
track, drift trails, slipstream glow, collision-free sparks/particles where
appropriate, a live commentary ticker, an N-car standings sidebar, and
adjustable playback speed (1×/3×/8×). Rebuilt as a renderer over the
already-computed result (extending `playback.ts`'s existing schedule
pattern), never as a live physics simulation.

**Adjustments**:
- Ticker/commentary copy is rewritten in our own voice and mechanics
  (cooldowns, Fitted/Improvised, our items) — not ported from Alex's text.
- Zero live RNG in the visuals. Every visible event (a spark, a drift
  trail, a ticker line) must trace back to a precomputed, inspectable
  cause — consistent with Principle III (Transparency & Legibility).

**FLAGGED — needs its own architecture spec, not yet decided**: race
results must be **canonical across every viewer**. If multiple real
players' ghosts eventually race together, player 1 and player 2 must see
identical standings when watching the same race — this is a stronger
requirement than "deterministic per player." The likely direction is a
small **pre-authored track catalog** with **deterministic selection** (e.g.
derived from a shared race/event ID), rather than per-client procedural
generation, to avoid any cross-client floating-point or RNG drift risk.
This implies a defined "race ID" / shared-seed concept that also touches
§1's N-ghost result. **Needs a dedicated `/speckit.clarify` pass before
`/speckit.plan`** — do not assume an implementation here.

**Owner**: a new feature, working title `race-spectacle`, sequenced
alongside or just after `multi-ghost-contest` (§1).

---

## 3. Garage slots

**Decision**: Rejected. Keep the existing typed Power/Chassis/Flex model
with Fitted/Flexible/Improvised installation states
(`specs/vehicle-topology.md`). Alex's 6 rigid, part-type-only slots and his
spatial adjacency bonuses both reopen calls this project already made and
rejected — see `specs/DEFERRED.md`, "Superseded decisions" and "Considered
and rejected."

No implementation follow-up.

---

## 4. Item synergy tags

**Decision**: Adopt a tag-synergy system — count a tag across the held
build, grant a bonus at 2-of and 3-of thresholds — authored as **our own**
tag set, not a port of Alex's 7 (TURBO/LIGHT/AERO/SIDEWAYS/CHROME/MENACE/
SHADY), which are built around his slot model.

**Adjustments**:
- Tags remain a second axis alongside origin, never a replacement for it —
  matches `vision.md`'s existing framing ("Identity's mechanical homes are
  the draft and vehicle topology... where identity depth is meant to live
  going forward: item synergy").
- Needs an explicit rule for whether an **Improvised** item still counts
  toward a tag's threshold count (not an assumption).
- Thresholds and bonus magnitudes need their own balance pass — Alex's
  numbers were tuned for 6 active slots; ours is 4 active + 3 storage.

Resolves the open item in `specs/DEFERRED.md`, "Item synergy / combination
effects between held items."

**Owner**: a new feature, working title `item-synergy-tags`.

---

## 5. Duplicate items

**Decision**: Adopt tiering — acquiring a second copy of a held item
upgrades its tier instead of being illegal or wasted, up to ★3 (matching
Alex's ceiling).

Resolves the open item in `specs/DEFERRED.md`, "Duplicate-item rules."

**Owner**: folded into whichever feature next touches acquisition/garage,
or a small standalone feature.

---

## 6. Economy

**Decision**: Adopt in full — reputation-as-lose-condition, interest on
banked gold, win/loss streak bonuses, half-price sell-back, and shop-card
locking (persisting a card across reroll).

**Adjustments**:
- Reputation thresholds need their own balance pass against our
  credits/contest-outcome shape — not a direct port of Alex's points-based
  numbers.
- Interest and streaks layer onto the existing credit-transaction system
  (same pattern as today's restock/purchase transactions), not a
  replacement for it.
- Shop-card locking needs its own UI/interaction spec in the Parts
  Supplier encounter — no "lock a card across reroll" interaction exists
  today.

**Owner**: a new feature, working title `economy-depth`.

---

## 7. Season structure / event variety

**Decision**: Grow season length first — this extends `specs/DEFERRED.md`'s
already-planned `009-run-progression` Phase-two encounter catalog (Rival
Scouting, Scrutineering, Factory Development, Privateer Exchange).
Event-type variety (Circuit/Drag/Drift/Demolition/Show-style events, each
scoring a different axis) is a distinct, later follow-up — **not** bundled
with the length increase.

This is its own dedicated `/speckit.specify` pass, not a sub-task riding on
the race-visual rebuild (§2).

**Owner**: extends `009-run-progression`'s planned Phase-two catalog; event
variety is a separate future feature.

---

## 8. Pre-race intel

**Decision**: Adopt a Rival Intel panel shown before racing. Resolves the
already-anticipated "Rival Scouting" encounter from `009-run-progression`'s
Phase-two catalog (`specs/DEFERRED.md`).

**Adjustments**: Exact numbers, no fuzzing or approximation. Alex's
"rumored to run dirty" hint is replaced with full precision — consistent
with Constitution Principle III (Transparency & Legibility). If a value is
shown, it is true, not a hint.

**Owner**: `009-run-progression`'s Phase-two catalog.

---

## 9. Sabotage / inspection risk

**Decision**: Rejected for this pass. A genuinely new mechanic with no
direct constitutional conflict on its own, but Alex's version is built
entirely on live catch-chance rolls resolved during the watched race —
it needs its own design pass to work out a fully deterministic version
(e.g. the catch-chance roll happens once, at build-commit or run-seed
time, never live during playback) before it's worth speccing. Logged as a
new `specs/DEFERRED.md` row rather than discarded.

**Owner**: none currently. Revisit once §2's live-RNG-free visual pattern
is proven out.

---

## Summary

| # | System | Decision | Owner |
|---|---|---|---|
| 1 | Contest field size & model | Adopt (N-ghost, 6-8 cars) | `multi-ghost-contest` (new) |
| 2 | Race presentation / track | Adopt (rebuilt, deterministic) | `race-spectacle` (new) |
| 3 | Garage slots | Reject | — |
| 4 | Item synergy tags | Adopt (own tag set) | `item-synergy-tags` (new) |
| 5 | Duplicate items | Adopt (tiering to ★3) | folded into acquisition work |
| 6 | Economy | Adopt (in full) | `economy-depth` (new) |
| 7 | Season structure | Adopt (length first, variety later) | extends `009-run-progression` |
| 8 | Pre-race intel | Adopt (exact numbers) | `009-run-progression` Phase-two |
| 9 | Sabotage / inspection | Reject (for now) | none — `DEFERRED.md` |

## Next steps

- Run `/speckit.specify` for `multi-ghost-contest` (§1) first — almost
  everything else either depends on it (§2, §8) or is independent of it
  (§4-6), so it unblocks the most.
- The canonical-shared-race-results question flagged in §2 needs a
  dedicated `/speckit.clarify` pass before `/speckit.plan` starts on
  `race-spectacle` — do not let an implementation detail get decided by
  default inside an unrelated plan.
- §4 (synergy), §5 (duplicates), and §6 (economy) have no cross-dependency
  on §1/§2 and can be sequenced independently, per the constitution's
  Development Workflow preference for small, vertically-sliced features.
