# Quickstart and Verification: Item Adjacency Buffs

## Scope boundary

This feature requires no generated images, imported art, cropping, labeling, or
audio. The coding agent may implement code-native text, badges, focus states,
and connector geometry. It must not take screenshots or close the manual visual
gate.

## Automated implementation workflow — `[CODE-DEEPSEEK]`

Write the listed tests before their implementation task and confirm the focused
test fails for the intended missing behavior.

```bash
npx vitest run tests/unit/adjacency.test.ts tests/unit/tiering.test.ts tests/unit/laps.test.ts
npx vitest run tests/unit/garage.test.ts tests/unit/adjacencyPresentation.test.ts tests/unit/items.test.ts
npx vitest run tests/integration/adjacency-flow.test.ts tests/integration/pre-race-setup.test.ts tests/integration/practice.test.ts tests/integration/result-scene.test.ts
npm test
npm run lint
npm run typecheck
npm run build:pages
```

The implementer records command outcomes here but does not mark manual QA
complete.

## Deterministic fixture matrix

Automated coverage must include:

| Fixture | Required assertion |
|---|---|
| Empty build | valid graph, no links/contributions |
| End source + empty neighbor | one inactive empty-target link |
| End source + mismatch | one predicate-mismatch link |
| End source + qualifying neighbor | one active contribution |
| Inner source + two qualifying neighbors | two equal active contributions |
| Two sources around one target | both add; two separate receipts |
| Mutual sources | each reads authored snapshot; no recursion |
| Full four-source build | finite one-pass resolution with canonical ordering |
| Reordered runtime slot array | deep-equal graph, links, totals, and contest |
| Storage source/target | no adjacency node or contribution |
| Tier 1/2/3 source | exactly 100%/115%/130% clause value |
| Existing Buff/Synergy/modification/setup | adjacency value unchanged |
| Unknown version/malformed clause | typed rejection, no partial result |
| No adjacency clauses | deep-equal current stats and contest regression |

## Automated interaction acceptance

- Pointer, keyboard, and touch paths consume the same adjacency preview model.
- Move, swap, replace, install from storage, remove to storage, and upgrade
  projections reconcile with successful commit.
- Preview clearly classifies newly active, broken, changed, and unchanged links.
- Static offered/stored inspection retains clause copy while reporting no active
  installed link.
- Test Day and scored race for identical locked inputs retain deep-equal graph
  and contribution evidence.
- Pause, 1×/2×, skip, and result transition do not change retained adjacency.

## Manual acceptance — `[MANUAL-FRONTIER-OR-OWNER]`

Perform only after every automated gate passes. The coding agent must leave
this section unchecked.

- [ ] At the production target viewport, inspect a source at both an end and an
  inner slot; link direction and active/inactive state are immediately legible.
- [ ] Move an item and confirm gained/broken link information does not overlap
  item cards, buttons, credits, garage/storage labels, or the selected inspector.
- [ ] Repeat with a dense four-source build and the smallest supported layout;
  information remains readable without hover.
- [ ] Verify pointer, keyboard, and touch-equivalent selection paths show the
  same source, target, predicate, stat, and exact contribution.
- [ ] Disable/reduce color cues conceptually or through browser tooling; text,
  shape, focus, and persistent rows preserve complete meaning.
- [ ] Inspect the same active contribution in pre-race, Test Day, race, and
  Results; source/target/value remain consistent and no playback UI overlaps.
- [ ] Confirm the four retrofitted items need no missing artwork and remain
  compatible with the later Feature 037 item-art overlay.

Record manual findings in a dated owner/frontier QA file. Do not ask the coding
agent to capture screenshots or make qualitative visual judgments.
