# Feature Specification: Build Testing Access - Test Day

**Feature Branch**: `011-build-test-day`

**Created**: 2026-08-08

**Status**: Ready for implementation

**Input**: User description: "Provide a low-stakes Test Day during preparation so players can test the current build against a deterministic sample contest, inspect transparent lap and item/buff contributions, and return without changing the scored run. This is the constitutional prerequisite for feature 010."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Test the current build before it counts (Priority: P1)

During an active run, a player can enter a clearly labeled **Unscored Test Day** from a stable preparation surface or the briefing before a scored race. Starting Test Day locks the current build as an immutable practice snapshot, runs a disclosed deterministic sample contest without outcome-changing input, and returns the player to the exact preparation context they left.

**Why this priority**: This is the minimum capability required by Constitution Principle V. It lets a player learn from the build before committing it to scored competition while preserving Prepare -> Contest integrity.

**Independent Test**: From an active preparation state, capture all run and preparation data, complete Test Day, return, and prove that the captured data is identical while a complete unscored practice result was produced.

**Acceptance Scenarios**:

1. **Given** an active run on a stable preparation surface, **When** the player opens Test Day, **Then** the screen labels it Unscored, identifies the current build snapshot, discloses the sample rival and 10-lap configuration, and explains that no run rewards, penalties, or progress will occur.
2. **Given** the player confirms Start Test, **When** practice playback begins, **Then** the locked snapshot resolves to completion without steering, tuning, item movement, or any other outcome-changing input.
3. **Given** Test Day finishes, **When** the player returns, **Then** they arrive at the preparation surface and state they left with credits, stage, encounter, sponsor, offers, build, storage, history, and next scored opponent unchanged.
4. **Given** the same locked build snapshot, fixed sample rival, lap count, and simulation inputs, **When** Test Day is repeated, **Then** its deterministic contest/evidence projection is exactly equal, excluding session IDs, result IDs, navigation identity, timestamps, and all other non-simulation metadata.
5. **Given** the player cancels before playback or leaves during playback, **When** preparation resumes, **Then** they return to the exact origin preparation encounter and navigation context unchanged, with no completed practice result or run mutation caused by the cancelled attempt.

---

### User Story 2 - Understand why the test produced its result (Priority: P1)

During and after Test Day, the player can inspect the exact numbers that explain the result: player and rival lap times, running and final gap, every consequential item firing, direct contribution, buff contribution, and the relationship between those contributions and the final time. Practice results use the same contest facts as scored playback and results rather than a simplified estimate.

**Why this priority**: Principle V makes testing useful only when paired with Principle III transparency. An unexplained win or loss does not help the player improve a build.

**Independent Test**: Complete a controlled Test Day with direct, recurring, flat-buff, stacking-buff, count-buff, and storage-active effects where available, then reconcile every displayed contribution against each lap and the final total.

**Acceptance Scenarios**:

1. **Given** an item changes a practice lap, **When** the player inspects that lap, **Then** the responsible item, trigger lap, signed numeric contribution, and resulting player lap time are visible without relying on hover.
2. **Given** a buff changes another item's contribution, **When** the player inspects the result, **Then** the buff source, affected item, applied amount, and whether the buff was flat, stacking, count-based, or storage-active are distinguishable.
3. **Given** a build effect has no consequence in the test, **When** the player inspects that item, **Then** the result reports zero contribution or the unmet trigger/cooldown reason rather than omitting the item ambiguously.
4. **Given** the player reviews the completed test, **When** all lap values and contributions are summed, **Then** they reconcile exactly to the displayed player total, rival total, final gap, and outcome.
5. **Given** a later build model supplies Fitted, Flexible, or Improvised installation behavior, **When** that behavior changes a test event, **Then** Test Day identifies the installation state, authored behavior, and resulting contribution from the locked practice data.

---

### User Story 3 - Iterate and compare build changes (Priority: P2)

After returning from a completed Test Day, the player can change the build during normal preparation and test again. The newest result may be compared with the immediately previous completed Test Day from the same active run so the player can see changes in total time, lap pattern, gap, outcome, and item/buff contributions.

**Why this priority**: Repeated experimentation is the practical value of build testing. A lightweight comparison helps players connect a preparation decision to its consequence without turning practice into persistent run history.

**Independent Test**: Complete one Test Day, change exactly one item or item location through normal preparation, complete another test, and verify the comparison attributes every changed value to the two locked snapshots while run history remains unchanged.

**Acceptance Scenarios**:

