# Phase 0 Research: Build Testing Access - Test Day

## Decision: Test Day is a preparation route, not a run stage or encounter

**Rationale**: `run.ts` owns a fixed six-stage schedule and advances only through
`completeNonPvpEncounter` or `completePvpEncounter`. Test Day must be repeatable
without changing stage, active encounter, choices, or history, so availability is
derived from the current run and stable UI state while session data lives outside
`Run`.

**Alternatives considered**:
- Add a practice encounter type. Rejected because it changes the six-stage model
  and creates accidental progression/history semantics.
- Insert a seventh stage. Rejected because it directly violates the requested run
  contract and makes practice non-repeatable.

## Decision: Eligible origins carry an explicit return context

**Rationale**: Run hub, stable supplier/reward preparation, and pre-start PvP
briefing each need to return to the exact scene and encounter context. A typed
`PracticeReturnContext` records route, run ID, active encounter ID when present,
and a `ProtectedPreparationOrigin` containing the three-category/four-context
identity, complete encounter payload, current selection, offers/stock/purchases,
restock state, and route-local focus/navigation tokens. Availability rejects
dragging, confirmation, transaction, settlement, completed, unavailable, or
malformed states with a specific reason.

**Alternatives considered**:
- Always return to `RunScene`. Rejected because it loses the acquisition surface
  and violates exact-origin restoration.
- Infer the origin from `Run.activeEncounter` after practice. Rejected because
  malformed or future states could silently choose the wrong route.

## Decision: Lock a deep immutable build snapshot at Start Test

**Rationale**: The session copies the complete current `Build`, including board,
storage, car, item definitions, and all effect-relevant fields, then deep-freezes
the copy in development/test builds. A canonical fingerprint identifies input
equality for repeatability and comparison. The mutable preparation run is never
passed to simulation as the build input.

**Alternatives considered**:
- Retain a reference to `run.build`. Rejected because later preparation mutation
  could change practice inputs.
- Store item IDs only. Rejected because catalog changes or effect fields would make
  the session depend on mutable external data.

## Decision: Practice has a fixed, RNG-free input policy

**Rationale**: Initial practice always uses config ID `test-day-v1`, `ghost-001`,
5.85 seconds per lap, and 10 laps. No random source or run seed is accepted by the
practice resolver. The run seed remains protected state but does not influence
practice. Resolution inputs are exactly the locked snapshot, fixed config, and the
versioned existing contest rules.

**Alternatives considered**:
- Derive a seed from the run or session. Rejected because the current simulation
  is deterministic and adding unused randomness obscures the contract.
- Reuse the scheduled PvP lap count or opponent. Rejected because Stage 6 has 12
  laps and the benchmark must remain stable across preparation contexts.

## Decision: Reuse `resolveContest` and `playback.ts` without a parallel ruleset

**Rationale**: `resolveContest(build, ghost, lapCount)` and
`buildPlaybackSchedule(result)` are already pure, deterministic, and tested.
Practice constructs their inputs from the locked snapshot and fixed config, then
stores their outputs. Presentation reads those facts and never recalculates race
times, gaps, outcomes, or animation timing.

**Alternatives considered**:
- Add a simplified practice estimator. Rejected because it can drift from scored
  contest rules and violates transparency.
- Copy lap or playback logic into a practice module. Rejected because duplicated
  race rules would create two authorities.

## Decision: Compare one explicit normalized contest/evidence projection

**Rationale**: Determinism and scored-rule equivalence use a single
`PracticeComparisonProjection`. It contains the authoritative `ContestResult`
(outcome, player/rival totals, signed gap, and ordered player/rival lap facts),
plus normalized playback facts, contribution facts, and reconciliation facts.
Normalization preserves numeric values and authored chronology while emitting
arrays in stable order: laps by lap number, playback events by schedule sequence,
contributions by lap/source/location/effect kind, buff applications by
source/target/type, and reconciliation checks by check key. It excludes practice
session/result IDs, route or encounter identity, focus/navigation metadata,
timestamps, and every other non-simulation envelope field.

For the same locked snapshot, `ghost-001`, 10 laps, and identical inputs, practice
must equal both another practice projection and the projection built directly
from `resolveContest(snapshot.build, ghost-001, 10)` plus the authoritative
playback helpers. Equality is exact direct structural equality; no tolerance,
summary-only comparison, re-simulation, or practice-specific playback mapping is
allowed.

**Alternatives considered**:
- Compare complete practice envelopes. Rejected because intentionally unique IDs
  and navigation metadata are not simulation facts.
- Compare totals or hashes only. Rejected because equal totals can hide different
  lap, playback, contribution, or reconciliation facts.

## Decision: Emit explanation evidence at the lap computation source

**Rationale**: Current `FiredItem` only reports ID and a value, which cannot fully
distinguish direct time, flat/stacking/count buffs, storage activity, cooldown,
zero effects, or minimum-lap clamps. `laps.ts` must emit immutable evidence while
it already has active/all-held sets, boost state, pre-clamp time, and target
relationships. `ContestResult` remains the single fact source consumed by both
scored and practice presentation.

