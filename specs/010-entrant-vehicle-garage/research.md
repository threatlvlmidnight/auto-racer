# Research: Entrant Selection & Named-Vehicle Garage

## Decision 1: Run creation occurs only after entrant confirmation

**Decision**: Title routes to a new `EntrantSelectScene`. Highlighting or
leaving that scene changes presentation-local selection only. `createRun`
receives a validated entrant ID and creates `RunIdentity`, the named empty
vehicle, credits, stages, and generated choices in one transition when the
player activates **Enter Championship**.

**Rationale**: `TitleScene` currently starts `RunScene`, whose fallback path
silently creates a run. Moving the creation boundary to explicit confirmation
is the smallest route change that satisfies FR-001/FR-033 and prevents previews
from consuming RNG, credits, encounter state, or history.

**Alternatives considered**:
- Create a provisional run when selection opens: rejected because inspection
  would create progress and generated offers before confirmation.
- Keep a default entrant in `RunScene`: rejected because invalid context must
  recover explicitly, not silently commit an identity.

## Decision 2: Identity is immutable run data, not repeated scene parameters

**Decision**: Replace the prototype `identityTag: "performance"` with an
immutable `RunIdentity` containing `entrantId`, `origin`, `vehicleId`, and the
vehicle topology ID. The `Run` owns the current `VehicleBuild`; scenes receive
the same run object through existing scene data. Validation resolves authored
entrant/vehicle definitions and rejects inconsistent pairs.

**Rationale**: Feature 009 already makes `Run` the authoritative in-memory state
carried across encounters and locks `buildSnapshot` for PvP. Extending that
contract preserves progression and avoids a second identity store.

**Alternatives considered**:
- Store entrant fields separately in every scene: rejected due to drift and
  missing-context fallback risk.
- Copy full mutable entrant definitions into each run: rejected because the
  content catalog should remain immutable and run state needs stable IDs.

## Decision 3: Topology replaces `Build.board` with typed vehicle slots

**Decision**: `Build` becomes `VehicleBuild` with a named vehicle reference,
four ordered `VehicleSlot` records, and three `StoredPosition` records. Each
vehicle definition authors exactly four stable slot IDs and slot types. The
order is canonical for serialization, rendering, snapshots, and result review,
but has no simulation meaning among equivalent slot types.

**Rationale**: An array of bare items cannot represent Power/Chassis/Flex or
preserve a named topology. Stable slot IDs make previews, keyboard focus,
locked snapshots, and result attribution explicit while preserving simple
array traversal.

**Alternatives considered**:
- Keep `board` plus a parallel slot-type array: rejected because the arrays can
  diverge and generic board vocabulary remains in the domain.
- Use screen coordinates as slot identity: rejected because coordinates are
  presentation-only and must not affect contest behavior.

## Decision 4: Installation state and effects are derived, never stored on items

**Decision**: Each item definition adds `origin`, `installationCategory`,
`synergyTags`, `baseBehavior`, `fittedBehavior`, and `improvisedBehavior` where
the latter is either an authored behavior or explicit `none`. A pure resolver
derives `fitted`, `flexible`, or `improvised` from item category and slot type.
Stored items have no installation state. Contest locking materializes resolved
installed-item snapshots so playback never reinterprets mutable presentation.

**Rationale**: This follows the authoritative topology document, keeps authored
content immutable, and allows exact preview/result explanations without a
hidden universal multiplier.

**Alternatives considered**:
- Store installation state on the item copy: rejected because moving the same
  copy would mutate its definition-shaped data and invite stale state.
- Add a global match bonus/mismatch penalty: constitutionally prohibited and
  unable to express item-authored behavior.

## Decision 5: One pure garage command boundary serves every input mode

**Decision**: Add `garage.ts` with pure destination preview and command
functions. Sources are offer, active slot, or storage; destinations are active
slot, storage, eviction, decline, or cancel as allowed by context. Commands
return a new build or a typed error and never partially mutate. Drag/drop,
pointer/touch select-then-place, and keyboard activation create the same command
objects and consume the same previews. Acceptance independently completes
entrant selection and one full preparation encounter through a keyboard-only
path and a touch-only path; neither path may depend on hover or precision drag.

**Rationale**: `PrepareScene` currently has separate callback branches and
directly calls multiple board/storage helpers. A single command boundary is the
only reliable way to prove input parity, atomic movement, and cancellation.

**Alternatives considered**:
- Add keyboard handlers around existing drag callbacks: rejected because the
  two paths would encode replacement and validation separately.
- Let the scene mutate a provisional build during dragging: rejected because
  cancellation must restore the exact prior build without rollback logic.

## Decision 6: Installation behavior is resolved in pure lap simulation

**Decision**: `simulatePlayerLaps` consumes locked installed-item snapshots and
applies each definition's base behavior plus its resolved Fitted or Improvised
behavior. Flexible applies base behavior only. Fired/contribution records add
slot ID, installation state, and behavior source while preserving deterministic
lap totals. Phaser only schedules and renders the immutable result.