1. **Given** a completed Test Day, **When** the player returns to preparation, changes the build, and starts another test, **Then** the new test uses a new immutable snapshot and the prior result cannot affect resolution.
2. **Given** two completed tests in the same active run, **When** the second result is inspected, **Then** the player can compare build contents, total time, final gap, outcome, per-lap times, and item/buff contributions between the tests.
3. **Given** two identical practice snapshots, **When** they are compared, **Then** every numeric delta is zero.
4. **Given** the player begins a new run, completes or abandons the current run, or loses the active run context, **When** Test Day is opened later, **Then** prior presentation-local practice comparisons are not treated as part of the new or recovered run.

---

### User Story 4 - Understand when Test Day is available (Priority: P2)

Test Day is reachable through mouse, touch, and keyboard during preparation, and every unavailable state explains why testing cannot start. Practice remains visually and semantically distinct from a scored PvP contest before, during, and after playback.

**Why this priority**: A core testing tool must be discoverable and must not let players mistake practice for a scored contest or bypass phase boundaries.

**Independent Test**: Check every run phase and supported viewport with mouse, touch, and keyboard; verify that Test Day is either operable or visibly unavailable with the correct reason and that all required information remains reachable.

**Acceptance Scenarios**:

1. **Given** an active run at the run hub, a stable acquisition preparation view, or a scored-race briefing that has not started, **When** the player reaches Test Day, **Then** the action is available without completing or changing the current encounter.
2. **Given** no valid active run/build, an unresolved transaction or replacement confirmation, contest playback, scored result settlement, run summary, or completed/unavailable run state, **When** Test Day is shown, **Then** it is disabled or absent and the nearest relevant surface explains the reason.
3. **Given** practice briefing, playback, or result review, **When** the player views the screen, **Then** Unscored/Test Day labeling and the absence of purse, sponsor resolution, and progression are explicit and not communicated by color alone.
4. **Given** keyboard-only or touch-only input, **When** the player enters, inspects, exits, and repeats Test Day, **Then** every required action and value is available without hover, precision dragging, or outcome-changing playback input.
5. **Given** any required target viewport, **When** Test Day is used, **Then** primary actions, labels, lap data, and contribution details remain visible or intentionally reachable without horizontal clipping.

### Edge Cases

