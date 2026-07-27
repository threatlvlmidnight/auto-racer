# Feature Specification: Item Pool & Performance-Identity Draft Weighting

**Feature Branch**: `003-item-pool-draft`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "Expand the offered item pool to 10-20 distinct items with identity tags, and define the Performance team identity so its draft is weighted toward performance-tagged items"

## Clarifications

### Session 2026-07-26

- Q: Which team identity vector should this feature define first? → A: Performance (draws toward car/performance-tagged items — raw stats, handling, top speed). The other identities floated in `specs/vision.md` (Driver/Strategy, Unsportsmanlike/Scoring) remain future work.
- Q: Should the pool carry tags for all three future identities now, or only tag items relevant to the one identity being implemented? → A: Only tag items relevant to Performance. Every other item in the pool is untagged/neutral for this feature; retrofitting tags for the other two identities is deferred to whichever feature actually implements them.
- Q: Should items stay single-effect (only ever a direct time modifier, varying by magnitude/name), or introduce genuinely different effect types? → A: Introduce one minimal new effect type now — a **buff item** that doesn't modify time directly but instead boosts the magnitude of other currently-held items sharing its target identity tag, computed once at build-resolution (no per-lap ticking). The owner's fuller vision — races modeled as a scaling number of laps, with each item having its own cooldown and applying its effect every lap/tick (a Bazaar-style time/cooldown resolution model) — is a much larger change to the contest-simulation architecture established in `001-core-loop`/`002-item-slots` (single computed time delta, resolved once). That fuller direction is deliberately **not** built here; it's recorded in `specs/vision.md` ("Item effects & simulation depth") and `specs/DEFERRED.md` for a dedicated future feature.
- Q: How strongly should the draft favor performance-tagged items over neutral ones? → A: Roughly 75% performance-tagged / 25% neutral — a clear, fixed illustrative ratio for this feature (not a locked balance number; may change once a second identity exists to weigh against).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A real pool of distinct items exists to draft from (Priority: P1)

Instead of the 5 abstract "buff" items from `002-item-slots` (interchangeable aside from their numeric magnitude), the player draws from a pool of 10-20 items that read as distinct things — each with its own name and its own effect magnitude — giving prepare-phase decisions actual content to reason about instead of a series of near-identical numeric choices.

**Why this priority**: Every later story in this feature depends on there being enough real, distinguishable content to draw from and tag. Without this, "identity-weighted" has nothing meaningful to weight between.

**Independent Test**: Play through enough prepare-phase rounds to see a double-digit number of distinct offers across repeated runs, and confirm no two items in the pool share a name or an effect magnitude.

**Acceptance Scenarios**:

1. **Given** the item pool, **When** it is inspected, **Then** it contains at least 10 and at most 20 items, each with a unique name and a unique effect magnitude.
2. **Given** a sequence of prepare-phase offers across a run, **When** the player reviews what they were offered, **Then** each offer is drawn from this expanded pool rather than the old 5-item placeholder set.

---

### User Story 2 - Performance identity biases the draft (Priority: P1)

The player's team carries the Performance identity. When offered items during the prepare phase, they see performance-tagged items noticeably more often than untagged (neutral) items — the draft is visibly biased toward their identity, not a uniform random or fixed-cycle draw across the whole pool.

**Why this priority**: This is the actual point of the feature — proving that identity can express itself through what a team is offered, per `specs/vision.md`'s "Draft / acquisition system." Without this, expanding the pool (User Story 1) is content work with no mechanical payoff.

**Independent Test**: Run a large sample of simulated offers for a Performance-identity build and confirm performance-tagged items are drawn substantially more often than neutral items, while neutral items still appear at least occasionally (never reduced to zero).

**Acceptance Scenarios**:

1. **Given** a Performance-identity build and the expanded item pool, **When** the system selects an item to offer, **Then** a performance-tagged item is selected more often than a neutral item, across a large enough sample to be measurable.
2. **Given** the same setup, **When** many offers are sampled, **Then** neutral (untagged) items are still selected sometimes — the weighting biases the draw, it does not exclude the rest of the pool.
3. **Given** an offer that was drawn, **When** the player views it, **Then** they can see whether it is performance-tagged or neutral — the weighting is visible, not hidden math (Constitution Principle III).

---

### User Story 3 - Held and offered items show their identity tag (Priority: P2)