**Alternatives considered**:
- Reconstruct evidence in the result scene. Rejected because presentation would
  duplicate simulation and could disagree with the result.
- Show only fired effects. Rejected because inactive/zero/unmet states would be
  ambiguous and FR-011 explicitly requires them.

## Decision: Use dedicated responsive practice Contest and Result scenes

**Rationale**: Existing scored `ResultScene` imports the settlement bridge, while
practice must have no settlement authority. Dedicated practice scenes reuse pure
simulation/playback and optional render helpers but do not import
`completePvpEncounter` or `continueRunFromResult`. They also own an adaptive
vertical layout; the existing 800x450 `FIT` canvas would scale 14px text below
14 CSS pixels at 390px width.

**Alternatives considered**:
- Add a practice boolean to scored `ResultScene`. Rejected because one wrong branch
  could invoke settlement and because the fixed layout cannot satisfy mobile text.
- Duplicate simulation in separate scenes. Rejected; only presentation is
  separate, while contest and playback facts remain shared.

## Decision: Protect the whole run plus explicit derived scored context

**Rationale**: Before entry, tests capture a deep clone of the complete `Run` and
a protected projection naming run ID/seed, status, stage index/states, choices,
active encounter/payload, credits/transactions, sponsor, offers, build/storage,
history, derived next opponent/configuration, scored-result count, and every
stored RNG-relevant input. After return, both the entire run and projection must
be strictly deeply equal. Normal in-memory return routes the same `Run` object;
reload recovery reconstructs a deeply equal value because object identity cannot
survive serialization.

**Alternatives considered**:
- Assert only credits/stage/history. Rejected because offer, sponsor, build,
  opponent, or future RNG cursor mutation could escape detection.
- Maintain a hand-written subset only. Rejected because whole-Run equality is the
  forward-compatible backstop; the named projection makes FR-027 auditable.

## Decision: Completed practice comparison is local; reload recovery is temporary

**Rationale**: A memory-only cache retains the latest two completed sessions for
one run ID and clears on run mismatch, completion, abandonment, or unavailable
state. Separately, a versioned `sessionStorage` recovery capsule is written before
practice navigation so reload/interrupt can restore the unchanged origin run and
route. It is cleared on return and never records scored history or comparison.
Invalid/mismatched capsules produce an unavailable screen and never create a run.

**Alternatives considered**:
- Persist practice history. Rejected as out of scope and likely to blur scored
  history boundaries.
- Keep all recovery data only in scene memory. Rejected because browser reload
  would lose the origin and could trigger current fallback run creation.

## Decision: Recovery uses canonical JSON plus a versioned FNV-1a 64-bit checksum

**Rationale**: `practiceRecovery.ts` owns a synchronous browser-supported codec.
It creates a canonical JSON payload by recursively sorting object keys, preserving
array order, encoding JSON primitives consistently, and rejecting `undefined`,
functions, symbols, non-finite numbers, and cycles. The protected payload covers
the complete origin `Run`, every named `ProtectedRunState` and preparation field,
the locked practice snapshot, exact `PracticeReturnContext`/route origin, and the
fixed `test-day-v1` configuration. The record stores schema version
`test-day-recovery-v1`, the canonical payload text, and fingerprint
`fnv1a64-v1:<16 lowercase hex>` computed over its UTF-8 bytes.

FNV-1a is available without a dependency or asynchronous Web Crypto plumbing and
is stable across supported browsers. It is an accidental-corruption and mismatch
check, not authentication or security: session storage is controlled by the same
page and a malicious editor can recompute it. Reads recompute the fingerprint,
parse the canonical payload, reserialize it to require byte equality, validate
the full typed schema, and cross-check run ID, origin encounter/payload, snapshot,
and fixed config. Failures distinguish `unsupported-version`,
`fingerprint-mismatch`, and `payload-mismatch` (including parse, non-canonical,
schema, run, origin, snapshot, or config disagreement). Any failure returns an
unavailable state without fallback navigation or settlement.

**Alternatives considered**:
- Store unverified JSON. Rejected because truncation or stale/mixed context could
  restore the wrong preparation origin.
- Use SHA-256 through Web Crypto. Rejected because cryptographic security is not
  required for same-origin temporary state and its asynchronous API complicates
  the otherwise synchronous recovery boundary; it would not prevent same-origin
  tampering without a secret.
- Treat checksum equality as sufficient. Rejected because canonical byte equality
  and typed payload invariants are still required to detect structural mismatch.

## Decision: Strict TDD for contracts, focused integration plus browser evidence

**Rationale**: The constitution's testing-discipline TODO is resolved here as
strict red-green-refactor for `laps.ts`, `practice.ts`, reconciliation, protected
state, and comparison logic. Integration tests prove routing and import/authority
separation. Browser validation covers keyboard, touch, reduced motion, pause/speed,
responsive layouts, interruption, and explicit unavailable states.

**Alternatives considered**:
- Manual validation only. Rejected because deterministic output and zero mutation
  are release gates requiring retained repeatable evidence.
- Scene snapshots only. Rejected because they cannot prove pure resolution,
  settlement non-invocation, or complete protected-state equality.
