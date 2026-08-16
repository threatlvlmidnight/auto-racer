# Feature Specification: Race Enrichment

**Feature Branch**: `[033-race-enrichment]`

**Created**: 2026-08-15

**Status**: Implementation complete — 93/93 tasks verified

**Input**: Make watched races remain credible and dramatic after the opening lap
through deterministic phases, build-supported driver signatures, passing and
defense, bounded incidents, truthful event presentation, basic sound, and
recognizable circuit generation with meaningful braking demands.

## Clarifications

### Session 2026-08-15

- Q: How are race phases defined? → A: Use shared lap-relative Opening (first
  25%), Contest (middle 50%), and Final Push (last 25%) phases with deterministic
  rounding for supported lap counts. Exact Opening/Contest/Final Push counts are
  8=`2/4/2`, 10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, and 16=`4/8/4`; an indivisible
  remainder goes to Final Push.
- Q: May phases favor particular drivers before builds? → A: No. Structural
  phase rules apply evenly to every driver before item and setup effects.
- Q: What limits signature actions and pushes? → A: One visible, race-local
  Composure budget per driver; it does not replenish or affect post-race economy.
- Q: Are eligible signatures chance-based? → A: No. They activate whenever
  their deterministic build, race-context, priority, and Composure conditions
  are satisfied; committed inputs and seed reproduce the identical race.
- Q: How much driver identity ships? → A: One always-active passive tendency and
  one named active signature per player entrant, with equivalent authored rules
  for generated opponents.
- Q: How does an active signature receive build support? → A: Its relevant
  resolved vehicle stat must meet a centrally tunable driver-authored threshold.
  Items from every origin count equally; race context still controls activation.
- Q: May signatures change vehicle behavior? → A: Only through temporary,
  retained changes to target pace or physical-stat effects during the resolved
  window. Equal stock physical stats and authored item values remain unchanged.
- Q: What creates a pass? → A: Authoritative proximity and projected pace at a
  checkpoint/segment boundary, plus deterministic Composure-backed attack and
  defense rules where applicable.
- Q: How much may enrichment change results? → A: It may decide close contests
  but not erase clearly superior builds. Time-swing and corpus acceptance bands
  are centralized developer-tunable configuration.
- Q: Do incidents ship? → A: Yes, as bounded non-retirement mistakes, lockups,
  or off-line moments behind one engine-level toggle. No damage, retirement,
  item loss, fines, or economy penalty ships in this feature.
- Q: How visible is incident risk? → A: Pre-race UI shows the qualitative band,
  concrete sources, and safer alternatives without revealing the committed
  incident outcome.
- Q: What is visible before racing? → A: Phase structure, passive and signature
  rules, Composure, signature stat threshold/current value/sources, activation
  context, and incident-risk sources.
- Q: Which presentation ships? → A: Text and bounded animation for consequential
  events. Bespoke picture-in-picture character cutscenes are deferred.
- Q: How do playback speeds change? → A: The current `2x` rate becomes the new
  `1x` baseline (about 20 seconds for the legacy race); new `2x` is twice that
  rate (about 10 seconds), and the current slow about-40-second mode is removed.
  New races default to the new `1x`.
- Q: How does Skip/reduced motion behave? → A: Skip consumes the same retained
  event schedule without cut-ins and Results summarizes it. Reduced motion uses
  static feedback carrying the same labels and evidence.
- Q: What evidence is retained? → A: Phase, boundary, participants, trigger
  inputs, Composure, temporary change or incident loss, and authoritative time
  and position before/after every consequential event.
- Q: What constitutes a complete first slice? → A: All phases, all four entrant
  identities, generated opponents, passing/defense, optional bounded incidents,
  pre-race explanation, playback, Results evidence, and deterministic fixtures.
- Q: What watchability target applies? → A: Initially, at least half of the
  representative deterministic corpus contains a consequential post-Opening
  event, no more than one-third uses a full emphasis animation, and build
  strength remains the dominant predictor. Monitor and tune these thresholds.