Anywhere the player currently sees an item — in an offer, or in their held build — they can also see its identity tag (or that it's neutral/untagged), consistent with `002-item-slots`'s existing build-state legibility.

**Why this priority**: Directly extends `002-item-slots` User Story 3 (build state legibility) to cover the new identity dimension. Lower priority than Stories 1-2 because the weighting can be built, tested, and demonstrated (e.g., via simulation output or logs) before the UI necessarily surfaces it — but it's still needed before this feature can be called complete, per Constitution Principle III.

**Independent Test**: At any offer or build-review point, confirm the identity tag (or "neutral") of every visible item is shown as plain, readable state, not something inferred from behavior.

**Acceptance Scenarios**:

1. **Given** an offered item, **When** the player views the offer, **Then** its identity tag (performance or neutral) is displayed alongside its name and effect.
2. **Given** a build with held items, **When** the player views their current build, **Then** each held item's identity tag is displayed the same way.

---

### User Story 4 - A buff item rewards pairing by tag (Priority: P2)

At least one item in the pool is a **buff item**: instead of adjusting race time itself, it increases the effect of other currently-held items that share its target identity tag. Holding a buff item alongside a matching-tag item produces a better outcome than holding either one alone, giving the player their first taste of build synergy — items that read differently depending on what else is in the build, not just a bag of interchangeable numbers.

**Why this priority**: This is genuinely new depth (the first item whose value depends on the rest of the build), but it's additive to Stories 1-2 — the pool-expansion and identity-weighting mechanics both work correctly with or without it. Priority matches Story 3's legibility work rather than the P1 stories.

**Independent Test**: Assemble a build holding a buff item and a held item matching its target tag; confirm the contest outcome is measurably better than an otherwise-identical build holding only one of the two.

**Acceptance Scenarios**:

1. **Given** a build holding a buff item and a held item sharing the buff's target tag, **When** the contest resolves, **Then** the tagged item's effect is boosted by the buff's percentage, producing a different (better) outcome than without the buff.
2. **Given** a build holding a buff item but no other held item shares its target tag, **When** the contest resolves, **Then** the buff item has no effect — this is a legitimate, inert state, not an error.
3. **Given** an offered or held buff item, **When** the player views it, **Then** its target tag and boost percentage are shown as plainly as any other item's effect (Constitution Principle III).

---

### Edge Cases

- What happens if the weighted draw is asked to offer an item and, by chance, draws the same item already offered earlier in the same run? (Repeats are permitted by default in this feature — item uniqueness-per-run rules remain out of scope, same as `002-item-slots`'s Assumptions.)
- What happens if every neutral item has already been offered and only performance-tagged items remain interesting to draw? (Not a real edge case at this pool size — the pool is large enough, and repeats are permitted, that the draw never needs to "run out.")
- What happens to the existing 5 items from `002-item-slots`'s `ITEM_POOL`? (They are folded into the new, larger pool rather than discarded — see Assumptions — to preserve continuity, matching how `002-item-slots` itself reused `001-core-loop`'s original item.)
- What happens if a buff item is held with no matching-tag item? (Inert, legitimate, no error — see User Story 4, Acceptance Scenario 2.)
- What happens if more than one buff item targeting the same tag is held at once? (Their boosts stack additively by default in this feature — exact stacking curves/diminishing returns are a balance concern for planning, not this spec.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an item pool of at least 10 and at most 20 items, each with a unique `id`, a unique display name, and an effect magnitude (a time-modifier value for direct items, or a boost percentage for the buff item(s) per FR-009) that is unique within its own category — no two items produce identical outcomes.
- **FR-002**: Item names MUST read as distinct in-fiction things (e.g., a named component or upgrade) rather than as generic labels like "Minor Adjustment" — placeholder flavor is acceptable since theme is still undecided (constitution `TODO(THEME)`), but names must be individually distinguishable in a way a spectator could refer to by name.
- **FR-003**: Each item in the pool MUST carry either the "performance" identity tag or no tag (neutral) — no other tag values exist in this feature.
- **FR-004**: The system MUST define exactly one team identity, "Performance," as the only selectable/active identity in this feature. Team-identity selection UI and additional identities are out of scope (see Assumptions).
- **FR-005**: When selecting an item to offer to a Performance-identity build, the system MUST weight the selection so performance-tagged items are chosen approximately 75% of the time and neutral items approximately 25% of the time, never reducing the chance of a neutral item to zero.
- **FR-006**: The system MUST display each offered and held item's identity tag (or "neutral") alongside its existing name/effect presentation, per Constitution Principle III.
- **FR-007**: The system MUST NOT change the flat slot cap, eviction rules, or any other mechanic already established in `002-item-slots` — this feature only changes what pool items are drawn from and how the draw is weighted.
- **FR-008**: The system MUST replace `002-item-slots`'s fixed, cyclic offer order with the weighted random selection described in FR-005 — offers are no longer deterministic based on round number.
- **FR-009**: The item pool MUST include at least one buff item whose effect is not a direct time modifier but instead increases the magnitude of other currently-held items sharing its target identity tag, by a defined percentage, computed once during build resolution — not per-lap or per-tick (see Assumptions).
- **FR-010**: A held buff item with no other held item sharing its target tag MUST have no effect on the outcome — this is a valid, non-error state.

### Key Entities

- **Item** (extends `002-item-slots`'s `OfferedItem`): adds an identity tag field, valued `"performance"` or absent/neutral, alongside its existing id, name, and effect magnitude.
- **Buff Item** (a specialization of Item): in place of a direct time-modifier magnitude, carries a boost percentage; at build-resolution, it increases the time-modifier magnitude of every other held item sharing its own identity tag (its target tag is its own performance/neutral tag from FR-003 — a buff item does not introduce a second, independent tag dimension). Like any item, it counts toward the FR-005 draft-weighting split under its own tag.
- **Item Pool**: the full set of 10-20 items, expanded from `002-item-slots`'s 5-item placeholder set, mixing performance-tagged, neutral, and buff items.
- **Team Identity**: a named identity ("Performance," the only one implemented here) that determines draft weighting. Not yet a player-facing selection — hardcoded as the active identity for this feature.
- **Weighted Draw**: the selection rule that, given a team identity and the item pool, picks one item per offer with a bias toward that identity's tagged items.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The item pool contains between 10 and 20 items, no two of which share a name or produce an identical effect.
- **SC-002**: Across a sample of 100 simulated offers to a Performance-identity build, performance-tagged items are selected approximately 75 times and neutral items approximately 25 times (within reasonable sampling variance), and neutral items are never selected zero times.
- **SC-003**: A player can identify the identity tag of any offered or held item by looking at it, without needing to infer it from its name or effect.
- **SC-004**: Two runs that happen to draw the identical sequence of items produce identical contest results against the same ghost — outcome determinism from `002-item-slots`'s SC-004 is preserved; only the draw that produces the sequence is new.
- **SC-005**: A build holding a buff item together with a matching-tag item produces a measurably different (better) contest outcome than an otherwise-identical build holding only one of the two.

## Assumptions

- Only one team identity ("Performance") exists after this feature. Driver/Strategy and Unsportsmanlike/Scoring (`specs/vision.md`) remain future work, including whatever UI lets a player choose their identity at all — this feature hardcodes Performance as the only build in play.
- The 75%/25% weighting ratio (Clarifications) is an illustrative default for this feature, not a locked balance number — it may change once there's more than one identity to balance against.
- The split of the 10-20 item pool between performance-tagged and neutral items is a content decision for planning/implementation, not fixed here, so long as both categories are non-trivially represented (enough neutral items to matter, enough tagged items to feel identity-driven).
- `002-item-slots`'s original 5 items are reused as part of the expanded pool (continuing that feature's own precedent of reusing `001-core-loop`'s item) rather than replaced outright.
- Item synergy beyond the single buff item in User Story 4 (richer combos, multiple synergy axes) and the real run/encounter structure remain out of scope, per `specs/DEFERRED.md` — this feature only touches what's offered, how it's weighted, and this one tag-based buff, not when or how many offers make up a run.
- The buff item's boost is computed once at build-resolution time, within the existing single-adjustment contest model from `001-core-loop`/`002-item-slots`. A lap-based race model — a race as a scaling number of laps, each item carrying its own cooldown and applying its effect every lap/tick (Bazaar-style) — is explicitly out of scope: it would replace the core contest-resolution architecture, not extend the item pool. Tracked in `specs/vision.md` ("Item effects & simulation depth") and `specs/DEFERRED.md`.
- Buff stacking (multiple buff items targeting the same tag) resolves additively by default; tuning exact stacking behavior/diminishing returns is left to planning.
- Real theme/flavor (constitution `TODO(THEME)`) is still undecided; item names in this feature are placeholder flavor chosen to feel like distinct things, not a commitment to final naming.
- Occasional cross-identity item rolls (vision.md's "reward for creative/hybrid deck-building") are not distinct from this feature's neutral-item draws, since only one identity exists — that richer version of the idea (rolling another identity's *tagged* items) applies once a second identity exists to roll from.
