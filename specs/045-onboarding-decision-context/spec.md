# Feature Specification: Onboarding and Decision Context

**Feature Branch**: `[045-onboarding-decision-context]`  
**Created**: 2026-08-17  
**Status**: Implementation-ready — analyzed; coding not started  
**Input**: Ship a short-term static How to Play deck, make Improvised placement
immediately scannable, show visual regional stat demands during every item-
acquisition decision, and temporarily hide Test Day entry points without
removing its implementation.

## Clarifications

### Session 2026-08-17

- Q1 (owner amendment): The desired long-term onboarding is a Bazaar-style
  authored full run with limited real picks and tuned-down opponents so the
  player experiences a successful build “pop off.” That is a larger protected
  follow-up. Feature 045 V1 ships a static, skippable How to Play slide deck.
- Q2: The V1 deck runs in a separate deterministic, non-scoring workshop/help
  scene and never overlays or mutates a real championship.
- Q3: Completion and Skip are versioned local preferences. Skip is available
  from the first slide. Replay remains available later through Settings.
- Q4: The deck explains the full current build system—topology, storage,
  placement comparison, Synergy, adjacency, duplicate tiers, Workshop
  Modifications, Loot, acquisition, automatic racing, and Results—but does not
  teach Test Day. Test Day remains in code and tests but all normal player-facing
  entry points are hidden for now.
- Q5: Improvised uses a large persistent badge/icon at compact level; exact
  active/lost behavior remains in the existing inspector order. No extra
  confirmation modal or warning band is added.
- Q6: Even with no additional mismatch consequence, the large `IMPROVISED`
  state remains and details explicitly say `No additional mismatch effect` and
  name any lost Fitted benefit.
- Q7: Acquisition shows a stable regional tendency and, only when already
  retained and validated, a separate exact next-race demand snapshot. It never
  generates a circuit solely to populate a scene.
- Q8: The shared demand model appears on every typed item-acquisition surface.
- Q9: Demand uses the four canonical stats, qualitative labels first, exact
  normalized 0–100 values in details/accessibility text, and a visual four-axis
  profile. Code owns axes, polygon/lines, markers, labels, and fallback. An
  optional decorative period instrument plate may be supplied separately by the
  frontier asset lane; DeepSeek does not generate or approve it.
- Q10: Full replay is available from Title and Settings. Concise contextual
  Garage/Acquisition Help returns to the exact host/focus/pending state without
  mutating the run.

## User Scenarios & Testing

### User Story 1 — Learn the current game from a skippable deck (Priority: P1)

As a new player, I can review a concise visual explanation of the complete
current build loop before beginning a real championship, or skip immediately
and replay it later.

**Independent Test**: Complete, skip from every slide, replay from Title and
Settings, refresh, and cancel the versioned deck using every input mode. All
competitive/run state remains absent or deep-equal, and the correct local
preference is recorded when storage is available.

**Acceptance Scenarios**:

1. **Given** the current tutorial version has neither a completion nor Skip
   record, **When** the player begins from Title, **Then** the How to Play deck
   opens before entrant selection with `Skip` available on slide one.
2. **Given** any slide, **When** Next/Back is used, **Then** the page indicator,
   title, visual example, concise rules, and accessible summary update together.
3. **Given** the final slide, **When** Finish is selected, **Then** completion is
   recorded and the player proceeds to entrant selection without creating a run.
4. **Given** Skip on any slide, **When** it is confirmed, **Then** a skip record
   is stored for the current tutorial version and entrant selection remains the
   next destination.
5. **Given** completion or Skip, **When** Replay is selected later from Title or
   Settings, **Then** the full deck remains available without clearing progress.

---

### User Story 2 — Recognize Improvised placement immediately (Priority: P1)

As a player arranging a real build, I immediately recognize a legal Improvised
placement and can inspect its exact active, lost, and mismatch behavior before
or after commitment.

**Independent Test**: Preview and retain consequential, no-additional-effect,
and Adapted Mount mismatches across all supported item surfaces. Repeat without
color/hover and with reduced motion; the badge and exact facts remain truthful.

**Acceptance Scenarios**:

1. **Given** item category conflicts with a typed slot, **When** previewed or
   installed, **Then** a large `IMPROVISED` text/icon badge is visible at compact
   level without opening details.
2. **Given** details are opened, **When** the item has a Fitted benefit and an
   authored mismatch effect, **Then** active base, lost Fitted, and active
   Improvised behavior appear in the existing canonical inspector order.
3. **Given** no additional mismatch effect, **When** details are opened, **Then**
   `No additional mismatch effect` appears and no un-authored penalty is implied.
4. **Given** Adapted Mount, **When** it is installed in a conflicting slot,
   **Then** the badge still says `IMPROVISED` while details separately state that
   Fitted behavior is retained.