- Q: What audio ships? → A: Basic looping engine audio for scored and Test Day
  race playback plus shared UI activation/selection feedback sounds. Audio is
  presentation-only, user-muteable, and degrades silently when playback is
  blocked or an asset is unavailable. Background music is deferred.
- Q: What track work ships? → A: Replace regular one-direction polygon loops
  with deterministic circuit grammar that can combine straights, sweepers,
  chicanes, hairpins, and alternating-direction switchbacks. Braking demand is
  derived from approach speed, corner severity, and braking zones; production
  tracks may not all collapse to zero.

## User Scenarios & Testing

### User Story 1 — Watch a race that remains contested (Priority: P1)

As a player or spectator, I see a race progress through understandable phases
with credible attacks, defenses, passes, and late opportunities derived from
the committed cars rather than fabricated during playback.

**Why this priority**: The reported failure is that watched races feel settled
after the first lap. The authoritative contest must become more dynamic before
additional spectacle has meaningful events to present.

**Independent Test**: Resolve and replay a deterministic corpus containing close
and clearly separated builds at every supported lap count; verify phase bounds,
passing evidence, final settlement, replay identity, and outcome-disruption bands.

**Acceptance Scenarios**:

1. **Given** any supported race length, **When** the contest resolves, **Then**
   every lap belongs to exactly one deterministic Opening, Contest, or Final Push
   phase shared by every participant.
2. **Given** two cars enter a boundary outside passing range, **When** enrichment
   resolves, **Then** no pass is invented between them.
3. **Given** two cars have proximity, sufficient pace advantage, and applicable
   Composure, **When** attack and defense resolve, **Then** the retained event
   identifies inputs, costs, time/position before and after, and the final result.
4. **Given** identical committed participants, setup, track, seed, and feature
   configuration, **When** the race is resolved or replayed repeatedly or viewed
   asynchronously, **Then** every result and consequential event is identical.
5. **Given** a clearly superior legal build, **When** representative seeds and
   opponents are evaluated, **Then** enrichment does not routinely reverse its
   advantage and the configured corpus balance gates remain satisfied.

---

### User Story 2 — Build toward a driver identity (Priority: P1)

As a player, I can use parts from any origin to move my vehicle toward my
driver's preferred stat, unlock the driver's signature eligibility, and
understand when their passive and active identity affect a race.

**Why this priority**: Driver identity must reward engineering direction without
punishing cross-pollination, rival intel, or experimentation with foreign items.

**Independent Test**: Construct multiple same-stat builds using native, foreign,
and mixed item pools; verify identical eligibility at the threshold, always-on
passive behavior, contextual activation, Composure cost, and retained effects.

**Acceptance Scenarios**:

1. **Given** an empty or below-threshold build, **When** a race resolves, **Then**
   the driver's passive applies but the named active signature is ineligible.
2. **Given** a build reaches the signature's resolved-stat threshold entirely
   with other entrants' items, **When** it is committed, **Then** it receives the
   same signature eligibility as a native-item build with the same resolved stat.
3. **Given** a signature is eligible but its race-context condition never occurs,
   **When** the race settles, **Then** it does not activate or spend Composure.
4. **Given** multiple actions are eligible at one boundary, **When** they resolve,
   **Then** documented deterministic priority and tie rules produce one stable
   ordering without live randomness.
5. **Given** a temporary signature effect ends, **When** later race state is
   inspected, **Then** stock, item-authored, and persistent build values remain
   unchanged.

---

### User Story 3 — Understand and manage race risk (Priority: P2)

As a player, I can see why my committed build is at risk of a bounded incident,
choose safer preparation when desired, and understand any incident that occurs
without suffering hidden persistent punishment.

**Why this priority**: Incidents can add uncertainty and drama only if their risk
is actionable and their consequences remain bounded and transparent.

**Independent Test**: Compare deterministic risky and safer builds with incidents
enabled and disabled; verify pre-race sources, retained outcome, bounded time loss,
and absence of run-economy or inventory mutation.

**Acceptance Scenarios**:

1. **Given** a committed build has incident-risk sources, **When** pre-race setup
   is viewed, **Then** it shows a qualitative risk band, each concrete source,
   and which legal preparation changes would lower risk without revealing the
   resolved incident outcome.
