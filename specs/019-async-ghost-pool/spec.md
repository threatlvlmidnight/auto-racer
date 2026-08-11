# Feature Specification: Async Ghost Pool

**Feature Branch**: `019-async-ghost-pool`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Lay the foundation for real async multiplayer without building a backend yet. Today's 7 rival cars are a fixed, always-identical authored catalog every player races every time. Grow that into a larger authored pool and deterministically select 7 distinct entries per contest, keyed by a plain numeric ID (not a Run/player object), so the selection mechanism, the shape a 'ghost' occupies, and the canonical-across-viewers requirement flagged in `specs/skribidi-gap-decisions.md` §2 are all proven out now. Real player-run recording, upload, and a shared-lobby ID scheme (owner's explicit concern: async multiplayer will eventually need a lobby builder that generates one track and fills it with 8 real players, not one track per individual player's run) remain a separate, later feature once an actual backend exists — this feature must not foreclose that by coupling selection to any individual player's Run."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every race draws from a wider, deterministic ghost pool (Priority: P1)

Instead of always facing the exact same 7 rival cars in every single PvP
contest, a player's race now draws 7 distinct entries from a larger
authored pool, selected deterministically for that specific contest. The
same contest (same numeric ID and PvP stage) always selects the same 7
entries; a different contest draws a different, but still fully
deterministic, combination.

**Why this priority**: This is the entire mechanism this feature exists
to prove. Without it, there's nothing to build the rest of the feature
(or the future real-ghost-recording feature) on top of.

**Independent Test**: Resolve contests for several different (numeric
ID, PvP ordinal) pairs; confirm each selects exactly 7 distinct entries
from the pool, confirm the same pair always selects the same 7, and
confirm the selection is not simply "the first 7" or "all of them" —
different pairs select different combinations.

**Acceptance Scenarios**:

1. **Given** a wider authored ghost pool (more than 7 entries), **When**
   a contest is resolved for a given (id, ordinal) pair, **Then**
   exactly 7 distinct entries are selected from the pool, with no
   duplicate and no car left decorative — matching today's existing
   "every car counts toward standings" rule.
2. **Given** the same (id, ordinal) pair resolved twice, **When** both
   selections are compared, **Then** they are identical.
3. **Given** two different (id, ordinal) pairs, **When** their
   selections are compared, **Then** they differ (for a pool
   meaningfully larger than 7).
4. **Given** a selected entry, **When** its build is resolved for the
   contest's level, **Then** it uses today's existing, unchanged
   level-scaling mechanism (`resolveRivalBuild`) — this feature adds a
   selection step in front of that mechanism, it does not replace it.

---

### User Story 2 - Selection never depends on any one player's Run (Priority: P1)

The function that selects 7 entries from the pool takes only a plain
numeric identifier and a PvP ordinal — never a `Run`, a player's
identity, or any other player-scoped object. Today's only caller
happens to derive that numeric identifier from the current player's own
run data, because there is no shared-lobby concept yet — but that is a
caller-side choice, not something this feature's selection logic
depends on or could not work without.

**Why this priority**: This is the owner's explicit, load-bearing
concern (2026-08-11): a future async-multiplayer lobby will generate one
track and select one ghost pool for a *group* of up to 8 real players,
not one per individual participant's own run. If selection were coupled
to `Run` now, that future feature would require reworking this one
instead of simply supplying a different number.

**Independent Test**: Call the selection function directly with a bare
numeric id/ordinal pair with no `Run` object anywhere in scope; confirm
it produces a correct, deterministic selection with no missing data or
special-cased behavior.

**Acceptance Scenarios**:

1. **Given** the selection function's own signature, **When** it is
   inspected, **Then** it accepts only a plain numeric identifier and a
   PvP ordinal — no `Run`, `Build`, or player-identity parameter.
2. **Given** today's only production call site, **When** it supplies
   the numeric identifier, **Then** it derives it from data already
   available on the current run (mirroring `018-track-generation`'s
   identical, already-shipped non-coupling pattern for track
   generation) — but this is documented as a caller-side choice, not a
   constraint the selection function itself enforces or assumes.

---

### User Story 3 - Every existing consumer keeps working (Priority: P2)

