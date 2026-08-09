# Research: Run Progression - Encounter Structure

## Decision 1: Extend the framework-free simulation boundary

**Decision**: Add `run.ts` for progression/state transitions and
`encounters.ts` for encounter generation, economy, and sponsor evaluation.
Phaser scenes render these values and dispatch actions only.

**Rationale**: Specs 001-007 consistently isolate rules in `src/simulation/`
and keep Phaser as a thin shell. Feature 008 also centralizes shared display
formatting instead of embedding rules in scenes. Run progression has enough
state and invariants to require the same boundary.

**Alternatives considered**: Keep run state entirely in `PrepareScene` (rejected:
repeats the placeholder architecture and is difficult to test); introduce a
state-management package (rejected: unnecessary dependency for one local run).

## Decision 2: Use an explicit six-stage schedule

**Decision**: Materialize stage kinds in this order: choice, choice, PvP-10,
choice, choice, PvP-12. Generate and store two distinct eligible non-PvP choices
only when a choice stage becomes current.

**Rationale**: The sequence is finalized in FR-005/FR-015. Storing choices
prevents a re-render from changing the player's options. Repeated encounter
types across different stages remain legal.

**Alternatives considered**: Randomly mix PvP into choices (rejected by the
spec); pre-generate the whole run (unnecessary and complicates Sponsor Meeting
eligibility after contract acceptance).

## Decision 3: Inject randomness and store every generated result

**Decision**: Pure generators receive an `rng: () => number`. Run seed and PvP
ordinal derive target-time thresholds; generated choices, item offers, supplier
stock, and sponsor offers are stored before display.

**Rationale**: Existing `drawItem` already accepts injected randomness, enabling
controlled tests. The spec does not require cross-session reproducibility for
all choices, but it does require a seeded target and no view-driven changes.

**Alternatives considered**: Call `Math.random` inside scenes (rejected:
untestable and unstable); build a persistence/PRNG subsystem (rejected:
cross-session resume is outside 009).

## Decision 4: Guard completion by encounter instance ID

**Decision**: Every stage and selected encounter has a stable instance ID.
Completion functions require the currently active ID, reject completed or stale
IDs, append one immutable history entry, and advance once.

**Rationale**: This directly enforces FR-016 and protects against duplicate
button events, scene recreation, and stale callbacks.

**Alternatives considered**: Increment a numeric index directly from scenes
(rejected: double events can skip stages); infer completion from view changes
(rejected: navigation is not a domain event).

## Decision 5: Keep acquisition placement semantics unchanged

**Decision**: Reward Draft creates three identity-weighted offers and commits at
most one only after an existing board/storage placement or explicit decline.
Supplier creates three identity-tagged stock entries; each purchase is committed
only with an existing placement/eviction transition. One paid restock replaces
each still-unpurchased stock slot, while purchased slots stay empty.

**Rationale**: This preserves specs 002-004 while separating encounter choice
from item choice. Stable offer-instance IDs allow duplicate item copies without
conflating stock entries.

**Alternatives considered**: Auto-place purchases (rejected: violates the
two-layer decision and eviction rules); give Supplier the old one-refresh rule
(rejected: 009 defines a paid restock with different semantics).

## Decision 6: Model credits as transactions, not a loose scene counter

**Decision**: Start at 5 credits and append integer transactions for purchases,
restock, participation, win bonus, immediate sponsor payout, and conditional
sponsor payout. A transition fails before mutation if it would go negative.

**Rationale**: A small ledger makes SC-009 and run-summary transparency directly
testable while keeping `balance` available for rendering.

**Alternatives considered**: Store only a number (rejected: weak auditability);
introduce a general economy service (rejected: only run-scoped credits exist).

## Decision 7: Resolve sponsor contracts from immutable race output

**Decision**: Sponsor Meeting offers immediate 2 credits plus two distinct
objectives selected from win, seeded target time, and 10 matching-tag firing
events. A conditional selection creates the sole pending contract. After the
next PvP result, evaluate it once, append succeeded/failed outcome details, pay
7 on success, and clear the active slot.

**Rationale**: `ContestResult` already contains outcome, total player time,
board/storage item metadata, and per-lap firing events. Contract resolution can
therefore remain pure and cannot affect the race itself.

**Alternatives considered**: Track sponsor progress live during playback
(rejected: duplicates simulation facts and risks contest integrity); allow
stacked contracts (rejected by FR-024).

## Decision 8: Parameterize lap count at the simulation entry point

**Decision**: Pass lap count from the PvP stage through `resolveContest` to
`simulatePlayerLaps` and ghost-lap generation, and include it in the immutable
result/schedule data. Update playback completion and scene labels to derive from
that explicit count. Preserve a default only where needed for existing callers
during migration.

**Rationale**: A global `LAP_COUNT = 10` currently controls both simulation and
labels. The second race requires 12 laps, and the same explicit value must drive
resolution, playback, and presentation to prevent divergence.

**Alternatives considered**: Temporarily mutate the global constant (invalid in
ES modules and unsafe); special-case 12 laps in the scene (would desynchronize
simulation and display).

## Decision 9: Keep active runs in memory for this slice

**Decision**: Carry the immutable `Run` through scene data. If required context
is absent, show the run as unavailable and route to a deliberate new-run action;
never reconstruct random choices silently.

**Rationale**: The specification explicitly limits interruption/resume and does
not require durable cross-session storage. This is the smallest behavior that
handles the edge case honestly.

**Alternatives considered**: `localStorage` serialization/versioning (rejected
as out of scope); silently start over (explicitly prohibited).

## Decision 10: Store entrant identity on the run

**Decision**: `Run` carries the selected `IdentityTag`. Reward Draft passes it
to the existing weighted draw, Parts Supplier filters stock to it, and sponsor
tagged-trigger contracts store it when accepted.

**Rationale**: The first implementation has only the shipped Performance
identity, but encounter rules are defined in terms of the player's chosen entrant.
Keeping identity as run input satisfies that contract without adding entrant
selection UI or coupling encounter generation to a global constant.

**Alternatives considered**: Read `ACTIVE_IDENTITY_TAG` directly inside every
encounter rule (rejected: hides a run-defining input and blocks later identities);
add entrant selection to 009 (rejected as explicit scope expansion).

## Decision 11: Sequence Build Testing Access immediately after 009

**Decision**: Do not add a fake or incomplete test encounter to this catalog.
Treat Build Testing Access as the immediate follow-up feature and a release gate
for the expanded progression loop.

**Rationale**: The finalized specification explicitly makes this sequencing
decision, while Constitution Principle V requires the capability alongside core
gameplay rather than as post-launch polish.

**Alternatives considered**: Rename an incomplete interaction "Test Day"
(rejected by FR-015); absorb full testing access into 009 (rejected because the
finalized scope calls for a dedicated follow-up).