2. **Given** incidents are enabled and deterministic conditions resolve one,
   **When** it occurs, **Then** it causes only a bounded race-time consequence and
   records its risk inputs, trigger, and time/position change.
3. **Given** incidents are disabled through the single engine toggle, **When**
   the same corpus resolves, **Then** no incident event or incident time penalty
   occurs and phases, signatures, and passing remain operational.
4. **Given** a race contains an incident, **When** settlement completes, **Then**
   no retirement, damage, item loss, fine, or other post-race economy mutation is
   attributed to it.

---

### User Story 4 — See truthful consequential moments (Priority: P2)

As a spectator, I receive restrained text and animation for important retained
events and can inspect why the race changed at Results, regardless of playback
speed, Skip, or reduced-motion preference.

**Why this priority**: Presentation supplies payoff and comprehension, but it
must remain downstream of authoritative contest evidence.

**Independent Test**: Replay the same retained race at new `1x`, new `2x`, Skip,
and reduced motion; reconcile every shown or summarized event with immutable
evidence and verify settlement is identical.

**Acceptance Scenarios**:

1. **Given** the same retained race, **When** watched at either playback speed,
   **Then** it presents the same events in the same authoritative order and
   reaches the same result; only presentation duration changes.
2. **Given** a player signature, decisive player-involved Final Push pass, or
   player incident, **When** its boundary is crossed, **Then** bounded text and
   animation identify the event without requiring bespoke character artwork.
3. **Given** routine opponent or non-decisive events, **When** shown, **Then**
   compact callouts communicate them without repeatedly interrupting playback.
4. **Given** Skip, **When** selected, **Then** playback reaches the retained finish
   without playing emphasis animations and Results summarizes decisive events.
5. **Given** reduced motion, **When** a consequential event occurs, **Then** a
   static treatment preserves the same name, participants, meaning, and evidence.
6. **Given** Results, **When** a decisive event is inspected, **Then** the player
   can see its phase/boundary, trigger inputs, Composure, effect or loss, and
   authoritative before/after time and position.

---

### User Story 5 — Hear responsive race and UI feedback (Priority: P2)

As a player or spectator, I hear a restrained engine bed during races and short
feedback when I activate or select UI controls, while retaining a clear mute
option and identical gameplay when audio is unavailable.

**Why this priority**: Basic sound materially improves race presence and control
responsiveness, but it must remain downstream of deterministic authority.

**Independent Test**: Drive retained playback and shared controls through mocked
audio adapters; verify cue order, lifecycle cleanup, mute behavior, missing-asset
fallback, and byte-identical race results with audio enabled and disabled.

**Acceptance Scenarios**:

1. **Given** scored or Test Day race playback begins after user interaction,
   **When** the presentation clock runs, pauses, changes speed, skips, finishes,
   or exits, **Then** one engine loop follows that lifecycle without leaking into
   another scene or changing schedule time.
2. **Given** an enabled shared UI control, **When** it is activated or a selection
   changes, **Then** one concise UI cue plays; disabled controls and duplicate
   pointer/label targets do not emit duplicate cues.
3. **Given** sound is muted, browser playback is blocked, or an optional asset is
   missing, **When** the same interaction/race resolves, **Then** navigation,
   retained events, settlement, and visible feedback remain fully operational.
4. **Given** new `1x` or `2x` playback, **When** engine audio is active, **Then**
   its bounded playback rate reflects the selected presentation speed without
   using audio time as race authority.

---

### User Story 6 — Race on recognizable circuits (Priority: P1)

As a player, I see varied closed circuits with credible racing features such as
hairpins and switchbacks, and the stated braking demand reflects the geometry I
am preparing for.

**Why this priority**: A field of distorted regular polygons makes every venue
feel interchangeable, while zero braking demand makes an existing vehicle stat
and its pre-race explanation misleading.

**Independent Test**: Generate a broad deterministic seed/ordinal/region corpus;
verify closure, bounds, non-self-intersection, minimum separation, reproducible
feature classification, visible left/right direction changes, and nonzero
geometry-derived braking demand for production circuits.