`012-multi-ghost-contest`'s contest resolution, `013-race-spectacle`'s
standings/rendering, and `018-track-generation`'s track-fit all continue
to work exactly as today against a selected 7-entry roster instead of
the full fixed catalog — none of them are aware anything changed, since
the field is still exactly 8 cars (player + 7), every car still counts
toward standings, and every selected entry still resolves through the
existing `RivalProfile`/`resolveRivalBuild` shape.

**Why this priority**: Confirms this feature is additive to `012`/`013`/
`018`, not a rework of any of them. Lower priority than US1/US2 because
it is verification of an existing contract, not new player-facing
mechanism.

**Independent Test**: Run every existing `012`/`013`/`018` test against
a selected roster instead of the full catalog; confirm all pass
unchanged.

**Acceptance Scenarios**:

1. **Given** a resolved contest using a selected 7-entry roster, **When**
   its result is inspected, **Then** it has the same shape
   (`NCarContestResult` with exactly 8 `cars`) it always has, and every
   existing presentation/standings/track-fit consumer requires zero
   code changes.
2. **Given** the pool's own catalog validation, **When** it is checked,
   **Then** it enforces the same integrity rules today's 7-entry
   catalog already enforces (unique IDs, resolvable vehicle IDs), with
   a minimum-size check ("at least 7") instead of an exact one — and
   **Given** the existing 7-entry catalog and every test that depends
   on it being exactly 7, **When** this feature ships, **Then** that
   catalog and every test built on it are completely unaffected (Edge
   Cases).

---

### Edge Cases

