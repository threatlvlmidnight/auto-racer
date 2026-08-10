# Quickstart: Tag-Targeted Synergy Behavior

This guide validates the implementation against [spec.md](./spec.md),
[data-model.md](./data-model.md), and
[contracts/synergy-effect-contract.md](./contracts/synergy-effect-contract.md).

## Prerequisites

- Node.js and npm supported by the existing Vite project
- Dependencies installed with `npm install`

## Automated Validation

Run the complete regression suite and production/type build:

```bash
npm test
npm run build
npm run lint
```

Required focused coverage:

1. `resolveSynergyEffects` tests confirm: target matching by tag and by
   category; both condition shapes (`linear-per-count`,
   `exact-other-count` including `count: 0`); self-exclusion for both
   `"others"` and `"self"` application; storage items never counted;
   determinism across repeated calls.
2. Multi-effect composition tests confirm two Boost-Others effects
   targeting the same third item both apply and are both attributed.
3. `laps.ts` tests confirm a synergy delta folds into a slot's effective
   item alongside any Fitted/Improvised delta, and that
   `ContributionEvidence.synergy` correctly attributes it.
4. Regression tests confirm zero behavior change in every existing
   `item-012`/`item-014`/`item-015` (identity-tag buff) test after this
   feature ships (SC-005).
5. `garageItemInspector` tests confirm live, build-aware synergy values —
   not static description text — for any held item with an authored
   effect.

## Local Browser Run

Start the existing development server:

```bash
npm run dev
```

Use the URL printed by Vite.

## Scenario A: Boost-Others

1. Assemble a build holding a new example Boost-Others item (e.g. a
   "gearing" tag-targeting item) and another item sharing that tag.
2. Inspect the target item in the garage; confirm its live inspector
   shows the boost currently applying.
3. Remove the Boost-Others item; confirm the target item's inspector
   value returns to its unboosted state immediately.
4. Resolve a contest; confirm the target item's contribution in the
   result reflects the boost, attributed to the source item.

## Scenario B: Self-Conditional

1. Hold a new example Self-Conditional item (e.g. "+50 to this item's own
   effect, and if this is the only Power item held, +50% more") alone in
   the build (no other Power item).
2. Inspect it in the garage; confirm its live value shows the conditional
   bonus currently applying.
3. Add a second Power item to the build; confirm the inspector
   immediately shows the conditional bonus no longer applying, while the
   item's unconditional base effect remains.
4. Resolve contests in both states; confirm each result matches what the
   garage inspector showed beforehand.

## Scenario C: Storage Exclusion

1. Hold a Boost-Others item's target tag on an item placed in storage
   (not actively installed).
2. Confirm the Boost-Others effect does NOT apply — storage never counts,
   even though the tag is technically "held."

## Scenario D: Existing Buffs Unaffected

1. Assemble a build using an existing buff item (item-012, item-014, or
   item-015) exactly as before this feature shipped.
2. Confirm its behavior (boost amount, attribution) is byte-for-byte
   identical to pre-feature behavior.

## Release Gate

No constitutional gate blocks this feature (Constitution Check: all PASS).
Acceptance requires all automated checks and scenarios above, plus zero
regression in any existing buff-item test.