**Acceptance Scenarios**:

1. **Given** a production track seed, **When** its circuit is generated, **Then**
   it is a closed, non-self-intersecting, drivable centerline within the race
   viewport rather than a regular convex polygon.
2. **Given** the representative track corpus, **When** layouts are classified,
   **Then** it contains recognizable hairpins, chicanes, sweepers, and
   alternating-direction switchbacks across the corpus.
3. **Given** a track with a severe corner after a meaningful approach, **When**
   characteristics are derived, **Then** braking demand and braking-phase
   evidence are greater than zero and increase with braking-zone severity.
4. **Given** identical seed, race ordinal, and region, **When** any preparation,
   Test Day, contest, replay, or Results surface requests the track, **Then** it
   receives the same geometry, features, characteristics, and track identity.

### Edge Cases

- Phase rounding assigns every lap exactly once at 8, 10, 12, 14, and 16 laps.
- A one-lap conceptual/test fixture still produces a valid phase classification.
- Exact stat-threshold equality enables the signature; floating-point display
  rounding cannot disagree with authoritative eligibility.
- A driver can finish with unused Composure when no valid context occurs.
- Simultaneous attacks, defenses, signatures, incidents, and finish boundaries
  use a documented stable ordering and cannot consume the same budget twice.
- A pass that is attempted but does not produce an authoritative position change
  may be recorded as an attempt but cannot be presented as a completed overtake.
- Lapped cars and ties use the existing authoritative lap/time/tie-break evidence.
- Disabling incidents does not alter random consumption or destabilize unrelated
  results; incident selection uses an isolated deterministic stream or equivalent.
- Skip before the first event and Skip during an emphasis animation both consume
  retained events exactly once and reach the same Results state.
- Missing optional presentation assets fall back to text/static treatment and
  never prevent race settlement or Results inspection.
- Browser autoplay can delay engine start until the first valid user gesture;
  delayed/blocked audio never delays playback or queues stale UI sounds.
- Pause, Skip, scene shutdown, visibility loss, and race completion stop or pause
  active engine loops; returning never creates stacked duplicate loops.
- Degenerate circuit candidates, self-intersections, near-overlapping lanes, or
  curves outside the viewport are deterministically rejected and regenerated
  from bounded named attempts; no live randomness or infinite retry is allowed.
- An intentionally braking-free unit fixture may report zero, but every shipped
  production circuit must contain a real braking zone and positive demand.

## Requirements

### Functional Requirements

- **FR-001**: The simulation MUST assign every race lap to one of three shared,
  lap-relative phases: Opening (first 25%), Contest (middle 50%), and Final Push
  (last 25%). Exact Opening/Contest/Final Push counts MUST be 8=`2/4/2`,
  10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, and 16=`4/8/4`; an indivisible remainder
  is assigned to Final Push.
- **FR-002**: Structural phase behavior MUST apply evenly to all drivers before
  committed item and setup effects; identity MUST NOT alter baseline stock stats.
- **FR-003**: Each participant MUST receive one finite race-local Composure
  budget whose initial amount, costs, and tuning values are explicit and whose
  mutations are retained in authoritative event evidence.
- **FR-004**: Composure MUST NOT replenish during a race or affect credits,
  inventory, damage, or other post-race state in this feature.
- **FR-005**: Each of the four player entrants MUST have one always-active passive
  tendency and one named active signature; generated opponents MUST use the same
  identity-rule schema and contest authority.
- **FR-006**: Each active signature MUST declare a relevant resolved vehicle stat
  and centrally tunable eligibility threshold. Equality with the threshold MUST
  qualify, and item origin MUST NOT participate in eligibility.
- **FR-007**: Pre-race presentation MUST expose the signature stat, authoritative
  current value, threshold, eligibility, and contributing item/setup sources.
- **FR-008**: Eligibility MUST NOT guarantee activation. A signature MUST also
  satisfy its authored race-context condition, deterministic priority rules, and
  available Composure.
- **FR-009**: Passive, signature, push, attack, defense, and incident resolution
  MUST be deterministic from committed participants, setup, track, isolated seed
  state, and engine configuration; playback MUST NOT resolve outcome randomness.