- An empty active build remains testable and produces the deterministic baseline result with an explicit empty-build contribution state.
- A build containing only stored items distinguishes inactive storage from item-authored active-while-stored contributions.
- Ties, extreme minimum lap times, positive time modifiers, zero-value effects, and multiple effects on one lap remain inspectable and reconcile exactly.
- Starting Test Day twice through rapid or repeated activation creates one practice session and one immutable snapshot, not concurrent resolutions.
- A preparation mutation attempted after Start Test cannot enter the locked snapshot; it is rejected or deferred until preparation resumes.
- Changing presentation speed, pausing presentation, reducing motion, resizing, backgrounding, or changing input method cannot alter practice resolution.
- Canceling, leaving, or reloading during playback does not settle a scored encounter, award currency, resolve a sponsor, advance a stage, or replace the next opponent. Cancel or valid recovery returns to the exact unchanged origin preparation encounter and navigation context, including its encounter identity, payload, selection, offers, and restock state; an invalid origin shows an unavailable recovery state rather than returning elsewhere.
- Missing, corrupt, or mismatched practice context never creates a fresh run, chooses a different opponent, or falls through to scored result settlement.
- A current preparation encounter with unsaved selection, drag, purchase, restock, sponsor, or eviction state cannot be silently committed or cancelled by entering Test Day; entry waits for a stable state or is unavailable with a reason.
- A future topology-aware build may add installation-state attribution to practice, but the absence of topology before feature 010 must not invent Fitted or Improvised effects.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide Test Day as low-stakes build testing during an active run before a scored PvP contest is committed.
- **FR-002**: Test Day MUST be available from the run hub, a stable preparation/acquisition surface, and a scored-race briefing before Start Race; entry MUST preserve the exact origin surface and navigation context for return.
- **FR-003**: Test Day MUST be unavailable when no valid active run and build exist, while an outcome-changing preparation transaction is unresolved, during contest playback, during scored result settlement, or after the run is completed or unavailable. Every visible disabled state MUST state its reason.
- **FR-004**: Test Day briefing, playback, result, and comparison MUST visibly and accessibly identify the session as **Unscored** and distinguish it from PvP run history.
- **FR-005**: Starting Test Day MUST capture an immutable snapshot of the current active build and all effect-relevant item state. Later preparation changes MUST NOT alter that session's inputs or result.
- **FR-006**: The initial sample contest MUST use the disclosed control rival `ghost-001`, a fixed pace of 5.85 seconds per lap, and exactly 10 laps. The rival MUST be identified as a deterministic sample rival rather than a live or scored PvP opponent.
- **FR-007**: For an identical locked build snapshot, fixed `ghost-001` rival, 10-lap count, and simulation inputs, Test Day's contest result and playback facts MUST be exactly equal to those produced by a direct invocation of the authoritative scored contest resolver. This scored-rule equivalence MUST NOT grant the practice result any scored settlement, progression, economy, sponsor, history, or analytics effect.
- **FR-008**: Test Day MUST resolve only from the locked practice snapshot, disclosed sample rival, and disclosed lap configuration, with no randomness, live opponent dependency, or presentation-state input.
- **FR-009**: Practice playback MUST accept no steering, tuning, item movement, item activation, or other outcome-changing input. Presentation-only controls MAY pause, change playback speed, skip completed animation, or reduce motion without changing the resolved result.
- **FR-010**: A completed practice result MUST expose player and rival total times, signed final gap, outcome, every player and rival lap time, and all consequential item and buff events with signed numeric contributions.
- **FR-011**: Contribution inspection MUST identify each effect source, trigger lap, trigger/cooldown state, base contribution, buff adjustment, resulting contribution, and storage-active state where applicable. An item with no contribution MUST expose zero contribution or an unmet-condition reason.
- **FR-012**: Displayed lap times, effect contributions, total times, gap, and outcome MUST mathematically reconcile with the immutable practice result; presentation MUST NOT independently recalculate competing values.
- **FR-013**: Required practice information MUST remain inspectable without hover and MUST preserve the same facts during playback, result review, and reduced-motion presentation.
- **FR-014**: When the active build model includes Fitted, Flexible, or Improvised states, Test Day MUST display any consequential installation state, authored behavior, and numeric contribution from immutable practice data. This requirement MUST NOT create topology behavior before feature 010 defines it.
- **FR-015**: Completing, canceling, or leaving Test Day during briefing, playback, or result review MUST return to the exact origin preparation encounter and navigation context unchanged, including encounter identity, payload, current selection, offers, stock, purchases, restock state, and focus target where applicable. Return MUST NOT grant or spend credits, advance or complete a stage or encounter, resolve or replace a sponsor contract, accept or reroll offers, move or change items, change storage, add scored history, record a scored win/loss/tie, or change the next scored opponent.
- **FR-016**: Test Day MUST NOT invoke scored-contest settlement, participation purse, win bonus, sponsor evaluation, encounter completion, run-summary progression, or scored analytics.
- **FR-017**: Players MUST be able to repeat Test Day any number of times while the active run remains in an eligible preparation state.
- **FR-018**: Each repeated test MUST create a fresh immutable snapshot. For identical snapshots, fixed sample rival, lap count, and simulation inputs, a defined deterministic contest/evidence projection MUST be exactly equal across runs. That projection MUST include contest outcome, player and rival totals, signed gap, every lap fact, playback fact, and item/buff contribution fact, and MUST exclude session IDs, result IDs, navigation identity, timestamps, and all other non-simulation metadata. Full practice envelopes with intentionally unique metadata are not required to be byte-equal. Build changes MUST affect only subsequent tests.
- **FR-019**: The completed result MAY retain the immediately previous completed Test Day from the same active run for comparison. Comparison MUST show snapshot contents, total time, gap, outcome, per-lap changes, and changed item/buff contributions, and MUST remain presentation-local rather than run history.
- **FR-020**: Practice comparison data MUST be cleared when its run ends, is abandoned, becomes unavailable, or is replaced by a new run; its presence or absence MUST NOT alter simulation or run state.
- **FR-021**: Missing or inconsistent run, return, snapshot, rival, or practice-result context MUST show an explicit unavailable/recovery state and MUST NOT silently create a run, substitute inputs, settle a scored encounter, or mutate the next opponent.
- **FR-022**: Test Day entry, briefing, playback inspection, result inspection, comparison, return, and repeat actions MUST be operable with mouse, touch without hover or precision dragging, and keyboard with visible focus.
- **FR-023**: Unscored, selected, focused, disabled, unavailable, changed, improved, and worsened states MUST use text, icon, or structure in addition to color.
- **FR-024**: At 1920x1080, 1366x768, 1024x768, and 390x844, Test Day controls and required evidence MUST be visible or reachable through intentional vertical flow with zero horizontal page scrolling and zero clipped interaction targets.
- **FR-025**: Supporting text MUST render at no less than 14 CSS pixels and interactive labels at no less than 16 CSS pixels at final display size; long item names and contribution labels MUST not overlap values or controls.
- **FR-026**: Feature acceptance MUST retain evidence proving: identical repeated practice inputs produce exactly equal deterministic contest/evidence projections as defined by FR-018; direct authoritative scored-resolver invocation produces exactly equal contest results and playback facts as Test Day for equivalent inputs; every displayed result reconciles; practice accepts no outcome-changing playback input; and all protected run fields are deeply equal before entry and after return.
- **FR-027**: The protected-state evidence for FR-026 MUST include run identifier and seed, status, stage index and stage states, available choices, active encounter and payload, credits and transactions, sponsor contract, offers and their states, active build and storage, run history, next scored opponent identity/configuration, and scored-result count.
- **FR-028**: Any failed protected-state equality, deterministic replay, contribution reconciliation, or phase-integrity check MUST block completion of this feature and MUST keep feature 010 blocked.
- **FR-029**: Feature 010 MUST remain blocked until retained evidence records PASS for every P1 acceptance scenario; deterministic projection equality; authoritative scored-resolver contest/playback equivalence; contribution reconciliation; outcome-input invariance; complete protected-state and zero-settlement/progression equality; valid interruption recovery and invalid-recovery integrity; keyboard-only, touch-only, visible-focus, no-hover, and reduced-motion acceptance; all four required viewports; full automated tests; build; lint; and the complete evidence index. Every required row MUST identify the acceptance case, command or browser procedure, result, and retained artifact. Feature 010 MUST subsequently preserve this Test Day contract and add installation-state attribution where its topology affects outcomes.
- **FR-030**: This feature MUST NOT add live matchmaking, real-player ghost recording, run rewards or penalties for practice, a configurable practice sandbox, opponent selection, lap-count selection, build editing inside Test Day, topology mechanics owned by feature 010, or a broader title/menu/visual overhaul.

