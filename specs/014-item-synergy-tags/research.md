# Research: Tag-Targeted Synergy Behavior

## Decision 1: A new `synergyEffects` field, kept separate from `item.buff`

**Decision**: `ItemDefinition` gains a new optional field, `synergyEffects:
readonly SynergyEffect[]`. The existing `buff` field (identity-tag-only,
driving item-012/014/015 today) is untouched — not generalized, not
reused, not deprecated.

**Rationale**: FR-008 requires existing buff items to keep working
unchanged. Reusing/generalizing `buff` to also carry tag/category targets
would mean every piece of code reading `item.buff` (`buffs.ts`,
`laps.ts`, tests) would need to handle the new target shapes even when
they're irrelevant to identity-tag buffs — real risk for zero benefit.
A separate field makes "existing buff items are untouched" a structural
fact, not a testing discipline to maintain by hand.

**Alternatives considered**:
- Generalize `item.buff.target` to accept an identity tag, synergy tag, or
  category: rejected — couples two independent mechanics (the original
  simple flat/stacking/count-synergy buff, and the new richer
  Boost-Others/Self-Conditional system) into one field's type, increasing
  blast radius on every future change to either.

## Decision 2: `SynergyTarget`/`SynergyCondition` as discriminated unions

**Decision**:

```ts
type SynergyTarget =
  | { kind: "tag"; tag: string }
  | { kind: "category"; category: InstallationCategory };

type SynergyCondition =
  | { kind: "linear-per-count"; percentPerMatch: number }
  | { kind: "exact-other-count"; count: number; bonusPercent: number };

interface SynergyEffect {
  target: SynergyTarget;
  appliesTo: "others" | "self";
  condition: SynergyCondition;
  description: string;  // exact inspector text, same pattern as ItemBehavior
}
```

**Rationale**: A discriminated union on `kind` is this codebase's existing
pattern for "closed set today, safely extensible later" (see
`ItemBehavior.kind: "time-modifier" | "buff-boost" | "none"`). Adding a
third `SynergyCondition` kind later is an additive change — new case, new
handler branch — never a breaking change to `"linear-per-count"` or
`"exact-other-count"`'s existing shape or the items already authored
against them. This directly satisfies FR-012's extensibility requirement
as a structural property, not a promise.

**Alternatives considered**:
- A single generic `{ minCount, maxCount, percentPerMatch }` shape
  covering both current cases via optional fields: rejected — makes an
  "exact-other-count" condition just a special case with
  `minCount === maxCount`, which is representable but obscures intent
  (harder to read, harder to add a genuinely different future shape like
  a track-context-dependent condition without further overloading one
  struct).

## Decision 3: Synergy resolves once per build, not per lap

**Decision**: `resolveSynergyEffects(build: VehicleBuild):
Map<slotId, SynergyResolution>` (or equivalent) is computed once, before
the per-lap loop, exactly where `resolveInstallation` is already called
once per slot in `laps.ts`. Its output folds into `effectiveItem`
alongside the existing Fitted/Improvised delta.

**Rationale**: Build composition (which items are actively installed)
doesn't change mid-race — there is no cooldown, no firing condition, no
lap-by-lap variation to a synergy target/condition's truth value. Treating
it as a per-lap concern (like buff stacking) would be needless complexity
for a value that's actually static for the whole contest. This mirrors
exactly how Fitted/Improvised resolution already works: computed once,
folded into the item's effective numbers, then the existing per-lap
cooldown/firing logic runs unchanged on top.

**Alternatives considered**:
- Resolve synergy inside `computeBoostsForLap` alongside buff stacking:
  rejected — that function's whole purpose is lap-varying stacking state;
  synergy has none, so putting it there would misrepresent it as
  lap-dependent and complicate a function that's already doing real
  per-lap work for buffs.

## Decision 4: Counting scope is `build.slots` only, matching FR-005 exactly

**Decision**: `resolveSynergyEffects` reads only `build.slots` (actively
installed items). `build.storage` is never inspected for synergy
purposes. Installation state (Fitted/Flexible/Improvised) among active
items does not affect whether an item counts — only presence in an active
slot matters.

**Rationale**: Directly implements the owner's explicit, deliberate
divergence from `007-count-synergy-buff`'s precedent (recorded in spec.md
FR-005). No ambiguity to resolve here — this decision exists to record
*where in the code* that rule is enforced (a single early filter to
`build.slots`, not scattered checks), so it can't accidentally regress if
`buffs.ts`'s storage-inclusive pattern is copied by habit later.

**Alternatives considered**: None — this is a direct implementation of an
already-resolved spec decision, not an open design question.

## Decision 5: Attribution via a new `synergy` field on `ContributionEvidence`

**Decision**: `ContributionEvidence` gains an optional `synergy?:
SynergyApplication[]` field, parallel to the existing `installation?`
field, listing every synergy effect that contributed to that item's
contribution this lap (source item ID, target, condition kind, applied
percent).

**Rationale**: `installation` already establishes the pattern for
"optional attribution field added to evidence, populated only when
relevant, consumed by result/practice presentation." Reusing that shape
for synergy keeps attribution facts uniformly discoverable rather than
inventing a second attribution convention.

**Alternatives considered**:
- Fold synergy attribution into the existing `buffApplications` array:
  rejected — that array's shape (`sourceItemId`, `targetItemId`, `type:
  "flat"|"stacking"|"count"`) is specific to identity-tag buff mechanics;
  forcing synergy attribution through it would either lose information
  (no room for `SynergyTarget`/condition kind) or require overloading
  `type` with meanings that don't apply to buffs.

## Decision 6: Garage inspector extension, no new UI paradigm

**Decision**: `garageItemInspector` (`garagePresentation.ts`) gains a
`synergyEffects: SynergyEffectDisplay[]` field on its return value, one
entry per authored effect on the inspected item, each showing its target,
current match count, and live applicable value given the rest of the
build. No new scene, panel, or presentation function is introduced.

**Rationale**: Directly implements FR-013 (no build-wide overview this
pass) and reuses `010-entrant-vehicle-garage`'s already-established
"inspector shows live, build-aware facts" pattern (the same function
already reports installation state, gained/lost behavior, and
affordability live).

**Alternatives considered**: A dedicated `SynergyPresentation` module:
rejected — no second presentation concept is needed for one additional
field on an existing, already-comprehensive inspector model.