- **FR-010**: Temporary identity/action effects MAY modify target pace or effective
  acceleration, top speed, braking, or cornering during an explicit retained
  window but MUST NOT mutate stock stats or authored item effects.
- **FR-011**: A completed overtake MUST require and retain authoritative proximity,
  pace, and before/after time-position evidence at a valid boundary. Presentation
  MUST NOT infer a completed pass solely from screen-marker intersection.
- **FR-012**: Attacks and defenses that spend Composure MUST use atomic,
  deterministic cost and ordering rules and MUST NOT overspend or double-consume.
- **FR-013**: Single-action time swing, passing range, winner-change corpus band,
  watchability band, and emphasis-frequency band MUST be centralized,
  developer-tunable configuration with documented defaults and validation ranges.
- **FR-014**: The initial winner-change acceptance band SHOULD be 10–25% in the
  representative deterministic comparison corpus, subject to baseline planning
  evidence; build strength MUST remain the dominant outcome predictor.
- **FR-015**: Incidents MUST be controlled by one engine-level toggle that can
  disable incident selection, event emission, and penalty application without
  disabling phases, signatures, passing, defense, or presentation infrastructure.
- **FR-016**: Enabled incidents MUST be deterministic, non-retirement events with
  a bounded race-time loss. They MUST NOT cause persistent damage, item loss,
  fines, credit changes, or other run-state penalties.
- **FR-017**: Incident resolution MUST use isolated deterministic state so toggling
  incidents does not change unrelated signature, passing, opponent, or settlement
  decisions through shifted random consumption.
- **FR-018**: Pre-race UI MUST show incident-risk band, concrete risk sources, and
  legal preparation changes capable of lowering risk, without disclosing whether
  the committed race contains an incident.
- **FR-019**: Consequential events MUST retain stable identity, phase, boundary or
  segment, participants, conditions, Composure before/spent/after, temporary
  change or incident loss, and authoritative time/position before and after.
- **FR-020**: Playback MUST consume retained events in stable authoritative order
  exactly once; playback speed, frame delay, camera, animation, reduced motion,
  and Skip MUST NOT change their existence, order, costs, or settlement.
- **FR-021**: The playback control labeled `1x` MUST use the former `2x` rate and
  target approximately the existing 20-second legacy watch duration; labeled
  `2x` MUST run at twice the new `1x` presentation rate. The former approximately
  40-second rate MUST no longer be selectable. Every new playback MUST default
  to the new `1x`.
- **FR-022**: Full emphasis animation in this feature MUST be limited to player
  signature activation, decisive player-involved Final Push overtakes, and player
  incidents. Other retained events MUST use compact presentation.
- **FR-023**: Reduced-motion presentation MUST replace camera motion, flashes, or
  animated emphasis with static feedback containing equivalent textual meaning.
- **FR-024**: Skip MUST consume the retained event schedule through finish without
  playing emphasis animations, settle once, and preserve a Results summary.
- **FR-025**: Results MUST summarize decisive events and allow inspection of the
  complete consequential event log without recomputing race authority.
- **FR-026**: The deterministic validation corpus MUST cover every entrant,
  generated opponents, supported lap count, phase boundary, native/foreign/mixed
  signature builds, incident-toggle state, and playback mode.
- **FR-027**: Picture-in-picture character cutscenes and their bespoke character
  art MUST NOT be required or generated by Feature 033.
- **FR-028**: Scored and Test Day race presentation MUST provide one basic looping
  engine sound while playback is active. It MUST pause/stop on presentation
  pause, Skip, finish, scene shutdown, and visibility loss as appropriate.
- **FR-029**: Engine playback rate MAY respond to the selected `1x`/`2x` mode or
  retained player pace only within documented audible bounds. Audio clocks and
  callbacks MUST NOT advance, resolve, or modify authoritative race state.
- **FR-030**: Shared enabled UI controls MUST emit concise activation feedback,
  and selection changes MAY emit a distinct selection cue. One semantic action
  MUST emit at most one cue even when artwork and label share the hit target.