- What happens if the authored pool has fewer than 7 entries? Catalog
  validation MUST fail loudly at authoring time (same "fail loudly, not
  silently" convention `validateRivalCatalog` already establishes) —
  never at contest-resolution time with a partial/short roster.
- What happens if two different (id, ordinal) pairs happen to select
  the identical 7 entries by chance (a large pool makes this
  vanishingly likely, but not impossible)? This is a legitimate,
  harmless outcome, not an error — selection is deterministic, not
  required to be exhaustively distinct across every possible pair.
- What happens to a profile's own level-scaling (`RivalLevelScaling`)
  when it's added to the wider pool? Every authored profile, old or
  new, MUST have its own complete level-scaling table — a
  selected-but-unscaled profile is not a valid pool entry.
- What happens to today's existing 7-entry catalog and the 11+ existing
  tests (`contest.test.ts`, `playback.test.ts`) that pass it directly
  into `resolveContest`, relying on `resolveContest`'s own internal
  "exactly 7" check (verified directly against the codebase — a typed
  `ContestResolutionError` with code `invalid-roster-size`)? Nothing —
  they are completely unaffected, because the wider pool is a new,
  separate catalog, never a widening of the existing one (FR-001). This
  is the single most load-bearing edge case in this feature: getting it
  wrong would silently break over a dozen currently-passing tests the
  moment the pool grows past 7 entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST author a ghost pool larger than 7 entries,
  as a **new, separate, additive catalog** that contains today's
  existing 7-entry roster plus new entries — never a widening or
  replacement of the existing 7-entry catalog itself, which MUST remain
  exactly as it is today, unchanged in name, size, and content (exact
  pool size is a balance-pass decision, not fixed by this specification
  — see Assumptions). Reuses the existing `RivalProfile` shape
  unchanged for every entry, old and new alike.
- **FR-002**: The system MUST deterministically select exactly 7
  distinct entries from the pool for a given contest: identical
  `(id, pvpOrdinal)` always selects the same 7 entries; the same entry
  is never selected twice for one contest.
- **FR-003**: The selection function MUST accept only a plain numeric
  identifier and a PvP ordinal as input — it MUST NOT accept a `Run`,
  `Build`, player-identity, or any other player-scoped object, and MUST
  NOT read anything beyond those two arguments. This is a binding
  architectural constraint, not a suggestion (mirrors
  `018-track-generation`'s identical, already-shipped requirement for
  `generateTrack`).
- **FR-004**: Every selected entry MUST resolve through today's existing
  `resolveRivalBuild`/`RivalLevelScaling` mechanism, unchanged — this
  feature adds a selection step ahead of that mechanism, never replaces
  or duplicates it.
- **FR-005**: Today's only production call site MUST derive the numeric
  identifier from data already available on the current run (no new
  infrastructure required for this pass) — but this is documented
  explicitly as a caller-side choice the selection function itself does
  not require, so a future shared-lobby feature can supply a
  lobby-scoped identifier instead, with zero change to selection logic
  (FR-003).
- **FR-006**: The wider pool MUST have its own catalog validation
  enforcing a minimum size ("at least 7") and the same integrity rules
  (unique IDs, resolvable vehicle IDs) today's `validateRivalCatalog`
  already enforces. `validateRivalCatalog` itself MUST NOT change its
  existing "exactly 7" behavior — it continues to validate today's
  7-entry catalog exactly as it does today (FR-001), whether that means
  reusing it against the new pool with a different expectation, or
  introducing a sibling function; either way, the existing 11+ existing
  test call sites that pass the current 7-entry catalog directly into
  `resolveContest` (relying on it being exactly 7) MUST continue to
  pass unmodified (Edge Cases, SC-004).
- **FR-007**: `resolveContest`'s N-car overload, `013-race-spectacle`'s
  standings/rendering, and `018-track-generation`'s track-fit MUST
  require zero code changes — each already operates on "the roster it
  was given," not on the full catalog by name.
- **FR-008**: No new field is introduced on `RivalProfile` or
  `ItemDefinition` — selection is a pure function over the existing
  pool's existing shape.
- **FR-009**: The specific 7 entries selected for a given contest MUST
  be inspectable after the fact, the same way every other
  outcome-determining value already is (Constitution Principle III) —
  a player (or a future spectator/replay viewer) can see exactly which
  ghosts they raced, not just their names in the result.

### Key Entities

- **Ghost Pool**: A new, separate, fully authored (not player-
  submitted) collection of `RivalProfile` entries this feature
  introduces — a superset that *contains* today's existing 7-entry
  catalog plus new entries, never a widening or replacement of that
  existing catalog itself, which remains completely unchanged in name,
  size, and behavior. Validated for a minimum size ("at least 7")
  rather than an exact one.
- **Contest Roster Selection**: The derived, per-contest output of
  selecting exactly 7 distinct pool entries from a plain numeric
  identifier and PvP ordinal — never stored, always recomputed, never
  dependent on a `Run` or player object.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across a wide sample of (id, ordinal) pairs, selection
  always returns exactly 7 distinct pool entries, 100% of the time.
- **SC-002**: Regenerating the same (id, ordinal) pair at any later
  point selects a byte-for-byte identical 7-entry roster, 100% of the
  time.
- **SC-003**: Across a wide sample of different (id, ordinal) pairs
  drawn against a pool meaningfully larger than 7, the selected rosters
  are not all identical — real variety is observable, not just
  theoretically possible.
- **SC-004**: Every pre-existing automated test in this codebase that
  does not itself change continues to pass unchanged after this
  feature lands — zero regression in `012`/`013`/`014`/`015`/`016`/
  `017`/`018` behavior.

## Assumptions

- **This feature does not build a backend, player accounts, ghost
  recording/upload, or a real shared-lobby ID scheme.** Those remain
  explicitly deferred to a separate, later feature, per direct
  discussion with the owner (2026-08-11) and this project's existing
  "real async ghost recording" open item (`vision.md`, `specs/
  skribidi-gap-decisions.md` §1/§2). This feature's entire job is to
  prove the selection mechanism and protect the extension point a real
  backend will eventually plug into — not to build that backend.
- **Pool size** is a balance-pass placeholder, not fixed here — large
  enough that selection produces real, observable variety (SC-003), not
  so large that authoring 4-level scaling tables for every entry
  becomes disproportionate content work for a mechanism-proving pass.
  Whatever the final count, the new pool contains today's existing 7
  profiles plus new ones (FR-001) — no existing content is dropped or
  re-authored.
- **`RivalProfile` itself is unrenamed.** Despite this feature's
  colloquial "ghost pool" framing (matching `vision.md`'s own "async
  ghost recording" vocabulary), the existing, already-tested
  `RivalProfile` type and its established authoring pattern
  (`levelTable(...)`) are reused as-is — renaming a working, well-
  covered type across every file that references it is a large,
  low-value refactor with no functional benefit to this feature's own
  goals.
- **The numeric identifier's exact source formula** (today, derived
  from the current run) is an implementation detail for the planning
  phase, not fixed by this specification, mirroring how
  `018-track-generation` left its own seed-combination formula open at
  the spec stage.
