# Phase 1 Data Model: Build Testing Access - Test Day

## Existing scored model boundary

`Run`, `RunStage`, `EncounterType`, `ActiveEncounter`, `RunHistoryEntry`, and the
six-stage schedule remain unchanged. Test Day may read a valid active `Run` but is
never stored in it and has no transition into `completePvpEncounter`.

## Entities

### TestDayAvailability

Derived decision for one visible preparation surface.

| Field | Type | Rules |
|---|---|---|
| `available` | boolean | True only for a valid active run and stable eligible origin. |
| `origin` | `run-hub \| acquisition \| pvp-briefing` | Must match the current route and encounter. |
| `returnContext` | `PracticeReturnContext?` | Present only when entry can preserve the origin. |
| `reason` | typed reason or `null` | Required for every visible disabled/unavailable action. |

Unavailable reasons include no run, malformed run/build, run ended, unstable
transaction/drag/confirmation, contest active, scored settlement active, missing
origin encounter, and recovery mismatch.

### PracticeReturnContext

| Field | Type | Rules |
|---|---|---|
| `route` | `RunScene \| PrepareScene` | Explicit, never inferred after practice. |
| `runId` | string | Must equal the protected run and recovery capsule. |
| `encounterId` | string or `null` | Required for acquisition and PvP briefing origins. |
| `origin` | availability origin | Used for validation and labels. |
| `originState` | `ProtectedPreparationOrigin` | Immutable exact state needed to validate and restore the concrete entry context. |
| `focusToken` | string | Restores the Test Day action or nearest stable control. |

### ProtectedPreparationOrigin

| Field | Type | Rules |
|---|---|---|
| `category` | `run-hub \| acquisition \| pvp-briefing` | One of three origin categories. |
| `context` | `run-hub \| supplier \| reward-draft \| pvp-briefing` | One of four concrete entry contexts. |
| `route` / `encounterId` | stable route and ID | Must agree with the active run and return context. |
| `encounterPayload` | deep-readonly payload or `null` | Complete payload, including offers/stock order and item state. |
| `selection` | stable selected offer/reward/control or `null` | Restored exactly; entering practice never commits or clears it. |
| `purchases` / `restockUsed` | immutable preparation facts | Present where applicable and unchanged on return. |
| `navigation` | route-local view/focus/scroll tokens | Presentation-only return facts; excluded from simulation comparison. |

The complete origin run remains authoritative. This entity makes preparation UI
facts outside `Run` explicit so recovery and cancel/exit cannot reconstruct or
default them.

### PracticeConfig

Immutable constant `test-day-v1`:

| Field | Value |
|---|---|
| `sampleRival.id` | `ghost-001` |
| `sampleRival.lapTime` | `5.85` seconds |
| `lapCount` | `10` |
| `randomPolicy` | `none` |
| `rulesAuthority` | existing `resolveContest`/`simulatePlayerLaps` contract |

The run seed and presentation controls are not resolution inputs.

### LockedPracticeBuild

| Field | Type | Rules |
|---|---|---|
| `build` | deep-readonly `Build` | Deep copy of car, board, storage, and item effect fields at Start Test. |
| `fingerprint` | string | Canonical deterministic representation; excludes labels and presentation state only if they are not effect-relevant. |
| `capturedRunId` | string | Navigation/validation association, not a simulation input. |

Feature 010 may extend this entity with entrant, vehicle, topology, slot,
installation state, and authored behavior. Feature 011 must not invent them.

### PracticeSession

| Field | Type | Rules |
|---|---|---|
| `id` | presentation-local string | Unique within the active page session; not random simulation input. |
| `runId` | string | Must match return context and protected state. |
| `state` | lifecycle state | See transitions below. |
| `returnContext` | `PracticeReturnContext` | Immutable after creation. |
| `config` | `PracticeConfig` | Always `test-day-v1`. |
| `snapshot` | `LockedPracticeBuild` | Created exactly once on Start Test. |
| `result` | `PracticeResult?` | Present only after successful pure resolution. |
| `failure` | typed reason or `null` | Never triggers fallback inputs or scored settlement. |

Lifecycle: `briefing -> resolving -> completed -> returning`. `briefing` may
return without a result. Any missing/mismatched context transitions to
`unavailable`; it cannot transition to scored settlement.

### ContributionEvidence

Immutable facts emitted by lap simulation, not reconstructed by scenes.

| Field | Type | Rules |
|---|---|---|
| `lap` | positive integer | Within configured lap count. |
| `sourceItemId` | string | Item responsible for the fact. |
| `sourceLocation` | board/storage | Captured snapshot location. |
| `effectKind` | direct/flat-buff/stacking-buff/count-buff/neutral | Distinguishes authored behavior. |
| `triggerState` | fired/cooldown/unmet/inactive-storage/zero | Explicit for every held item. |
| `baseContribution` | seconds or percent | Authored pre-buff value in its proper unit. |
| `buffApplications` | immutable list | Buff source, target item, type, and applied seconds/percent. |
| `resultingContribution` | seconds | Signed additive effect on lap time; buff summaries do not double count target effects. |
| `preClampLapTime` | seconds | Baseline plus additive direct effects. |
| `clampAdjustment` | seconds | Zero unless minimum lap time changes the result. |
| `resultingLapTime` | seconds | Equals `max(MIN_LAP_TIME, preClampLapTime)`. |
| `installation` | optional future data | Absent before feature 010; later copied from authoritative locked data. |

