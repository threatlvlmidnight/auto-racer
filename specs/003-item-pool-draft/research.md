# Phase 0 Research: Item Pool & Performance-Identity Draft Weighting

All unknowns from Technical Context are either inherited unchanged from `002-item-slots` or resolved below. No `NEEDS CLARIFICATION` markers remain from spec/clarify.

## Decision: Identity tag is an optional field, absent means neutral

**Decision**: `OfferedItem` gains `identityTag?: IdentityTag`, where `IdentityTag` is a literal union currently containing only `"performance"`. An item with no `identityTag` is neutral.

**Rationale**: The spec's Clarification answers describe neutral items as "untagged," not as carrying an explicit `"neutral"` tag value — modeling absence-as-neutral matches that language directly. It's also the smaller diff: existing items (002's original 5) don't need a field added to mark them neutral, only the new performance-tagged items need the field set at all.

**Alternatives considered**:
- A required `identityTag: "performance" | "neutral"` field. Rejected: makes "neutral" a first-class tag value alongside real identities, which will look wrong once Driver/Strategy and Unsportsmanlike tags are added later (neutral isn't an identity, it's the absence of one) — see `specs/vision.md`.

## Decision: Buff items extend `OfferedItem` with optional fields, not a discriminated union

**Decision**: `OfferedItem` gains `buff?: { boostPercent: number }`. When present, the item is a "buff item" (FR-009); its own `timeModifier` MUST be `0` (a buff item's effect is entirely expressed through `buff`, never both). A pure function `applyBuffs(heldItems: OfferedItem[]): OfferedItem[]` in the new `src/simulation/buffs.ts` returns a copy of `heldItems` where every non-buff item sharing a buff item's `identityTag` has its `timeModifier` scaled by `(1 + totalMatchingBoostPercent / 100)`. `build.ts`'s `resultingTime` calls `applyBuffs` before summing.

**Rationale**: An optional field on the existing flat interface is the smallest change that satisfies FR-009 today — this feature only needs exactly one new effect kind. Scaling (rather than flatly adding seconds) is what makes a buff "amplify another item's effect" rather than act as a second, independent direct modifier, matching User Story 4's framing and the Clarification's "boosts the magnitude of other held items" language. Pulling the resolution step into its own named, separately-tested module (rather than inlining it into `resultingTime`) matches `002-item-slots`'s own precedent of extracting `slots.ts` once simulation logic grew past one function.

**Alternatives considered**:
- A discriminated union (`type Item = DirectItem | BuffItem`). Rejected for now: bigger diff against every existing `OfferedItem` consumer (`PrepareScene`, `resultFormatting.ts`, both test suites) for a feature that only needs one non-direct effect kind. Worth revisiting once a second non-direct effect kind exists (per `specs/DEFERRED.md`'s richer item-synergy entry).
- Inline the boost calculation directly inside `resultingTime`. Rejected: mixes two responsibilities (resolving synergy, then summing) in one function body, and would be harder to unit-test the boost math in isolation from the summing math.

## Decision: Weighted draw takes its randomness as an injected function, not `Math.random()` internally

**Decision**: New `src/simulation/draft.ts` exposes `drawItem(pool: OfferedItem[], targetTag: IdentityTag, tagWeight: number, rng: () => number): OfferedItem`. It first uses `rng()` to choose the tag-group (tagged vs. neutral, compared against `tagWeight`), then a second `rng()` call to pick uniformly within that group. `PrepareScene` calls it with `Math.random`; tests pass fixed or scripted values.

**Rationale**: The constitution's "framework-free, strictly TDD'd simulation core" discipline (established in 001, carried through 002) requires `src/simulation/` functions to be deterministically testable. A function that calls `Math.random()` internally can't be asserted against exactly — injecting the entropy source as a parameter is the smallest possible seam that keeps `drawItem` a pure function of its inputs, mirroring how `resolveContest` and `buildTimeline` avoid any hidden non-determinism.

**Alternatives considered**:
- Weight at the individual-item level (assign each item its own selection probability). Rejected: harder to reason about and test against a simple "≈75% tagged / ≈25% neutral" requirement (FR-005/SC-002), and the per-item weights would need re-normalizing every time the pool's tag mix changes.
- Pull in a seeded-PRNG dependency (e.g., a seedrandom package). Rejected: unnecessary new dependency for a single weighted choice; an injected plain function achieves the same testability with zero new dependencies, consistent with the project's existing "no new deps for simulation logic" pattern.

## Decision: Statistical test strategy for the weighted draw

**Decision**: `draft.test.ts` includes (a) a determinism test — fixed/mocked `rng` return values map to an exact expected item, asserted directly — and (b) a distribution test — a large sample (N ≥ 1000) of draws using real `Math.random()` (or a wide sweep of stubbed values), asserting the tagged-item proportion falls within an explicit tolerance band (e.g., 65%-85%) around the 75% target, rather than asserting an exact count.

**Rationale**: FR-005/SC-002 describe a probabilistic guarantee ("approximately 75%"), which an exact-count assertion can't honestly test without either being flaky (real randomness) or defeating the point (mocked to always return the same value). A tolerance-band test over a large sample is the standard way to hold probabilistic code to a measurable, non-flaky bar.

**Alternatives considered**:
- Only test determinism with mocked `rng`, skip distribution testing entirely. Rejected: would leave FR-005/SC-002's actual claim (the real-world ratio) unverified — the whole point of the requirement is the aggregate behavior, not just that some deterministic branch exists.

## Decision: Offer round count and cadence are unchanged

**Decision**: `PrepareScene`'s `OFFER_ROUNDS = 5` stays as-is. Only the item-selection line inside `renderRound()` changes, from `ITEM_POOL[this.round % ITEM_POOL.length]` to `drawItem(ITEM_POOL, ACTIVE_IDENTITY_TAG, TAG_WEIGHT, Math.random)`.

**Rationale**: Per spec.md's Assumptions, the real run/encounter structure (how many offers make up a run) remains explicitly out of scope for this feature, same as it was for `002-item-slots`. Changing the round count now would smuggle in an unmade design decision about run structure.

**Alternatives considered**:
- Increase round count to match the larger pool (e.g., more rounds since there's more to draw from). Rejected: no spec requirement calls for this, and it would conflate "how many items exist" with "how many offers a run has" — two decisions the spec keeps deliberately separate (see `specs/vision.md`, "Run structure / encounter system").

## Everything else

All other Technical Context values (language, dependencies, testing framework, target platform, project type, performance goals) are unchanged from `002-item-slots`'s own `research.md`/`plan.md` — no new research was needed for them.