### Key Entities

- **Test Day Availability**: A derived preparation-state decision indicating whether practice can start, the return destination, and a user-facing unavailable reason when it cannot.
- **Practice Session**: One unscored attempt associated with an active run for navigation only; records its immutable inputs, lifecycle state, and return context without becoming a run encounter or scored-history entry.
- **Locked Practice Build**: An immutable copy of all active and stored items and effect-relevant state at Start Test. It is separate from the mutable preparation build.
- **Sample Rival Configuration**: The disclosed non-live control rival and lap rules used for every initial Test Day: `ghost-001`, 5.85 seconds per lap, 10 laps.
- **Practice Result**: The immutable output of one sample contest, including outcome, totals, gap, lap breakdown, and item/buff contribution evidence. It carries no settlement or progression authority.
- **Contribution Evidence**: An inspectable explanation linking an item or buff source and its trigger state to a signed numeric effect on a specific lap and the final result.
- **Practice Comparison**: An optional presentation-local pairing of the latest two completed practice snapshots/results from one active run. It is not persisted as run history and cannot affect resolution.
- **Protected Run State**: The complete scored-run data that Test Day may observe for context but may not mutate, including progression, economy, sponsors, offers, build/storage, history, and next opponent.
- **Principle V Acceptance Evidence**: Retained test and review evidence demonstrating deterministic practice, transparent reconciliation, input-free playback, repeated access, and exact protected-state equality.

### Dependencies and Release Gate