Per-lap additive direct contributions plus `clampAdjustment` reconcile baseline
to player lap time. Buff applications explain changes to target contributions
without being summed a second time. Zero/unmet/inactive entries remain visible.

### PracticeResult

| Field | Type | Rules |
|---|---|---|
| `sessionId` | string | Links result to one session only. |
| `configId` | `test-day-v1` | Disclosed benchmark. |
| `snapshotFingerprint` | string | Proves which immutable build resolved. |
| `contest` | deep-readonly `ContestResult` | Exact output of existing resolver with complete evidence. |
| `reconciliation` | summary | Exact lap, total, gap, outcome, and evidence checks. |
| `authority` | `practice-only` | Cannot be supplied to any run transition. |

No purse, sponsor, progression, encounter, analytics, or scored-history fields
exist on this entity.

### PracticeComparisonProjection

The sole value used for deterministic repeat and direct-authority comparison.
It is built from an already resolved result and authoritative playback output;
it never re-runs or approximates simulation.

| Field | Type | Rules |
|---|---|---|
| `contest` | normalized authoritative contest facts | Exact outcome, player/rival totals, signed gap, and ordered player/rival lap facts from `ContestResult`. |
| `playback` | normalized immutable playback facts | Exact schedule/frame facts ordered by authoritative sequence; excludes presentation clock, pause/speed, viewport, and animation state. |
| `contributions` | normalized `ContributionEvidence[]` | Ordered by lap, source item, source location, and effect kind; nested buff applications ordered by source, target, and type. |
| `reconciliation` | normalized reconciliation facts | Exact ordered checks and values for laps, totals, gap, outcome, contributions, and clamps. |

Normalization excludes practice session/result IDs, snapshot/navigation/route or
encounter identity, focus metadata, timestamps, and all other non-simulation
envelope fields. For identical snapshot, `ghost-001`, 10 laps, and inputs,
`practiceProjection` must be exactly deeply equal to `directProjection`, which is
produced from the exact `resolveContest` result and authoritative playback
helpers. Equality uses no numeric tolerance and cannot be replaced by totals-only
or fingerprint-only comparison.

### PracticeComparison

| Field | Type | Rules |
|---|---|---|
| `runId` | string | Both sessions must belong to this active run. |
| `previous` / `current` | completed session summaries | Latest two only; immutable. |
| `buildChanges` | slot/storage item changes | Derived from both fingerprints/snapshots. |
| `total`, `gap`, `outcome`, `laps`, `contributions` | typed deltas | Current minus previous; identical inputs yield numeric zero. |

This cache is memory-only, never part of `Run`, and clears on run identity/status
mismatch. Its presence cannot alter resolution.

### ProtectedRunState

An audit projection plus complete deep snapshot captured before entry:

- run ID and seed;
- status, stage index, and every stage state/configuration;
- available choices in order;
- active encounter identity, status, and complete payload/offers/stock/options;
- credits and all credit transactions;
- sponsor contract and resolution fields;
- active build board and storage with all item fields;
- complete scored history and scored-result count;
- derived next scored opponent ID, pace, and scheduled lap count;
- all stored RNG-relevant state (currently seed, generated choices, and payloads;
  any future RNG cursor/state must be added explicitly).

Acceptance requires strict deep equality of both the full `Run` snapshot and this
projection after return. Practice may observe these fields but never replace,
advance, append, settle, reroll, or mutate them.

### PracticeRecoveryRecord

Versioned temporary `sessionStorage` capsule owned by `practiceRecovery.ts`.

| Field | Type | Rules |
|---|---|---|
| `version` | `test-day-recovery-v1` | Any other value returns `unsupported-version`. |
| `payload` | canonical JSON string | Covers the complete unchanged origin `Run`, every named protected run/preparation field, locked practice snapshot, exact route/origin/encounter/navigation context, and `TEST_DAY_CONFIG`. |
| `fingerprint` | `fnv1a64-v1:<16 lowercase hex>` | FNV-1a 64-bit over UTF-8 payload bytes; recomputed before payload use. |

Canonical serialization recursively sorts object keys, preserves array order,
encodes JSON primitives consistently, and rejects `undefined`, functions,
symbols, non-finite numbers, and cycles. Read validation requires matching
version and fingerprint, successful typed parse, byte-identical canonical
reserialization, and agreement among run ID, protected origin encounter/payload,
return context, snapshot, and fixed config.

Typed failures are `unsupported-version`, `fingerprint-mismatch`, and
`payload-mismatch`; the latter covers parse, non-canonical, schema, run, origin,
snapshot, or config disagreement. The FNV checksum detects accidental corruption
or stale/mixed payloads. It is not authentication or a security boundary, so
payload validation remains mandatory even when the checksum matches.

The record exists only during active practice. Valid recovery and cancel/exit
from active playback return to the exact unchanged origin without settlement;
invalid data yields an unavailable state. It never contains completed comparison
history and is cleared after successful return.

## Relationships

- Availability validates one `Run` and creates one return context.
- Start Test creates one locked snapshot and one practice session.
- One session resolves one fixed config through the shared contest resolver.
- One practice result owns immutable contribution evidence and feeds playback,
  the deterministic comparison projection, result inspection, and optional
  latest-two comparison.
- Recovery and comparison stores remain outside `Run` and have no transition
  relationship to scored settlement.
