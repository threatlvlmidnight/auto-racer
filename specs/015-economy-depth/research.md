# Research: Economy Depth

## Decision 1: `"failed"` is a new `RunStatus` value, checked at the existing `advanceRun()` hook

**Decision**: `RunStatus` becomes `"active" | "completed" | "unavailable"
| "failed"`. The reputation-zero check happens inside the existing
private `advanceRun()` function — the same place that currently decides
whether `stageIndex + 1 >= stages.length` sets `"completed"` — checked
*before* the normal completion check, so a run that both finishes Stage 6
and has zero reputation at that exact moment resolves as `"failed"`, not
`"completed"` (reputation loss always takes priority when both would
apply simultaneously).

**Rationale**: `advanceRun()` is already the single place a run's status
changes at the end of an encounter — reusing it means the reputation
check can't be bypassed by some other code path advancing a run a
different way. A new status value (rather than reusing `"completed"`
with a flag) is what the spec (FR-003) explicitly requires, and matches
this codebase's own precedent: `"unavailable"` already gets its own
distinct status and its own outcome screen (`RunScene.ts`) rather than
being folded into an existing state.

**Alternatives considered**:
- Check reputation in a new, separate function called after
  `advanceRun()`: rejected — creates two places a run's terminal status
  can be decided, risking one being called without the other on some
  future code path.
- Reuse `"completed"` with a `Run.failed: boolean` flag: rejected during
  clarify — explicitly what FR-003 rules out; blurs the distinction the
  whole feature exists to introduce.

## Decision 2: Reputation decrements at the same point outcomes are already recorded

**Decision**: The reputation check reads the same PvP `outcome`
(`"win"|"loss"|"tie"`) and sponsor `SponsorResolution.succeeded` values
already computed by `resolveContest`/`resolvePendingSponsor` — no new
"was this bad?" computation is introduced. A lost PvP contest or a failed
sponsor objective each independently trigger one reputation decrement;
neither stacks with the other in the same stage (they can't — a stage is
either a PvP stage or a non-PvP choice stage, never both).

**Rationale**: These outcome values already exist and are already the
source of truth for champ points, income, and history — reusing them
for reputation, rather than adding a parallel "did this go badly" check,
keeps exactly one place that decides what a PvP/sponsor result means.

**Alternatives considered**:
- A generic "any non-ideal result" reputation hook applying to every
  encounter type (including Parts Supplier/Reward Draft): rejected —
  FR-002 explicitly scopes reputation to PvP loss and failed sponsor
  objective only; those encounter types have no comparable
  win/loss-shaped outcome to hook into.

## Decision 3: Interest and sell-back are new `CreditTransactionKind` values, computed by the same `transactionFor`-style pattern

**Decision**: `CreditTransactionKind` gains `"interest"` and
`"sell-back"` alongside the existing six values. Both compute their
`amount` and call the same balance-tracking pattern `transactionFor`
already uses (`balanceAfter = run.credits + amount`, throws if negative
— though neither interest nor sell-back can ever produce a negative
amount by construction).

**Rationale**: `transactionFor` is already the single place a credit
change becomes an inspectable transaction record. Adding two more kinds
to the existing closed union, rather than a new economy substructure,
is the direct implementation of the "layer onto existing systems"
constraint stated in the spec's own Assumptions.

**Alternatives considered**:
- A separate `interestTransactions`/`sellTransactions` array on `Run`:
  rejected — fragments run history across multiple arrays a consumer
  would need to merge and re-sort to get one chronological picture,
  directly working against FR-013's inspectability requirement.

## Decision 4: `sellItem` is a new function alongside `garage.ts`, not a `GarageCommand` variant

**Decision**: `sellItem(context, source)` is a new, separate function —
not a new `GarageDestination`/`replacement` variant on the existing
`GarageCommand` contract. It removes the item from its source position
(reusing the same source-clearing logic `commitGarageCommand` already
has) and returns both the updated build and the credit amount to be
applied via a `"sell-back"` transaction.

**Rationale**: `GarageCommand` is a *movement* contract (source →
destination within the build); selling has no destination at all — it's
closer in shape to `declineReward`/`leaveSupplier` (an encounter-level
action with an economic side effect) than to a placement. Forcing it into
`GarageCommand`'s source/destination/replacement shape would mean
inventing a fake "destination" for an operation that doesn't have one.

**Alternatives considered**:
- A `GarageDestination` variant like `{ area: "sold" }`: rejected — every
  other destination in that contract is a real place an item can be
  found afterward; "sold" isn't a place, it's an item leaving the build
  entirely, a fundamentally different kind of operation.

## Decision 5: Card locking is a `StockEntry.locked` boolean, filtered by the existing `restockSupplier`

**Decision**: `StockEntry` gains `locked: boolean` (default `false`).
`restockSupplier`'s existing `.map()` over stock entries — which
currently replaces every non-purchased entry unconditionally — adds one
more condition: skip entries where `locked === true`, leaving their
`item` unchanged. A new `toggleLock(run, encounterId, stockId)` function
flips the flag.

**Rationale**: `restockSupplier` already has the exact replacement loop
this needs to skip over conditionally — extending its existing
`entry.state === "purchased" ? entry : { ...entry, item: ... }` branch
with one more condition (`|| entry.locked`) is the smallest possible
change that satisfies FR-010/FR-011, and requires no new payload shape.

**Alternatives considered**:
- A separate `lockedOfferIds: string[]` array on the payload: rejected —
  a boolean on the entry itself is co-located with the data it modifies
  the treatment of, and needs no separate array to keep in sync.

## Decision 6: Win/loss streaks are out of scope — no placeholder field is added

**Decision**: No `Run.streak` field, transaction kind, or any other
scaffolding for a future streak mechanic is added by this feature. The
deferral (resolved during `/speckit.clarify`) is recorded only in
`specs/skribidi-gap-decisions.md` and this feature's own spec
Assumptions — not as dead code or an unused type in the implementation.

**Rationale**: Adding an inert placeholder now would be speculative code
for a mechanic that isn't specified yet (what exactly counts, what the
threshold is, what the bonus is — none of that is decided). Building it
when `009-run-progression`'s season-length growth actually lands, with
real requirements, avoids guessing wrong now and reworking later.

**Alternatives considered**:
- Add an unused `Run.streak` field now "to save a migration later":
  rejected — this project's own conventions avoid speculative
  abstraction ahead of an actual requirement.