5. **Given** a Flex placement, **When** inspected, **Then** it says `FLEXIBLE`
   and never borrows the Improvised badge merely because Fitted is inactive.

---

### User Story 3 — Evaluate every acquisition against visual regional demand (Priority: P1)

As a player choosing an item, I can compare its canonical stats with a visual
four-axis profile of the current region and distinguish broad tendency from any
exact known next-race demand.

**Independent Test**: Open every typed acquisition surface for all seven
regions, with missing/valid/invalid next-race evidence and optional plate asset
available/missing. The same values, polygon, labels, item alignment, and fallback
appear without changing offers, RNG, tracks, transactions, or results.

**Acceptance Scenarios**:

1. **Given** a committed region, **When** an acquisition surface opens, **Then**
   it names the region and renders Acceleration, Top Speed, Braking, and
   Cornering as Low/Moderate/High around one visual four-axis profile.
2. **Given** details or accessibility text, **When** the profile is inspected,
   **Then** the exact normalized 0–100 values and evidence scope are available.
3. **Given** no exact next-race snapshot is retained, **When** the profile opens,
   **Then** it says `Regional tendency` and `Next race not yet known`; no circuit
   is generated for presentation.
4. **Given** a compatible retained next-race snapshot, **When** demand is shown,
   **Then** the exact next-race polygon is visually distinguishable from the
   regional profile and both remain labeled in text.
5. **Given** an item is selected, **When** it contributes to a High-demand stat,
   **Then** factual alignment is highlighted without predicting a win, time,
   finish, or declaring the item best.
6. **Given** the optional decorative plate is missing or invalid, **When** the
   chart renders, **Then** the code-native axes/polygon/labels remain complete.
7. **Given** malformed/legacy demand evidence, **When** acquisition opens,
   **Then** an honest typed fallback replaces unsupported facts while the offer
   and all actions remain available.

---

### User Story 4 — Reopen help without losing the decision (Priority: P2)

As a returning player, I can replay the deck through Settings or open concise
contextual help at a garage/acquisition decision and return to exactly where I
was.

**Independent Test**: Open/close help from Title, Settings, garage placement,
and every acquisition host while selection or replacement confirmation is
pending. Verify exact run/offer/confirmation/focus restoration and no RNG or
transaction change.

**Acceptance Scenarios**:

1. **Given** Settings, **When** `Replay How to Play` is selected, **Then** the
   full deck opens and returns to Settings on Exit without changing its stored
   completion/skip state.
2. **Given** a contextual Help action, **When** concise topology/demand help is
   closed, **Then** the original scene, selected item, pending confirmation,
   scroll/page state, and focus target are restored.
3. **Given** pointer, keyboard, touch-equivalent, reduced-motion, monochrome, or
   no-hover use, **When** help is navigated, **Then** all content/actions and
   focus order remain available.

---

### User Story 5 — Keep Test Day implemented but out of the current UI (Priority: P1)

As the product owner, I can retain the complete Test Day implementation and its
automated coverage while removing every ordinary player-facing way to enter it
until its product role is reconsidered.

**Independent Test**: Enumerate normal Title, Run, Prepare, Inventory, Pre-Race,
Results, and help controls and assert no Test Day entry is exposed. Separately
instantiate the internal scenes/domain tests and prove the implementation,
routes, and simulation remain intact.

**Acceptance Scenarios**:

1. **Given** any ordinary player-facing scene, **When** controls/help are
   enumerated, **Then** no Test Day button, shortcut, tutorial instruction, or
   discoverable route is presented.
2. **Given** the application scene registry and internal tests, **When** Test Day
   is invoked through a test/developer harness, **Then** its scenes and domain
   behavior still work unchanged.
3. **Given** Test Day visibility is later reconsidered, **When** its centralized
   UI visibility policy changes in a future feature, **Then** code was not
   deleted or replaced by tutorial-specific behavior.

## Edge Cases

- Local preference storage is unavailable, throws, or contains an unknown
  tutorial version.
- Skip is pressed on slide one, Finish is submitted twice, or Replay is exited
  before the last slide.
- Help opens while replacement confirmation, selected offer, or insufficient-
  credits feedback is active.
- An item has no Fitted benefit and no additional Improvised consequence.
- Adapted Mount retains Fitted behavior while placement remains Improvised.
- A region profile has tied High values or all values are Moderate.
- Paris uses a balanced profile and has no future regional race.
- Regional tendency and retained next-race demand materially disagree.
- Optional demand plate fails to load; axes or labels have long localized copy.
- Three dense item cards plus the demand chart exceed the preferred layout.
- Feature 041 adjacency or Feature 042 Loot is absent because its implementation
  has not landed; the tutorial fails compatibility rather than inventing facts.
