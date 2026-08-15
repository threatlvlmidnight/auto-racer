# Research: Race Enrichment

## Decision 1 — Enrich authoritative lap resolution, not playback

**Decision**: Add a pure enrichment pass to N-car contest resolution. Playback
reads its retained events and timing changes without recomputation.

**Rationale**: Existing `resolveNCarContest` already owns the exact track, builds,
setups, laps, ranking, and tie order. This preserves async identity and prevents
camera speed or frame timing from changing outcomes.

**Alternatives considered**: Marker-proximity passes in Phaser were rejected as
fabricated spectacle. A second playback simulation was rejected as competing
authority.

## Decision 2 — Evaluate at stable lap/segment boundaries

**Decision**: Evaluate phase changes and action windows at deterministic retained
boundaries derived from the track/lap model. Begin with lap boundaries where the
current evidence is strongest; allow segment context as an input without making
frame positions authoritative. Pin Opening/Contest/Final Push counts to
8=`2/4/2`, 10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, and 16=`4/8/4`; give an
indivisible remainder to Final Push.

**Rationale**: Current results retain per-lap time and physics evidence. Boundary
evaluation gives exact ordering, proximity, and delayed-frame-safe playback.

**Alternatives considered**: Continuous sub-frame evaluation was rejected as
unnecessary resolution cost and harder evidence. Phase-only periodic swaps were
rejected as scripted rubber-banding.

## Decision 3 — Use resolved physical stats for signature eligibility

**Decision**: Map the initial identities to four understandable physical
directions: Mercer—cornering, Soto—acceleration, Rook—top speed, Voss—braking.
Eligibility uses the committed authoritative resolved value, including legal
setup and item effects from any origin. Exact thresholds are config, not content
code literals.

**Rationale**: This covers the four main stats, matches broad entrant themes, and
lets cross-pollination/rival-intel parts contribute equally.

**Alternatives considered**: Item tags were rejected because they punish foreign
pool exploration. Item counts and price totals were rejected as poor proxies for
engineering outcome.

## Decision 4 — Separate passive eligibility from active opportunity

**Decision**: Passives always participate. A signature first passes its stat gate,
then waits for its authored phase/position/track context and available Composure.

**Rationale**: Empty builds retain personality without receiving the dramatic
active benefit, and a qualifying build still needs the race to create a credible
moment.

**Alternatives considered**: Guaranteed scheduled activation was rejected as an
ultimate button. Seeded proc chances were rejected as less learnable.

## Decision 5 — Centralize and validate every balance lever

**Decision**: One immutable `RaceEnrichmentConfig` contains budgets, costs,
thresholds, proximity, time caps, incident toggle/risk caps, corpus bands, and
presentation emphasis bands. Production uses documented defaults; tests inject
fixtures.

**Rationale**: The owner explicitly requires easy tuning and clean incident
disablement. Dependency injection avoids scattered constants and test-only flags.

**Alternatives considered**: Environment variables were rejected for a static
client game. Mutable globals were rejected for replay and test isolation.

## Decision 6 — Derive isolated deterministic streams

**Decision**: Derive named deterministic sub-seeds from contest identity for
opponent setup, action ties, and incidents. Disabled subsystems consume no shared
stream and cannot shift other results.

**Rationale**: Identical input must replay identically, and toggling incidents
must not silently change signatures or passes.

**Alternatives considered**: One threaded RNG was rejected because branch/toggle
changes shift later consumption. Live random calls are constitutionally invalid.

## Decision 7 — Use a single stable event ordering

**Decision**: Order by boundary, then phase transition, passive modifiers,
signature eligibility/activation, incident, attack, defense, pass result, and
finish; use retained roster/tie order within one kind. Budget debits are atomic.

**Rationale**: Simultaneous events otherwise risk double spends and divergent
replays. A documented ordering is testable and debuggable.

**Alternatives considered**: Object iteration order and scene arrival order were
rejected as implicit authority.

## Decision 8 — Treat incidents as an optional pure rule package

**Decision**: Incident evaluation returns no event and no timing change when the
config toggle is false. When true, inspectable risk plus isolated seed/context
may produce a bounded time loss only.

**Rationale**: This provides an engine-level kill switch and prevents partial UI
disablement from leaving hidden effects active.

**Alternatives considered**: Removing incident presentation only was rejected as
misleading. Persistent damage/economy penalties were deferred.

## Decision 9 — Replace playback rate semantics in the shared clock

**Decision**: Keep two direct controls but change multipliers: new `1x` consumes
schedule at the legacy rate and new `2x` consumes at twice legacy rate. New races
default to `1x`.

**Rationale**: Labels now match the desired baseline and the slow mode is removed.
The shared controller already guarantees crossed-boundary integrity.

**Alternatives considered**: Keeping old labels contradicts the owner decision;
adding a third rate increases controls and preserves an unwanted slow mode.

## Decision 10 — Ship text/shape emphasis with a future-proof event ID

**Decision**: Feature 033 uses bounded banners, marker emphasis, and compact
callouts selected from stable event kinds/IDs. Results exposes the same IDs.

**Rationale**: It proves truthful selection now and lets a later picture-in-
picture asset feature replace rendering without modifying settlement.

**Alternatives considered**: Generating provisional character cutscene assets
was rejected as unplanned production scope.
