# Research: Roguelike Encounter Variety

## Stable held-item identity

**Decision**: Keep `ItemDefinition` immutable catalog data and introduce a retained
`ItemInstance` with `instanceId`, definition reference, tier, optional Workshop
Modification, and cumulative Scrutineering bonus. Vehicle slots and storage hold
instances rather than copying definitions and tier separately.

**Rationale**: Modification, impound, exchange, movement, and tier upgrades must
follow one exact item. Definition identity alone cannot distinguish duplicates.

**Alternatives considered**: Keying state by slot loses identity when moved;
keying by definition merges duplicates; side tables increase synchronization risk.

## Canonical physical-stat scale

**Decision**: Author and display Acceleration, Top Speed, Braking, and Cornering
on one canonical point scale. A deterministic balanced track corpus calibrates
the simulation adapter so each +1 point has marginal race-time value within a
10% spread. Track demand remains a visible contextual multiplier.

**Rationale**: Players and content authors should not need hidden 6:1:13 exchange
rates. Normalization belongs at the simulation boundary, not in UI formatting.

**Alternatives considered**: Exposed conversion ratios create cognitive tax;
equal-looking raw values without physics calibration are misleading.

## Resolution order

**Decision**: Resolve an item in this order: tier-1 definition; placement behavior;
modification derived from tier-1 values; tier multiplier applied independently to
base and modification; Scrutineering bonus applied to positive active race
contributions; setup/synergy composition. Preserve separate attribution records.

**Rationale**: Tier upgrades scale both axes without compounding an already-scaled
value, and exact contribution evidence remains explainable.

**Alternatives considered**: Applying modification after tier from rounded values
causes drift; one collapsed multiplier prevents useful inspection and tuning.

## Modification representation

**Decision**: Use a closed discriminated union: four stat grafts, `twin-tuned`,
`guarded`, and `adapted-mount`. Compatibility is pure and item-specific. Applying
a new modification replaces the old one only after exact confirmation.

**Rationale**: A closed union makes exhaustive resolution and deterministic
serialization possible while still allowing authored labels and descriptions.

**Alternatives considered**: Arbitrary scripts are difficult to validate and
replay; free-form modifier bags permit illegal recursive or no-op combinations.

## Encounter scheduling

**Decision**: Generate from declarative encounter definitions using named seed
domains. Filter eligibility, enforce a two-choice-stage selected-type cooldown,
reject two acquisition-primary entries, prioritize unmet guarantees, then select
from a stable sorted candidate list. Fall back through a fixed legal ladder.

**Rationale**: The algorithm terminates, is reproducible, and explains why an
offer appeared. Upgrade Workshop is guaranteed once in global stages 1–20 and
once in 21–40 when eligible; the 20 choice stages form the cadence domain.

**Alternatives considered**: Retry-until-valid can loop and shifts RNG consumption;
pure weights cannot guarantee variety or upgrade opportunities.

## Atomic operations and unavailable recovery

**Decision**: Every consequential action builds an immutable preview carrying a
state revision/fingerprint. Confirmation revalidates and applies one pure
transaction or returns typed `stale`/`unavailable` with no mutation.

**Rationale**: Scene revisits and inventory changes cannot turn a preview into a
partial charge, duplicate grant, or lost item.

**Alternatives considered**: Multi-step scene mutation leaves failure windows;
silently regenerating offers violates retained-choice determinism.

## Scrutineering lifecycle

**Decision**: Snapshot all other installed target instance IDs, reserve the
source slot, move the exact source instance into a pending impound, and settle
after the next scored race. Return it to the reserved slot before clearing the
effect. Sponsor and Scrutineering may coexist; only one unresolved effect of each
category is legal.

**Rationale**: Slot reservation removes ambiguous return/capacity behavior and
makes the voluntary one-race sacrifice visible throughout preparation.

**Alternatives considered**: Returning to storage can overflow; allowing the slot
to be filled forces destructive displacement; blocking all pending effects is
more restrictive than the accepted per-category rule.

## Exhibition authority

**Decision**: Reuse committed track, setup, lap, and playback authority in a solo
unscored mode. Precommit one objective each from time, activation, and demand;
settle an independent `ExhibitionResult` and +0–3 reputation only.

**Rationale**: It adds a meaningful driving encounter without contaminating
standings, rival records, Sponsor resolution, or Championship points.

**Alternatives considered**: A simulated menu check lacks spectacle/evidence;
reusing normal settlement risks scored-state side effects.

## Fitted and Improvised tuning

**Decision**: Audit every playable item and retain item-authored behavior. Target
20–30% beneficial Fitted contribution and 10–20% explicit Improvised drawback,
then validate the catalog through deterministic corpus evidence. No global hidden
alignment scalar is added.

**Rationale**: Placement becomes consequential and legible without erasing item
identity or requiring players to infer invisible math.

**Alternatives considered**: One global scalar is easy but flattens content and
contradicts the existing item-authored topology contract.

## Cross-feature ownership

**Decision**: Reconcile Feature 033 race-enrichment contracts before implementing
`Guarded`; consume its retained overtake-attempt hook. Limit Feature 034 visuals
to functional encounter/inspection states and leave global polish to Feature 035.

**Rationale**: This avoids parallel authority and prevents Feature 034 from
silently expanding into race simulation or whole-game visual remediation.