**Rationale**: Simulation already resolves before `ContestScene` playback and
its lap breakdown drives callouts. Extending this path preserves prepare/contest
separation and provides required attribution without scene-side math.

**Alternatives considered**:
- Apply fit effects in `PrepareScene`: rejected because presentation state
  would influence outcome and tests could not establish deterministic locking.
- Infer installation effects during playback: rejected because playback speed,
  viewport, or animation preference must not affect results.

## Decision 7: Weighted drafts use origin with guaranteed off-origin eligibility

**Decision**: Replace `IdentityTag` with the four-value `Origin` union. Weighted
draws use the existing deterministic contract: a `0.75` home-origin branch
selects from eligible items carrying the entrant's origin, and the `0.25`
off-origin branch selects from eligible items carrying any other origin.
Supplier generation follows the feature's existing authored-stock rules but
must not use origin for legality. Tests force both branches for every entrant.

**Rationale**: This preserves feature 003's established 75/25 behavior while
adopting the committed origin model. Installation category and synergy tags stay
independent axes.

**Alternatives considered**:
- Four closed origin pools: rejected because cross-origin offers are required.
- Derive category from origin: rejected because each ecosystem must contain
  meaningful Power and Chassis items.

## Decision 8: Responsive presentation uses CSS framing plus scene compositions

**Decision**: Keep the Phaser logical size at 800x450 and `Phaser.Scale.FIT`,
fix the host/canvas sizing and safe-area behavior in the page shell, and provide
landscape and narrow-portrait composition modes in pure presentation models.
Portrait mode uses intentional vertical regions and page/region scrolling where
needed; it does not scale required text or targets below the specified minimums.
Selection, focus, state, and slot type always have text/icon/structural cues.

**Rationale**: The current fixed logical coordinates are deeply established,
while the browser shell already owns FIT scaling. Separating logical game size
from final CSS size preserves scenes and enables explicit viewport tests.

**Alternatives considered**:
- Increase the Phaser logical resolution to 1280x720 in this feature: rejected
  because it would force an unrelated rewrite of every existing scene.
- Uniformly shrink the 800x450 canvas on portrait screens: rejected because
  labels and interaction targets would become inoperable.

## Decision 9: Local placeholders establish identity without production art

**Decision**: Add four local portrait/emblem SVGs and four local vehicle
silhouette SVGs under `public/assets/entrants/` and `public/assets/vehicles/`.
Each uses a distinct silhouette/material motif from the roster: Highwheel
carriage, Needle motor cycle, Lark propeller trike, and Hush low roadster.
`src/content/entrants.ts` owns names, copy, topology, and asset keys. Existing
workshop/race backdrops may be reused.

**Rationale**: The feature needs recognizable 2D identity and asset loading
coverage, but final portraits, animation, and production illustration are
explicitly out of scope.

**Alternatives considered**:
- Text-only selection: rejected because vehicle silhouette and entrant identity
  are required first-viewport comparison signals.
- Remote or generated-at-runtime assets: rejected because validation must be
  local, deterministic, and offline-capable.

## Decision 10: Migrate all prototype items in one typed catalog pass

**Decision**: Migrate every current playable item definition before enabling
the new garage. Keep IDs, prices, cooldowns, base effects, buff relationships,
and active-while-stored flags stable where possible; author one origin, one
category, synergy tags, Fitted behavior, and explicit Improvised disclosure for
each. Compatibility aliases may exist only inside the migration commit and must
not survive as public generic-board contracts.

**Rationale**: Mixed old/new definitions would make previews and contests
partially undefined. Stable IDs and preserved base behavior protect progression,
sponsor counting, deterministic tests, and contest playback during migration.

**Alternatives considered**:
- Migrate only items shown in one fixture: rejected because every playable item
  must be legal and explainable in every slot.
- Replace the whole catalog with final launch content: rejected as out of scope;
  representative typed content is sufficient for this feature.

## Decision 11: Build Testing Access is a hard prerequisite gate

**Decision**: Feature 010 implementation and release remain blocked until the
separately scoped Build Testing Access/Test Day slice in
`specs/visual-overhaul.md` UI-FR-022 is completed and validated. Feature 010
documents and verifies this gate but does not implement, redefine, or waive it.

**Rationale**: Constitution Principle V requires low-stakes build testing to be
built alongside core gameplay. Treating Test Day as future release sequencing
would allow implementation to proceed while the constitutional need is absent.

**Alternatives considered**:
- Start feature 010 and add Test Day before release: rejected because the
  remediated dependency explicitly blocks implementation as well as release.
- Approximate Test Day inside garage previews: rejected because UI-FR-022 owns a
  separately validated practice-contest flow and feature 010 must not absorb it.