- A stale direct URL tries to enter Test Day despite the hidden UI policy; the
  internal route remains non-advertised and does not become a player menu path.

## Requirements

### Functional Requirements

- **FR-001**: Feature 045 V1 MUST provide a versioned static How to Play deck in
  a separate non-scoring scene; it MUST NOT implement the future scripted run.
- **FR-002**: The deck MUST contain the ten locked subjects and order in
  `tutorial-content.md`, using authoritative item/topology/demand projections
  for examples rather than hand-copied contradictory facts.
- **FR-003**: The first Begin action MUST open the current deck before entrant
  selection when no compatible completion/skip record exists.
- **FR-004**: Skip MUST be available from the first and every subsequent slide;
  Finish and Skip route to entrant selection on first-run entry.
- **FR-005**: Completion and Skip MUST persist as distinct versioned local
  records. Unknown/unwritable storage MUST fail open and never block Begin.
- **FR-006**: Replay MUST remain available from Title and Settings regardless of
  completion/skip state and MUST NOT overwrite those records merely by opening.
- **FR-007**: The deck MUST provide Back, Next/Finish, Skip/Exit, page `n/10`,
  title, visual model, concise copy, and complete accessibility summary.
- **FR-008**: The V1 deck MUST explain the core loop, four normalized stats and
  regional demand, item cards/categories, slot topology, placement states,
  storage/replacement, tiers/tags/Synergy, adjacency, Workshop Modifications/
  Loot, acquisition/economy, automatic racing, and Results.
- **FR-009**: The deck MUST omit Test Day and MUST NOT imply practice access is
  currently available to players.
- **FR-010**: The desired Bazaar-style scripted tutorial run MUST be recorded as
  a separate deferred feature with authored choices, tuned opponents, build
  payoff, loss-proofing, replay, and analytics questions preserved.
- **FR-011**: Tutorial navigation MUST support pointer, touch-equivalent,
  keyboard, visible focus, no-hover, monochrome, and reduced motion.
- **FR-012**: Every Improvised placement preview and compact installed-item
  surface MUST show a large `IMPROVISED` text/icon badge; color and motion are
  supplementary only.
- **FR-013**: Full inspectors MUST retain their canonical ordering while naming
  active base behavior, lost Fitted behavior, and active authored mismatch
  behavior exactly.
- **FR-014**: A mismatch with no additional authored consequence MUST keep the
  badge and disclose `No additional mismatch effect` without inventing value.
- **FR-015**: Adapted Mount MUST remain `Improvised` while separately disclosing
  retained Fitted behavior; Flex MUST remain distinct as `Flexible`.
- **FR-016**: Improvised badge/state MUST be available on placement preview,
  garage slot, Inventory, Pre-Race, retained race evidence, and Results. Hidden
  Test Day code MAY retain its existing internal presentation.
- **FR-017**: All placement presentation MUST consume authoritative preview or
  retained installation evidence; scene coordinates/card order/prose parsing
  MUST NOT determine state.
- **FR-018**: The system MUST define one versioned `RegionalDemandProfile` for
  each selectable region and Paris with normalized integer 0–100 values for
  Acceleration, Top Speed, Braking, and Cornering.
- **FR-019**: Regional values MUST be backed by a deterministic approved
  regional circuit sensitivity corpus and checked into content with corpus
  version/provenance; they are not manually inferred from flavor prose.
- **FR-020**: Low/Moderate/High bands MUST be 0–39, 40–69, and 70–100.
- **FR-021**: A visual four-axis profile MUST render labeled axes, grid, polygon,
  vertices, qualitative labels, selected-item alignment, and non-color line/
  marker distinctions from the pure demand model.
- **FR-022**: Exact 0–100 values and scope MUST remain available in expanded and
  accessibility text even when compact presentation uses qualitative labels.
- **FR-023**: A separate exact next-race layer MAY render only from a retained,
  compatible `NextRaceDemandSnapshot`; V1 MUST NOT pre-generate or regenerate a
  future circuit solely to show this layer.
- **FR-024**: Regional and next-race layers MUST use distinct line/marker shapes
  plus text labels, not color alone.
- **FR-025**: The shared demand projection MUST appear on Parts Supplier, Reward
  Draft, Cross-Pollination, Tag Specialist, Feature 042's neutral supplier/Loot
  source, and every future encounter declaring typed item acquisition.
- **FR-026**: Demand/help presentation MUST consume no offer RNG and change no
  offer IDs/order, prices, stock, affordability, transactions, tracks, schedules,
  run state, or contest outcomes.
- **FR-027**: Item alignment MAY identify authored positive contributions to a
  High-demand stat but MUST NOT predict outcome/time/position or call an item
  objectively best.
- **FR-028**: Missing/legacy/malformed/unknown profile or snapshot data MUST
  produce a typed honest fallback without blocking acquisition actions.
