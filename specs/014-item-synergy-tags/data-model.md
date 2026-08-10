# Data Model: Tag-Targeted Synergy Behavior

## Synergy Target

What an effect matches against.

```ts
type SynergyTarget =
  | { kind: "tag"; tag: string }              // matches ItemDefinition.synergyTags
  | { kind: "category"; category: InstallationCategory }; // matches installationCategory
```

`tag` values are drawn from the 14 already authored across the item pool
(no new tags are introduced by this feature); `category` is `"power"` or
`"chassis"`.

## Synergy Condition

How many matches are required, and what shape of bonus results. A
discriminated union, open to a third `kind` later without touching the
first two (Research Decision 2).

```ts
type SynergyCondition =
  | { kind: "linear-per-count"; percentPerMatch: number }
  | { kind: "exact-other-count"; count: number; bonusPercent: number };
```

| Field | Rules |
|---|---|
| `linear-per-count.percentPerMatch` | Applied `percentPerMatch × matchCount` — the same scaling shape `007-count-synergy-buff` already established, now authorable against a `SynergyTarget` instead of only the identity tag |
| `exact-other-count.count` | The exact number of *other* matching items required (excludes the source item — FR-006); `0` is valid and is what "the lone Power item" authors as |
| `exact-other-count.bonusPercent` | Applied only when the held count of *other* matching items equals exactly `count` — not "at least," not "at most" |

## Synergy Effect

One authored effect on an item.

```ts
interface SynergyEffect {
  target: SynergyTarget;
  appliesTo: "others" | "self";
  condition: SynergyCondition;
  description: string;   // exact inspector text, same convention as ItemBehavior
}
```

| `appliesTo` | Meaning |
|---|---|
| `"others"` | Boost-Others: every other actively-installed item matching `target` receives the bonus |
| `"self"` | Self-Conditional: the source item's own contribution receives the bonus when `condition` is met by *other* actively-installed items matching `target` |

An item's `synergyEffects: readonly SynergyEffect[]` may be empty (most
items), contain one effect, or (later, once authored) more than one — the
type does not cap the count, though this feature's own example content
authors at most one per item.

## `ItemDefinition` Extension

| Field | Type | Rules |
|---|---|---|
| `synergyEffects` | `readonly SynergyEffect[]` | New, optional, defaults to empty. Independent of and unrelated to the existing `buff` field, which keeps its current identity-tag-only shape and behavior unchanged (FR-008). |

## Synergy Resolution

```ts
function resolveSynergyEffects(build: VehicleBuild): Map<string, SynergyResolution>;
// keyed by slotId

interface SynergyResolution {
  appliedDeltaPercent: number;      // net effect on this slot's item, folded into effectiveItem
  applications: SynergyApplication[]; // one per contributing effect, for attribution
}

interface SynergyApplication {
  sourceItemId: string;    // the item whose authored SynergyEffect produced this
  target: SynergyTarget;
  conditionKind: SynergyCondition["kind"];
  appliedPercent: number;
  description: string;
}
```

Binding behavior:

- Reads only `build.slots` (actively installed items). `build.storage` is
  never inspected (FR-005, Research Decision 4) — a stored copy of any
  item, no matter how many, contributes nothing to any target's count.
- A `SynergyEffect`'s source item is excluded from its own target's count
  (FR-006) — both for `appliesTo: "others"` (it never boosts itself) and
  for `appliesTo: "self"` (its own presence doesn't count toward its own
  condition).
- Computed once per build, before the per-lap loop — composition doesn't
  vary lap to lap (Research Decision 3).
- Multiple simultaneously-applicable effects (from different source items,
  or a Boost-Others and a Self-Conditional effect both reaching the same
  slot) all apply; none is silently dropped or overwritten (spec.md Edge
  Cases).
- Pure and deterministic: identical `build` always produces an identical
  result.

## `ContributionEvidence` Extension

| Field | Type | Rules |
|---|---|---|
| `synergy` | `SynergyApplication[]`, optional | Present only when at least one synergy effect contributed to this contribution; lists every contributing effect for full attribution (FR-007). Parallel in shape/intent to the existing `installation` field. |

## `garageItemInspector` Extension

| Field | Type | Rules |
|---|---|---|
| `synergyEffects` | `SynergyEffectDisplay[]` | One entry per authored effect on the inspected item; each shows the target, the current live match count given the rest of the build, and whether/how much the effect currently applies — updates immediately as the build changes (FR-009). Empty for the ~90% of items with no authored synergy effect. |

No new top-level presentation function or scene is introduced — this
extends the existing inspector model only (FR-013, Research Decision 6).

## Validation Invariants

1. `resolveSynergyEffects` never inspects `build.storage` — verified by
   construction (it never receives storage as an input), not just by test
   coverage.
2. A `SynergyEffect`'s source item never appears in its own target's
   match count, for both `"others"` and `"self"` application.
3. `resolveSynergyEffects(build)` called twice with an identical `build`
   returns deeply equal results.
4. Every existing `buff`-driven item (item-012, item-014, item-015) and
   every existing test asserting their behavior is unaffected by this
   feature shipping — `synergyEffects` defaults to empty and never
   interacts with `buff`.
5. Every non-empty `ContributionEvidence.synergy` entry traces to a real,
   currently-held item's authored `SynergyEffect` — none is synthesized.
6. `resolveSynergyEffects` and everything downstream of it never reads
   another car's build, live input, or unseeded randomness (FR-010,
   Constitution Principle I/III).