- Feature 009 run progression supplies the active run, preparation surfaces, credits, stages, encounters, sponsors, scored history, and scheduled PvP context that Test Day must preserve.
- The existing deterministic contest and watched-playback capabilities supply the authoritative practice rules and facts; Test Day does not define a parallel simulation.
- This feature is the mandatory Build Testing Access slice required by Constitution Principle V and `specs/visual-overhaul.md` UI-FR-022/UI-FR-023.
- Feature 010 implementation and release remain blocked until the Principle V Acceptance Evidence in FR-026 through FR-029 passes. Once unblocked, feature 010 must preserve this feature and extend contribution evidence for consequential Fitted/Flexible/Improvised behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Browser acceptance MUST count and retain the deliberate actions required to open Test Day, start the test, and return to the exact origin; expanding or scrolling result evidence does not count. Each of these four concrete preparation contexts MUST require no more than four such actions: Supplier with an offer selected, Supplier without an offer selected, Reward Draft with a reward selected, and Reward Draft without a reward selected. The retained row for each context MUST record its starting state, ordered action count, exact return encounter/selection, and PASS/FAIL result.
- **SC-002**: Across at least 100 repeated resolutions of each of three controlled snapshots (empty, direct-item, and buff-dependent), identical locked snapshots, fixed rival, lap count, and simulation inputs produce exactly equal FR-018 deterministic contest/evidence projections in 100% of runs; unique IDs, navigation identity, timestamps, and other non-simulation envelope metadata are excluded from comparison.
- **SC-003**: For every controlled direct, recurring, flat-buff, stacking-buff, count-buff, and storage-active case available in the playable catalog, 100% of displayed lap contributions reconcile exactly to displayed lap and total times with zero unexplained outcome-changing modifiers.
- **SC-004**: Across win, loss, tie, empty-build, interrupted-playback, and repeated-test cases, 100% of protected run-state fields listed in FR-027 are deeply equal immediately before Test Day and after return.
- **SC-005**: Test Day produces zero credit transactions, sponsor resolutions, encounter completions, stage advances, offer mutations, build/storage mutations, scored-history entries, scored outcomes, or next-opponent changes across all acceptance cases.
- **SC-006**: During practice playback, 100% of attempted steering, tuning, item, build, sponsor, encounter, and other outcome-changing inputs leave the locked result unchanged; presentation-only controls produce the same final facts.
- **SC-007**: After one normal build change between tests, the second result compares both snapshots and correctly reports 100% of changed totals, lap values, outcomes, and item/buff contributions; identical snapshots report zero numeric deltas.
- **SC-008**: In a moderated test with at least 5 representative players, at least 90% correctly explain which item or buff caused the largest consequential change and correctly state that the session did not affect their scored run without external instruction.
- **SC-009**: Keyboard-only and touch-only users can complete entry, start, playback inspection, result inspection, comparison, return, and repeat with 100% of required facts available without hover or precision dragging.
- **SC-010**: At 1920x1080, 1366x768, 1024x768, and 390x844, Test Day has zero horizontal page scrolling, zero clipped interaction targets, and all required evidence is reachable in a coherent reading order.
- **SC-011**: Feature 010 remains blocked unless one retained gate index contains PASS rows for: every P1 acceptance scenario; SC-001 through SC-006; FR-018 deterministic projection equality; FR-007 direct authoritative scored-resolver contest/playback equivalence; contribution reconciliation; outcome-input invariance; complete protected-state equality and zero progression/economy settlement; valid interruption recovery and corrupt/version/run/origin-mismatch recovery integrity; keyboard-only, touch-only, visible-focus, no-hover, and reduced-motion acceptance; each of the four FR-024 viewports; full automated tests; build; lint; and every required evidence artifact. Each row MUST name the test or procedure and link its retained result; one missing or failed row makes the overall gate FAIL.

## Assumptions

- A scored contest is committed only when the player explicitly starts it. The run hub and race briefing remain preparation until that action.
- The initial Test Day deliberately uses the current sample control rival (`ghost-001`, 5.85 seconds per lap) and 10 laps so every build is tested against one stable benchmark. Broader practice configuration is unnecessary for the constitutional minimum.
- The current full-telemetry policy remains authoritative: every build receives complete practice data. Making telemetry visibility a build choice remains an open vision question and is not adopted here because it would weaken Principle V evidence.
- Test Day is not a run encounter. Its temporary navigation and comparison data have no economic, progression, sponsor, opponent-selection, or scored-history meaning.
- Practice result comparison is limited to the latest two completed tests in the same active run. Durable cross-session practice history is unnecessary for useful iteration and would create avoidable run-state ambiguity.
- Preparation entry requires a stable committed state. The player completes or cancels any in-progress purchase, restock, drag, replacement, sponsor selection, or similar transaction before testing.
- The current feature can explain direct items and shipped buff forms. Feature 010 owns topology and authored Fitted/Flexible/Improvised behavior; when that later behavior becomes consequential, Test Day must consume and display it without changing this feature's unscored-state contract.
- The project remains a 2D async auto-battler. Test Day uses a recorded sample rival and never introduces live opposition.

## Out of Scope

- Rewards, costs, achievements, sponsor credit, progression credit, scored records, leaderboards, or matchmaking effects from Test Day.
- Live opponents, real-player ghost capture, opponent browsing, or network availability as a prerequisite for practice.
- Selecting or editing the rival, lap count, track, seed, rules, or individual effect triggers.
- Editing, tuning, buying, selling, moving, storing, or evicting items during Test Day briefing, playback, or result review.
- Power/Chassis/Flex topology, authored Fitted/Improvised item migration, entrant selection, or named-vehicle garage work owned by feature 010.
- Durable practice history, sharing practice replays, export, analytics dashboards, automated build recommendations, or optimization scoring.
- Title-menu Test Day access without an active run/build, global settings work beyond respecting available accessibility/presentation preferences, and the broader visual-overhaul release.