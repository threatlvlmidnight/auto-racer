# Research: World Championship Expansion

## Decision 1 — Store a versioned route, not a regenerated projection

Persist selected regions, outstanding destination offer, stage schedule, and
progress in run state. Derive offers from seed plus transition ordinal once and
retain them. This makes back-navigation and replay deterministic and prevents
content-order changes from silently rerolling a live run.

## Decision 2 — Model race kind as policy, not a second race engine

`local` and `championship` choose opponent source, settlement, points, interest,
and contract eligibility. Both produce the same canonical contest input and use
the existing setup, lap, playback, and result types. A forked PvE simulator was
rejected because it would undermine parity and future asynchronous migration.

## Decision 3 — Keep region outside simulation

Track generation remains authoritative. `regionTheme` is retained as labeled
presentation metadata and maps to a stable texture key/dressing descriptor.
Simulation modules must not consume region bonuses. Authored regional tendencies
select legal items/setups, making their mechanical impact visible in evidence.

## Decision 4 — Generate locals from authored identity plus constrained policy

Each of 49 profiles supplies identity, eligible vehicle/build vocabulary, and a
tendency. A pure generator fills Qualifier/Challenge snapshots within explicit
slot/tier/setup bands and validates them through existing canonical rules.
Hand-authoring 98 full snapshots was rejected as brittle and difficult to tune.

## Decision 5 — Persist seven season rivals and their result history

Select seven stable rivals at run creation. Their deterministic snapshots may
evolve by leg, but identity and standings history persist. This supports wins,
podiums, recent-finish tie-breaks, leg histories, and later replacement of the
prototype snapshot source by real asynchronous records.

## Decision 6 — Inject the elite exact-track record source

Finale selection consumes an interface that returns validated recorded ghosts
for a track fingerprint. Rank, deduplicate, exclude the player, take seven, then
fill shortages with labeled deterministic exhibition ghosts. No network is
required now and the contest pipeline remains unaware of source provenance.

## Decision 7 — Settle reputation once, then evaluate Last Chance

Combine position and sponsor deltas, clamp reputation to zero, and apply the
Last Chance state machine to that final value exactly once. This avoids order-
dependent elimination. Preparation does not resolve recovery; only the next
race settlement can clear or fail an active chance.

## Decision 8 — Pay interest only on Championship Races

Twenty interest events would compound credits far beyond the present economy.
Local Races retain small purses but no interest; ten Championship interest
events provide progression runway without changing the underlying rate.

## Decision 9 — Render the itinerary from a pure presentation model

Use a stylized code-rendered map and route anchors rather than requiring another
bitmap. The model exposes selected legs, locked Paris, current eight-stage leg,
completed histories, and destination action. Phaser owns drawing/input only,
which permits layout and accessibility testing without a renderer.

## Decision 10 — Reject old active schedule versions explicitly

The new route cannot safely infer destination choices, standings, locals, or
Last Chance history from a 12/24-stage run. A version guard offers restart while
leaving persistent settings/unlocks untouched. Silent migration was rejected as
non-deterministic and misleading.
