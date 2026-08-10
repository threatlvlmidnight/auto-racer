# Research: Season Structure Growth

## Decision 1: Extend the existing hardcoded array-literal pattern, not a generated/looped schedule

**Decision**: `createStages`'s `definitions` array grows from 6 to 12
entries, still written as a literal array of
`{ kind, choiceOrdinal?, pvpOrdinal?, lapCount? }` objects — the exact
same authoring style used today — rather than generated
programmatically (e.g., a loop building four repeating groups).

**Rationale**: The existing 6-entry array is already hand-authored, not
computed, and nothing about "grow the length" requires that to change.
A literal array keeps every stage's shape trivially readable and
auditable in one place, matching this codebase's general preference for
explicit, inspectable data over generated structure (Constitution
Principle III, Transparency & Legibility — a hardcoded schedule is
easier to verify by inspection than a loop's output).

**Alternatives considered**:
- Generate the array from a small "repeat this group N times" helper:
  rejected — for a fixed, one-time-authored 12-entry sequence, a helper
  adds a layer of indirection with no real benefit; the array is not
  going to need runtime parameterization (season length is fixed, not
  player-configurable, per spec.md's Season Schedule entity).

## Decision 2: `choiceOrdinal` needs no type change; only `pvpOrdinal` and `lapCount` do

**Decision**: `RunStage.choiceOrdinal` stays typed as `number` (its
existing type) — only its authored range grows from 1-4 to 1-8, a data
change, not a type change. `RunStage.pvpOrdinal` (`1 | 2` today) and
`RunStage.lapCount` (`10 | 12` today) are the two fields whose
TypeScript union type must actually widen, since both are narrow
literal unions today.

**Rationale**: Direct inspection of `run.ts` confirms `choiceOrdinal?:
number` was never narrowed to a literal union in the first place — only
`pvpOrdinal` and `lapCount` were. FR-002's "MUST widen to support values
1 through 8" is still accurate as a requirement on the *system's*
supported range, but implementing it requires zero type-level change for
`choiceOrdinal` — only the literal array's authored values change.

**Alternatives considered**:
- Narrow `choiceOrdinal` to a literal union now (`1 | 2 | ... | 8`) for
  symmetry with `pvpOrdinal`: rejected — no other code depends on
  `choiceOrdinal` being a closed union (unlike `pvpOrdinal`, which
  `012-multi-ghost-contest`'s rival-level lookup and
  `013-race-spectacle`'s track-selection formula both switch over), so
  narrowing it now would be an unrequested type change with no
  consumer that benefits from it.

## Decision 3: A concrete lap-count progression for planning/testing purposes: 10, 12, 14, 16

**Decision**: For the purpose of writing concrete tests and an
authored array literal, the four PvP stages use lap counts 10, 12, 14,
16 — continuing today's existing +2 arithmetic step from ordinal 1 (10)
to ordinal 2 (12) out to ordinals 3 and 4. This is a planning default,
not a locked balance decision — spec.md FR-003 explicitly leaves the
exact progression open as a tuning pass.

**Rationale**: Tasks need concrete numbers to write RED tests against;
"the exact value is TBD" cannot itself be asserted in a test. Continuing
the existing arithmetic pattern is the smallest, most predictable choice
that requires no new design judgment — a future balance pass can change
these four numbers without touching this feature's structural code
(`RunStage.lapCount`'s widened type already accommodates any future
value in that neighborhood).

**Alternatives considered**:
- Repeat the existing 10/12 pair twice (10, 12, 10, 12): rejected — would
  mean the season's difficulty doesn't monotonically increase across all
  four PvP stages, which reads as a design regression compared to
  today's already-increasing 10→12 shape, without any stated reason to
  prefer it.

## Decision 4: `RunScene.ts`'s hardcoded shape guard is a direct value update, not a redesign

**Decision**: `RunScene.ts:76`'s `run.stages.length === 6` becomes
`run.stages.length === 12` — a one-token change, found by direct
grep during this feature's own grounding pass, not by broader
refactoring.

**Rationale**: This guard exists purely as a runtime shape-validation
check (confirming `run.stages` looks like a real, complete `Run` before
rendering it) — it has no other role. Updating the literal value is the
entire fix; no structural change to the guard's purpose or surrounding
logic is warranted.

**Alternatives considered**:
- Replace the hardcoded length check with a more general "is this an
  array of `RunStage`-shaped objects" structural check that doesn't
  pin an exact length: rejected as out of scope — this feature's job is
  to grow the season to 12 stages, not to relax an unrelated guard's
  strictness; a looser guard is a separate hardening decision the owner
  hasn't asked for.

## Decision 5: `012`/`013`'s ordinal-consuming formulas require zero code change, confirmed by direct inspection

**Decision**: No change is planned to
`012-multi-ghost-contest`'s rival-profile-by-level resolution, the
existing sponsor `"win-next-race"`/`"target-race-time"` next-PvP-stage
lookup (`objectiveForKind`, `run.ts`), or `013-race-spectacle`'s
track-selection formula. This feature's own integration tests (Delivery
Order step 5) exist to *confirm* this, not to implement any change in
those areas.

**Rationale**: Direct inspection during this feature's grounding
confirmed: `012-multi-ghost-contest/spec.md`'s own FR-004 already states
rival level "is expected to gain more distinct levels once the
season-length growth in `specs/skribidi-gap-decisions.md` §7 lands — no
new progression concept needs to be invented for this feature" (written
in anticipation of exactly this feature). The sponsor lookup
(`run.ts`'s `objectiveForKind`, and the "find the next PvP stage" logic
in `completePvpEncounter`) already does `run.stages.slice(...).find(stage
=> stage.kind === "pvp")` — a scan with no hardcoded bound, already
correct for any number of PvP stages.

**Alternatives considered**:
- Add explicit ordinal-4-specific handling to any of these formulas "to
  be safe": rejected — would contradict the direct evidence that none of
  them are bounded to ordinal 2 today; adding unrequested special-casing
  where none is needed is exactly the kind of premature complexity this
  project's conventions avoid.
