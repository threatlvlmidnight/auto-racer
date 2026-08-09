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

## 8. Pre-race screen (expanded, post-decision addition — 2026-08-09)

*Originally scoped as "Pre-race intel" (a read-only Rival Intel panel).
Expanded the same day, after re-reading this document, into a second
candidate for the "add a dimension outside the car" depth request from the
demo — see "On the depth question" below.*

**Decision**: Adopt a real pre-race screen, not just a stats panel:

- **Rival Intel** (the original scope): exact, non-fuzzed opponent stats
  shown before the race. Resolves the already-anticipated "Rival Scouting"
  encounter from `009-run-progression`'s Phase-two catalog
  (`specs/DEFERRED.md`). Alex's "rumored to run dirty" hint is replaced
  with full precision — consistent with Constitution Principle III
  (Transparency & Legibility). If a value is shown, it is true, not a hint.
- **Track preview**: the player sees the actual track for the upcoming
  race before it starts. This is the same track that actually races —
  reinforces §2's direction toward a small, pre-authored track catalog
  with deterministic selection, since the previewed track and the raced
  track (and what every other viewer of an async multiplayer race sees)
  must all be identical.
- **Item-driven pre-race controls**: for builds holding an item authored as
  "configurable," the screen exposes a small, simple control tied to that
  item — e.g. a build around an adaptive-brakes-style item gets a brake-bias
  slider, tuned against that specific track. A build with no configurable
  items sees no controls; this rewards a specific build choice, it isn't a
  mandatory extra step for everyone.

**Explicit scope guardrail** (owner's words: *"we wouldn't want to go
overboard here"*): this stays a small number of simple controls — order of
magnitude 1-3 configurable dimensions across the whole item pool at
launch — not a full tuning/setup simulation. Whatever the player sets is
locked in before the contest starts and becomes part of that race's
precomputed input, consistent with Principle I (no live input once the
contest starts) and Principle III (the setting and its effect on the
outcome must be inspectable after the fact, same as any other
outcome-determining value).

**Open — for `/speckit.clarify`, not decided here**:
- What "configurable" looks like as an authored field on `ItemDefinition`
  (a new optional field, shaped like the existing `fittedBehavior`/
  `improvisedBehavior` pattern, seems like the natural fit — not decided).
- What track "characteristics" a control can actually tune against — this
  depends on §2's track model landing first (today's track has no real
  geometry to tune brake bias against).
- How many configurable dimensions ship at launch, and which items get them.
- Whether this is its own scene or an extension of an existing prepare-
  adjacent flow.

**Owner**: new feature, working title `pre-race-setup`. Depends on §2
(`race-spectacle`) for a real track to preview and tune against — cannot
be specified in detail before that track model exists.

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

## On the depth question

The demo feedback that started this whole review ("the run feels short, we
need another dimension outside the car") now has two complementary
candidate answers on record, not competing ones:

1. **Season length/structure** (§7) — more encounters, more of the run
   itself, extending `009-run-progression`'s already-planned Phase-two
   catalog.
2. **The pre-race screen** (§8) — a lighter-weight, per-race dimension:
   most of the time it's just Rival Intel and a track preview, but a build
   that leans into configurable items gets a genuine extra decision point
   every race, without becoming mandatory busywork for builds that don't.

Neither replaces the slot-capacity question already logged in
`specs/DEFERRED.md` ("Expand active slot capacity... toward ~10") — that
one is still explicitly waiting on this demo's own playtest data, per that
row's own text, and stays open regardless of how §7/§8 land.

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
| 8 | Pre-race screen | Adopt + expand (rival intel + track preview + item-driven controls) | `pre-race-setup` (new, depends on §2) |
| 9 | Sabotage / inspection | Reject (for now) | none — `DEFERRED.md` |

## Next steps

- Run `/speckit.specify` for `multi-ghost-contest` (§1) first — almost
  everything else either depends on it (§2, §8) or is independent of it
  (§4-6), so it unblocks the most.
- The canonical-shared-race-results question flagged in §2 needs a
  dedicated `/speckit.clarify` pass before `/speckit.plan` starts on
  `race-spectacle` — do not let an implementation detail get decided by
  default inside an unrelated plan.
- `pre-race-setup` (§8) cannot be meaningfully specified until
  `race-spectacle` (§2) has landed a real track model — sequence it after,
  not alongside.
- §4 (synergy), §5 (duplicates), and §6 (economy) have no cross-dependency
  on §1/§2 and can be sequenced independently, per the constitution's
  Development Workflow preference for small, vertically-sliced features.
