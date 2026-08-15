# Feature 033 Clarification Questionnaire: Race Enrichment

**Created**: 2026-08-15

**Status**: Awaiting one consolidated owner response.

Reply with the question number and either `Accept`, a listed alternative, or a
replacement answer. Questions are grouped here to minimize clarification rounds;
accepted answers will be incorporated into the formal feature specification.

## Race structure and authority

### Q1 — How should race phases be defined?

**Recommendation**: Use three lap-relative phases shared by every track:
Opening (first 25%), Contest (middle 50%), and Final Push (last 25%), with exact
boundaries rounded deterministically for each supported lap count. Track segments
remain contextual inputs inside a phase rather than defining the phases.

**Why**: A global model is teachable and testable while still allowing corners,
straights, and track composition to affect opportunities.

### Q2 — Should phases change every car automatically or only create windows?

**Recommendation**: Phases change baseline driving priorities modestly for every
car and also open contextual action windows. They must not apply large universal
speed multipliers that overwhelm builds.

**Why**: The race gains structure without becoming scripted rubber-banding.

### Q3 — What should power pushes/signature actions spend?

**Recommendation**: Introduce one race-local `Composure` budget per driver. It is
committed automatically by deterministic behavior rules, cannot be replenished
during the race in this feature, and has no post-race economy consequence.

**Why**: One visible resource makes repeated pushes a tradeoff without adding
damage, repair, heat, grip, and aggression systems simultaneously.

### Q4 — How are signature actions triggered?

**Recommendation**: Guarantee activation whenever authored conditions are met
and sufficient Composure remains. Use deterministic priority/tie rules when
multiple signatures are eligible; do not add a pre-race proc roll.

**Why**: Builds and driver tendencies remain learnable, inspectable, and useful
for planning. The contest seed may settle opponent generation and exact ties but
should not turn a valid signature into a hidden chance event.

## Driver identity and balance

### Q5 — How much identity should each driver receive in this slice?

**Recommendation**: Give each driver one named signature action plus one quieter
passive tendency. The signature supplies the memorable moment; the tendency
influences when the driver preserves or spends Composure.

**Why**: One action alone risks feeling like an ultimate button, while several
active skills per driver would create too much initial balance and UI work.

### Q6 — May signatures change physical vehicle stats?

**Recommendation**: Signatures may apply temporary, evidence-backed changes to
target pace, acceleration, braking, or cornering only while their resolved
window is active. Stock base stats remain identical and authored item effects
remain unchanged.

**Why**: This creates conditional identity without reopening equal starting
vehicles or disguising a permanent scalar advantage.

### Q7 — How should signatures interact with builds and tracks?

**Recommendation**: Every signature must require race context and scale from
existing committed stats or tags; none should grant a fixed result independent
of the build. Each driver should have favorable contexts, not a universally
best track or automatic pass.

**Why**: Driver choice shapes strategy but does not replace vehicle-building.

## Passing, comebacks, and incidents

### Q8 — What creates an overtake opportunity?

**Recommendation**: A passing window requires proximity at an authoritative
checkpoint or segment boundary, sufficient projected pace advantage, and enough
Composure for an attack when one is needed. Defense can spend Composure under
its own deterministic rules. The simulation resolves the resulting time/position
exchange and retains the evidence before playback.

**Why**: Passes arise from actual race state instead of periodic scripted swaps.

### Q9 — How large may enrichment-driven comebacks be?

**Recommendation**: Enrichment may change close contests but must not erase a
clearly superior build. Cap any single action's time swing and require a car to
be within a defined passing window; validate that enrichment changes the winner
only in a minority of representative deterministic races (recommended initial
acceptance band: 10–25%).

**Why**: A zero-percent change would be cosmetic, while frequent reversals would
invalidate preparation. The exact time cap should be derived during planning
from baseline race distributions rather than guessed during clarification.

### Q10 — Should Feature 033 include crashes or incidents?

**Recommendation**: Include non-retirement `incidents` in the first slice:
mistakes, lockups, or brief off-line moments that add bounded race time. Exclude
retirement, persistent vehicle damage, item loss, fines, and economy penalties.
Every incident must come from inspectable pre-race risk plus deterministic race
conditions and be retained as evidence.

**Why**: Incidents add drama while avoiding a second run-damage/economy feature
and the frustration of losing an entire race to opaque catastrophe.

### Q11 — Can the player reduce incident risk?

**Recommendation**: Yes. Risk must be visible at pre-race setup as a qualitative
band plus its concrete sources, and safer setup/build choices must be capable of
changing it. Do not reveal whether the committed race will actually contain an
incident before playback.

**Why**: The player can plan around risk without spoiling the watched event.

## Presentation and transparency

### Q12 — What should be visible before the race?

**Recommendation**: Show phase structure, the selected driver's signature and
passive rules, current Composure budget, relevant activation conditions, and
incident-risk sources. Do not preview exact activation laps, successful passes,
or incident outcomes.

**Why**: Rules and risk are inspectable while the resolved narrative remains
worth watching.

### Q13 — Which moments receive special presentation?

**Recommendation**: Use full cut-ins only for player signature activation, a
decisive final-phase overtake involving the player, or a player incident. Use
compact trackside callouts for opponent signatures, routine attacks/defenses,
and non-decisive passes. Never interrupt for baseline phase transitions alone.

**Why**: Rarity preserves impact and prevents spectacle from obscuring the race.

### Q14 — How should presentation behave at `1x`, `2x`, and Skip?

**Recommendation**: At `1x`, show the complete bounded cut-in; at `2x`, use a
shortened version with the same text/evidence; Skip consumes all retained events
without playing cut-ins and exposes a concise event summary on Results. Reduced
motion replaces camera motion/flashes with a static banner and keeps identical
labels and evidence.

**Why**: Playback preference changes duration, never information or settlement.

### Q15 — What retained evidence must Results expose?

**Recommendation**: Retain phase, boundary/segment, participants, trigger
conditions, Composure spent, temporary stat/pace change, incident time loss,
and authoritative position/time before and after every consequential event.
Results should summarize the few decisive events and allow inspection of the
complete event log.

**Why**: This is the minimum useful audit trail for truthful playback, debugging,
balance tests, and future async ghost reproduction.

## Initial slice and success criteria

### Q16 — What content constitutes a complete first slice?

**Recommendation**: Ship all three phases, passing/defense windows, one signature
and one passive tendency for each of the four player entrants, equivalent rules
for generated opponents, bounded incidents, pre-race explanation, playback
presentation, Results evidence, and deterministic balance fixtures. Do not ship
only one showcase driver or a presentation-only prototype.

**Why**: Partial driver coverage would distort balance and async competition and
would not prove the system across the actual roster.

### Q17 — What high-level success target should govern watchability?

**Recommendation**: In a deterministic representative corpus, at least half of
races should contain a consequential event after the opening phase, while no
more than one-third should use a full cut-in. The leader after Opening should
not always win, but build strength must remain the dominant predictor. Planning
should establish exact corpus thresholds from baseline measurements.

**Why**: This directly tests the reported problem—races feeling settled after
lap one—without mandating artificial reversals in every race.

## Fast response template

```text
Q1 Accept
Q2 Accept
Q3 ...
...
Q17 Accept
```