- **FR-031**: Disabled controls MUST NOT emit success/activation audio. Missing
  assets or browser playback rejection MUST fail silently while preserving all
  visible feedback, input, navigation, and settlement.
- **FR-032**: A user-visible master sound toggle and bounded effects volume MUST
  apply to engine and UI audio. The preference MAY remain session-local in this
  feature and MUST default to audible only after browser interaction permits it.
- **FR-033**: Audio assets MUST be local/offline-safe, compressed for web use,
  attribution/license-audited, and registered through stable semantic cue IDs
  rather than scene-specific file paths.
- **FR-034**: Engine and UI audio MUST be owned by a presentation-only adapter
  with explicit scene lifecycle cleanup and injectable/mocked tests; simulation,
  playback authority, and retained result schemas MUST NOT depend on Phaser audio.
- **FR-035**: Background music, adaptive score, voice-over, and bespoke character
  vocalizations MUST NOT ship as part of Feature 033.
- **FR-036**: Production track generation MUST use a deterministic circuit
  grammar capable of straights, sweepers, chicanes, hairpins, and
  alternating-direction switchbacks; it MUST NOT constrain every corner in a
  circuit to the same turn direction.
- **FR-037**: Every generated production centerline MUST be closed,
  non-self-intersecting, inside the established race viewport, and satisfy
  documented minimum segment length, curve radius, and nonadjacent-lane
  separation constraints.
- **FR-038**: Track feature classification MUST be derived from retained geometry
  and expose stable feature identities for hairpins, switchbacks, chicanes,
  sweepers, and braking zones without scene-side inference.
- **FR-039**: Braking demand MUST be derived from retained braking zones using
  corner severity, approach length/speed potential, and required speed reduction.
  Production tracks MUST NOT report zero merely because no corner exceeds one
  global angle threshold.
- **FR-040**: Every shipped production track MUST have positive braking demand;
  zero remains legal only for explicit synthetic test fixtures with no required
  deceleration.
- **FR-041**: Track generation MUST remain deterministic from seed, race ordinal,
  and region theme, use bounded candidate attempts/fallbacks, and yield the same
  track identity, segments, points, features, demands, and lap physics across
  preparation, Test Day, contest, replay, Results, and asynchronous viewing.
- **FR-042**: A deterministic corpus gate MUST reject regular-polygon monotony,
  excessive layout similarity, missing feature families, self-intersection,
  insufficient lane separation, zero production braking demand, and divergence
  between displayed characteristics and authoritative physics.

### Key Entities

- **Race Phase**: Opening, Contest, or Final Push assignment with deterministic
  lap boundaries and shared structural behavior.
- **Driver Race Identity**: A passive tendency and named active signature using
  the same schema for player entrants and generated opponents.
- **Signature Eligibility**: Driver-authored relevant stat, tunable threshold,
  committed resolved value, contributing sources, and eligible/ineligible state.
- **Composure Ledger**: Initial race-local budget plus ordered spend entries and
  remaining balance for a participant.
- **Action Window**: Authoritative boundary context in which a signature, attack,
  defense, pass, or incident can be evaluated.
- **Consequential Race Event**: Immutable evidence for an outcome-affecting action
  or incident, including stable identity and before/after authority.
- **Race Enrichment Configuration**: Central validated values and the incident
  feature toggle used for balance and developer tuning.
- **Incident Risk Summary**: Pre-race qualitative band, inspectable sources, and
  safer legal changes without the resolved outcome.
- **Audio Cue**: Stable presentation-only semantic ID for engine-loop and UI
  feedback playback, independent of asset filename and simulation authority.
- **Audio Settings**: Session preference containing mute state and bounded effects
  volume, applied uniformly to race and UI buses.
- **Circuit Geometry**: Deterministic closed centerline plus geometric primitives,
  sampled points, bounds, feature classifications, and validation evidence.
- **Braking Zone**: Retained approach, target corner/sequence, speed-reduction
  requirement, severity, and contribution to aggregate braking demand.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of supported-lap-count fixtures assign every lap to exactly one
  shared phase with stable boundaries across repeated resolution.