- **FR-029**: Code MUST render a complete demand chart without an image. If the
  optional decorative plate is supplied, it MUST be loaded through a typed
  manifest and failure MUST fall back to the code-native chart.
- **FR-030**: DeepSeek MUST NOT generate, source, select, crop, edit, or approve
  the optional plate; that belongs to `[ASSET-FRONTIER-OPTIONAL]`.
- **FR-031**: Settings MUST expose `Replay How to Play`; Title MUST expose Replay,
  and Garage/Acquisition surfaces MUST expose concise contextual Help.
- **FR-032**: Contextual help MUST preserve the exact host, selected/focused item,
  pending confirmation, and offer state without serializing a second run copy.
- **FR-033**: A centralized player-facing visibility policy MUST set Test Day to
  hidden and suppress its normal controls/shortcuts/help references in Run,
  Prepare, Inventory, Pre-Race, Results, Title, and the How to Play deck.
- **FR-034**: Feature 045 MUST NOT delete Test Day scenes, domain modules,
  recovery, internal routing, or automated tests, and MUST NOT change Test Day
  simulation behavior.
- **FR-035**: The coding handoff MUST exclude screenshots, qualitative visual
  judgment, and manual acceptance; those remain frontier/owner-only.

### Key Entities

- **HowToPlayDeck**: Versioned ordered static slide definitions and compatibility
  requirements.
- **HowToPlaySlide**: Stable ID, title, concise copy, visual projection kind,
  authoritative example references, accessibility summary, and order.
- **TutorialPreference**: Versioned local completed/skipped record with timestamp;
  never run state.
- **HelpReturnContext**: Host scene/key, focus/selection/confirmation identifiers,
  and return action; never a cloned competitive model.
- **InstallationBadgeModel**: Authoritative installation state, large compact
  token, icon/shape, accessible label, and inspector references.
- **RegionalDemandProfile**: Versioned region/corpus-bound four-stat vector.
- **NextRaceDemandSnapshot**: Optional retained exact race/stage-bound vector.
- **DemandChartModel**: Pure axes/grid/polygon/marker/label/alignment/fallback data.
- **PlayerFeatureVisibility**: Centralized presentation availability; Test Day
  remains implemented while player-facing exposure is false.

## Success Criteria

- **SC-001**: All ten slides have stable IDs, authoritative examples, complete
  accessible summaries, and pointer/keyboard/touch navigation tests.
- **SC-002**: Complete, skip-from-every-page, replay, exit, refresh, invalid-
  storage, and duplicate-command fixtures mutate zero competitive/run fields.
- **SC-003**: In owner/frontier comprehension review, at least 90% of attempts
  correctly predict Fitted/Flexible/Improvised state and identify lost/gained
  behavior after reviewing the deck.
- **SC-004**: Every clarified compact surface shows the correct large Improvised
  badge, and 100% of full details reconcile to authoritative evidence.
- **SC-005**: Monochrome, reduced-motion, no-hover, keyboard, and touch-equivalent
  matrices retain 100% of consequential tutorial, placement, and demand meaning.
- **SC-006**: The checked-in seven-region demand vectors reproduce the approved
  deterministic corpus within ±1 normalized point per stat.
- **SC-007**: Every typed acquisition host renders identical profile data and
  opening/closing demand/help changes zero offer/RNG/transaction/run fields.
- **SC-008**: The code-native chart remains complete with the optional plate
  missing, corrupt, or unavailable.
- **SC-009**: Automated layout bounds report zero collision between deck/chart,
  cards, inspectors, and actions in supported code-owned layouts.
- **SC-010**: Normal player-facing control enumeration contains zero Test Day
  entry points while all existing Test Day domain/scene automated suites remain
  present and passing.

## Assumptions

- Features 041 and 042 implement before Feature 045 so the deck can truthfully
  explain their final mechanics and content.
- The first V1 deck uses code-native diagrams/current approved assets only; the
  optional demand plate does not block coding or release.
- Tutorial preferences are device/browser-local, not account-wide.
- Feature 044 later owns broader responsive infrastructure; Feature 045 still
  supplies bounded layouts and automated geometry checks.
- Hiding all player-facing Test Day entry points creates a documented temporary
  deviation from Constitution Principle V. The static deck does not satisfy
  build-testing access; that compliance claim remains open until access is
  restored/replaced or the constitution is amended.

## Dependencies

- `specs/vehicle-topology.md` and `src/simulation/slots.ts`
- Features 024/025 item/stat presentation
- Features 028/029/033 region, track, and retained evidence authority
- Feature 034 Adapted Mount and Workshop Modifications
- Feature 041 adjacency implementation
- Feature 042 expanded items, Loot, acquisition surfaces, and final item facts
