# Data Model: Race Enrichment

## RaceEnrichmentConfig

Immutable validated configuration supplied to contest resolution:

- `enabled`: master enrichment switch for baseline comparison only
- `incidentsEnabled`: isolated incident rule switch
- `phaseFractions`: Opening `0.25`, Contest `0.50`, Final Push `0.25`
- `initialComposure`, action costs, passing range, minimum pace advantage
- per-identity resolved-stat thresholds and temporary-effect caps
- incident risk/time-loss caps
- monitored winner-change, post-Opening-event, and emphasis-frequency bands

Invalid negative, non-finite, unordered, or out-of-range values fail validation
before contest resolution. Production defaults are immutable; tests may inject a
validated config.

## RacePhase

Closed value: `opening | contest | final-push`.

`RacePhaseSchedule` stores the inclusive lap range for each phase. Every lap is
assigned exactly once. Exact Opening/Contest/Final Push counts are 8=`2/4/2`,
10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, and 16=`4/8/4`. When quarter allocation has
an indivisible remainder, it belongs to Final Push.

## DriverRaceIdentity

- stable entrant/profile identity
- passive: name, description, condition, bounded modifier
- signature: name, relevant physical stat, threshold key, contextual condition,
  Composure cost, temporary effect, priority

Initial player mappings:

| Entrant | Signature direction |
|---|---|
| Evelyn Mercer | Cornering speed |
| Lucien Soto | Acceleration |
| Inez Rook | Top speed |
| Nell Voss | Braking power |

Generated rivals use the same entity schema and never receive hidden stock-stat
bonuses from identity.

## SignatureEligibility

- participant and signature IDs
- relevant stat
- authoritative committed value
- configured threshold
- contributing item/setup sources
- `eligible`

Threshold equality is eligible. Origin and tag are presentation facts only and
cannot change the decision.

## ComposureLedger

- participant ID
- initial budget
- ordered `ComposureSpend[]`
- remaining budget

Each spend has event ID, boundary, action kind, amount, before, and after. A spend
is accepted only when the full cost remains. No replenishment transition exists.

## ActionWindow

- boundary ID and phase
- lap/segment context
- participant state and authoritative cumulative time/position
- nearby candidates and pace differences
- applicable track context

It is an input to pure action selection, not retained UI state.

## EnrichmentEvent

Closed kinds:

- `phase-transition`
- `signature-activation`
- `incident`
- `attack`
- `defense`
- `overtake-attempt`
- `overtake-completed`

Common fields:

- stable event ID, kind, phase, boundary, deterministic order
- actor and optional target
- trigger facts and signature/passive/config references
- Composure before/spent/after
- effective stat or target-pace delta and active window
- incident time loss when applicable
- time and position before/after
- emphasis class: `full | compact | results-only`

A completed overtake requires an authoritative before/after position exchange.
An attempt never presents as completed.

## EnrichedCarResult / EnrichedContestResult

`CarResult` gains driver identity, final Composure ledger, and enriched lap
evidence. `NCarContestResult` gains config identity/version, phase schedule,
ordered enrichment events, and incident-toggle state. Ranking continues to use
the final retained lap totals and existing stable tie order.

## IncidentRiskSummary

Pre-race projection:

- `band`: `low | guarded | elevated`
- concrete source list with signed contribution
- legal safer setup alternatives when available
- no resolved incident flag or seed outcome

## Presentation lifecycle

```text
committed inputs
  → validate config and derive named seeds
  → resolve eligibility and risk projection
  → assign phases and evaluate ordered action windows
  → emit enriched laps + immutable events
  → rank once from retained totals
  → playback consumes event boundaries at 1x/2x or Skip
  → Results summarizes and inspects the same events
```

## AudioCue / AudioSettings

`AudioCueId` is a closed presentation-only vocabulary:

- `race-engine-loop`
- `ui-activate`
- `ui-select`
- `ui-back`

`AudioSettings` contains `muted` and bounded `effectsVolume`. It is session-local
for this feature. `AudioPlaybackState` tracks browser-unlocked state, active
engine-loop ownership, and selected presentation-rate band. None is serialized
into contest input, retained events, result ranking, or settlement.

The audio adapter consumes semantic UI actions and the existing presentation
clock lifecycle. It never emits authoritative events and never blocks a scene
transition while waiting for browser audio promises.

## CircuitGeometry / TrackFeature / BrakingZone

`CircuitGeometry` retains the deterministic closed centerline, geometric
primitives, sampled render points, bounds, generation attempt, and validation
result. Curves carry signed direction and radius so alternating turns are
authoritative rather than inferred from pixels.

`TrackFeature` is a stable classified span: `straight | sweeper | chicane |
hairpin | switchback`. A switchback contains adjacent meaningful turns of
opposite sign; a chicane is a shorter alternating sequence; thresholds are
centralized and tested against geometry, not scene scale.

`BrakingZone` retains approach span/distance, entry speed potential, target
corner or sequence, target speed, required speed reduction, and normalized
severity. `TrackCharacteristics.brakingDemand` aggregates these zones. A
production circuit has at least one positive zone; zero is reserved for
explicit synthetic fixtures.

Candidate generation is bounded and deterministic from seed, race ordinal, and
region. Validation rejects open paths, intersections, insufficient separation,
invalid radii/segment lengths, or viewport overflow before the track becomes
authoritative. Every scene and simulation consumer receives this same retained
object; none regenerates or reclassifies it.