- **SC-002**: Replaying or asynchronously viewing identical committed race inputs
  produces byte-equivalent consequential event order and identical settlement in
  100% of deterministic fixtures.
- **SC-003**: Native, foreign, and mixed builds with the same authoritative
  signature stat value produce identical eligibility decisions in 100% of cases.
- **SC-004**: At least 50% of the representative monitored corpus contains one
  consequential event after Opening under the initial tuned configuration.
- **SC-005**: No more than one-third of representative races use a full emphasis
  animation, while all other consequential events remain available through
  compact playback and Results evidence.
- **SC-006**: Enrichment changes the winner in an initial monitored band of
  10–25% of close representative comparisons, while stronger-build performance
  remains the dominant predictor and clearly separated fixtures retain advantage.
- **SC-007**: With incidents disabled, 0 incident events and penalties occur and
  every non-incident deterministic fixture retains identical unrelated decisions.
- **SC-008**: Every consequential event shown at `1x`, `2x`, reduced motion, or
  Results reconciles to one retained authoritative event; zero fabricated passes
  or activations are permitted.
- **SC-009**: New `2x` completes the retained presentation in half the schedule
  time of new `1x`, within normal frame-timing tolerance, without missed or
  duplicated boundaries.
- **SC-009A**: An enriched eight-car, sixteen-lap contest MUST remain within the
  measured pre-playback resolution budget established by the Feature 033
  baseline, with no material delay to playback entry; the planning benchmark
  MUST define and record the numeric tolerance before enrichment is integrated.
- **SC-010**: Incident settlement causes zero persistent inventory, damage,
  credit, reward, or run-history mutations beyond the ordinary race result.
- **SC-011**: Pre-race and Results inspection expose every outcome-determining
  signature, Composure, passing, and incident input required by Constitution
  Principle III without hover, animation, or color-only meaning.
- **SC-012**: In 100% of scored and Test Day lifecycle fixtures, at most one
  engine loop is active and no loop remains after pause/Skip/finish/shutdown.
- **SC-013**: Every tested semantic UI activation emits at most one matching cue;
  muted, disabled, blocked, and missing-asset cases emit no unhandled rejection
  and preserve identical navigation/state transitions.
- **SC-014**: Enabling, muting, blocking, or removing optional audio produces
  byte-identical authoritative race results, retained events, and settlement in
  100% of deterministic comparison fixtures.
- **SC-015**: Across the production track corpus, 100% of circuits are closed,
  in bounds, non-self-intersecting, sufficiently separated, and report positive
  braking demand that reconciles with retained braking-zone evidence.
- **SC-016**: The deterministic corpus contains every required circuit feature
  family and at least one left/right direction change per production track;
  regular-polygon and duplicate-layout similarity gates report zero violations.

## Assumptions

- Existing track identity, resolved vehicle stats, N-car contest evidence,
  playback boundary consumption, Test Day, and async ghost rules are preserved;
  the current polygonal segment generator is replaced behind that authority.
- Exact driver passive/signature content, initial stat thresholds, Composure
  values, time caps, and risk formulas are planning/content-balancing decisions
  constrained by this specification and deterministic corpus gates.
- `Test Day` must expose the new rules so players retain constitutionally required
  low-stakes build-testing access before scored commitment.
- Existing supported lap counts remain 8, 10, 12, 14, and 16.
- The current static, serverless demo boundary remains valid; Feature 033 adds no
  account, matchmaking, or live multiplayer dependency.
- Basic engine/UI sound assets can be authored or sourced under repository-safe
  licenses; background music is not required for acceptance.

## Out of Scope

- Live player input or manual ability activation during a contest.
- Live opponent resolution or synchronous matchmaking.
- Unequal stock physical stats or additional capacity by entrant.
- Persistent damage, repair economy, retirement, disqualification, confiscation,
  fines, item loss, or race-to-race Composure.
- Bespoke picture-in-picture character cutscenes or a new character-action asset
  production pipeline.
- Background music, adaptive score, voice-over, or bespoke character vocalizations.
- New between-race encounter families, owned by Feature 034.
- Whole-game layout/card/location/vocabulary polish, owned by Feature 035.
