# Implementation Readiness Plan — 2026-08-17

## Objective

Take every current non-image-generation feature through the remaining Spec Kit
stages to an implementation-ready handoff for the DeepSeek implementation
agent. Do not implement feature code during this planning program.

Asset creation remains a separate frontier/tool-owned lane. DeepSeek may wire,
preload, map, crop-safe-place, fall back from, and test approved assets, but its
handoff must not ask it to generate, select, art-direct, crop, clean, label, or
approve visual masters.

## Definition of implementation-ready

A package is ready for DeepSeek only when:

1. Its scope is represented by a current `spec.md`, not only an intake.
2. The custom Spec Kit clarification pass has resolved every decision that
   changes architecture, authority, content count, targeting, stacking,
   fallback, or acceptance.
3. `plan.md`, relevant `research.md`, `data-model.md`, contracts, and
   `quickstart.md` exist and agree with the specification.
4. `tasks.md` is dependency-ordered, exhaustive, and separates automated
   implementation from genuinely manual acceptance.
5. Tests are required before or alongside implementation for every new
   authority, transaction, deterministic projection, and regression.
6. `/speckit.analyze` reports no unresolved critical/high inconsistency.
7. Every dependency is either delivered or expressed as a typed input contract.
8. Asset inputs are represented by stable keys, dimensions, crop/safe-area
   metadata, provenance requirements, and fallbacks rather than generation work.
9. The handoff states which files and authorities must not change.
10. The handoff lists exact focused and full verification commands.
11. Manual verification is isolated into `[MANUAL-FRONTIER-OR-OWNER]` tasks
    that the coding agent is explicitly forbidden to execute or close.

## Ownership boundary

| Work | Owner |
|---|---|
| Simulation, transactions, deterministic targeting, services, UI layout, asset loading, rendering integration, fallbacks, and automated tests | DeepSeek implementation agent |
| Image concepts, reference sheets, generation prompts, master selection, visual consistency review, cleanup, cropping, transparency, labeling, and final exported visual assets | Frontier model plus purpose-built image-generation tools |
| Recorded-audio sourcing, license approval, editing, loop preparation, loudness normalization, codec exports, and listening approval | Frontier/human asset lane |
| Browser visual acceptance, screenshot capture/comparison, listening acceptance, qualitative art/UI judgment, and final product sign-off | Frontier verification model or owner |

## Feature classification

### Ready for coding handoff now

#### Feature 035 — Interface Clarity remediation

- Stage: implementation-ready remediation.
- Open work: T043 and T045–T050.
- DeepSeek scope: Pre-Race, Supplier, and Contest layout/precision fixes,
  production-path regression coverage, automated gates.
- Exclusion: no new background or item art.
- Manual boundary: final four-viewport T043 acceptance, screenshots, and visual
  judgment belong to a frontier verification model or the owner. DeepSeek must
  stop after producing a testable build and reproduction instructions.

#### Feature 036 — Race Visual Spectacle remediation

- Stage: implementation-ready remediation.
- Open work: T044 and T058–T062.
- DeepSeek scope: restore credible current primitive track scale/hierarchy,
  dense-field label priority, safe HUD regions, regression coverage.
- Exclusion: do not generate future track-segment art. Feature 043 owns it.
- Manual boundary: final T044 race matrix, screenshots, and visual comparison
  belong to a frontier verification model or the owner. DeepSeek must not mark
  the matrix complete.

### Non-art packages to take through the cycle

#### Feature 038 — Async Multiplayer V1

- Current stage: implementation-ready; full cycle completed 2026-08-17.
- DeepSeek scope: T001–T065 after Features 041/042. Owner-only optional hosted
  pilot: T066. Frontier/owner manual cross-device/browser acceptance: T067.
- Locked contract: zero-network disabled static default; explicit anonymous
  consent; exact Feature 033/034/041/042 compatibility; server-authored
  pseudonyms/no free text; seven-day verified ghosts; rotating bound discovery;
  server-resolved challenger + six local rivals + one remote ghost; stored
  receipt before normal watched playback; unscored/no run mutation; RLS,
  idempotency, rate/size/CPU, retention, moderation, quota, kill/rollback gates.
- No asset dependency and no paid/hosted activation assigned to DeepSeek.

#### Feature 041 — Item Adjacency Buffs

- Current stage: implementation-ready; full cycle completed 2026-08-17.
- Owner decisions: Q1A/Q2A/Q3A/Q4A/Q5A.
- DeepSeek scope: T001–T042. Frontier/owner manual scope: T043 only.
- Locked contract: consecutive authored slot graph, category/tag predicates,
  additive snapshot stacking, no recursion, source-tier-only scaling, four
  representative existing items, and no art production.
- Output becomes an input to Feature 042's catalog and synergy audit.

#### Feature 042 — Item Pool Expansion and Loot

- Current stage: implementation-ready; full cycle completed 2026-08-17 after
  the three-perspective review and replacement clarification pass.
- Owner decisions: Q1A–Q7A, Q8C, Q9A, Q10A, including broader retrofit
  allowance, stacking bases above 3%, and neutral-only Loot acquisition.
- DeepSeek scope: T001–T058. Frontier/owner manual scope: T059 only.
- Review source:
  `specs/042-item-pool-expansion-loot/current-item-pool-review-2026-08-17.md`.
- Locked contract: 12-item retrofit floor, eight active additions, four Loot,
  4/2/1 rarity weights, unique offers, no Loot in normal entrant shops,
  full-fit leftmost targeting, half-price sale plus bonus, +3 target/stat cap,
  atomic Undo, retained identity ledger, and deterministic balance corpus.
- Completion of 041/042 locks the roster for Feature 037 artwork.

#### Feature 040 — Translucent Glass UI

- Current stage: intake.
- Remaining cycle: Specify → Clarify → Plan → Tasks → Analyze.
- Dependency: consume the extracted code-only responsive-frame contract from
  Feature 026 before planning scene coverage.
- Keep implementation procedural/token-driven. Existing approved backgrounds
  are test surfaces, not an invitation to generate new art.
- Lock performance tiers, contrast thresholds, reduced-transparency fallback,
  reduced motion, unsupported-filter fallback, and safe hit testing.

#### Feature 045 — Onboarding and Decision Context

- Current stage: implementation-ready; full cycle completed 2026-08-17.
- DeepSeek scope: T001–T054 after Features 041/042. Optional frontier asset:
  T055. Frontier/owner manual/comprehension scope: T056.
- Locked scope: ten-page static deck with page-one Skip and Settings replay;
  protected future authored tutorial run; large Improvised badge; measured
  four-stat regional radar chart on every acquisition host; optional decorative
  plate; non-mutating contextual Help; centralized Test Day UI suppression.
- Governance: hiding Test Day creates a documented temporary Constitution
  Principle V deviation. Code/tests remain; release compliance requires
  restoring/replacing build-test access or amending the constitution.

### Mixed packages that require a split

#### Feature 026 — Visual UI Upgrade

The existing draft mixes responsive architecture, reusable UI components, and
large-scale generated artwork. It is not a safe single DeepSeek handoff.

Planning action:

1. Preserve 026 as the umbrella visual-direction record.
2. Extract a code-only responsive-frame feature as proposed Feature 044.
3. Move generated backgrounds, portraits, vehicles, and visual-master work to
   the frontier asset lane shared with Features 037/043.
4. Take Feature 044 through Specify → Clarify → Plan → Tasks → Analyze.
5. DeepSeek receives only resolution/aspect-ratio layout, safe areas, component
   tokens, asset descriptors, loading/fallback, interaction, and tests.

#### Feature 039 — Recorded Race Audio

Audio is not image generation, but asset creation/licensing is still unsuitable
for an autonomous coding handoff.

Planning action:

1. Take 039 through Specify and Clarify with two explicit owners.
2. Frontier/human lane defines source/license policy and supplies approved,
   edited, normalized, named files plus an asset manifest.
3. DeepSeek tasks start at typed manifest ingestion, preload, selection/blend,
   lifecycle, mute/unlock/pause/skip/visibility cleanup, synthetic fallback,
   tests, and missing-asset behavior.
4. Mark the integration handoff conditionally ready if the asset pack is not
   yet present; do not convert sourcing/editing into coding tasks.

### Excluded image-generation packages

#### Feature 037 — Item Artwork and Presentation

- Do not create a DeepSeek task ledger yet.
- Art-direction prototypes may be produced by frontier/image tools.
- Final production waits for Features 041/042 to lock mechanics and roster.
- After approved cropped/labeled assets and a manifest exist, create a separate
  integration-only task group for mapping, preload, card/inspector placement,
  fallbacks, accessibility text, memory budget, and tests.

#### Feature 043 — Track Segment Art System

- Keep at intake during the non-art readiness program.
- Frontier/image tools own material exploration, modular masters, seams,
  atlases, crop/warp review, and approval.
- Feature 036 must repair the current primitive renderer first.
- After approved segment kits and a manifest exist, produce integration-only
  tasks for deterministic mapping onto retained geometry, joins, fallbacks,
  performance, and tests.

## Execution waves

### Wave 0 — Reconciliation

1. Preserve the current uncommitted intake/QA documentation.
2. Reconcile `ROADMAP.md`, `HANDOFF.md`, feature statuses, and
   `.specify/feature.json` before running feature commands.
3. Add task ownership labels or explicit prefixes:
   `[CODE-DEEPSEEK]`, `[ASSET-FRONTIER]`, and
   `[MANUAL-FRONTIER-OR-OWNER]`.
4. Create one reusable DeepSeek handoff template.

### Wave 1 — Existing remediation handoffs

1. Audit Features 035/036 tasks for exact reproduction fixtures and files.
2. Run `/speckit.analyze` against their amended specs/tasks.
3. Produce DeepSeek handoff entries; do not perform T043/T044 manually during
   planning.
4. Require the coding handoff to provide deterministic seeds/routes, expected
   states, URLs, and viewport instructions for the later verifier without
   asking DeepSeek to capture or judge screenshots.

### Wave 2 — Gameplay/content authority

1. Feature 041 full cycle.
2. Feature 042 full cycle using 041's decisions.
3. Feature 045 full cycle. **Completed 2026-08-17.**

These are completed before item artwork because they can change roster,
mechanical identity, card copy, tutorial content, and required state overlays.

### Wave 3 — Platform and UI infrastructure

1. Feature 038 Plan → Tasks → Analyze. **Completed 2026-08-17.**
2. Extract Feature 044 from 026 and complete its full cycle.
3. Feature 040 full cycle against Feature 044's responsive contract.

Features 041, 042, 045, and 038 have completed planning. Feature 044 is the next
package in the planning queue.

### Wave 4 — Audio integration split

1. Feature 039 Specify → Clarify.
2. Freeze audio asset-manifest contract and owner boundary.
3. Complete Plan → Tasks → Analyze for integration and fallback only.

### Wave 5 — Global readiness audit

1. Run cross-feature analysis for shared files and authority boundaries.
2. Verify 041/042/045 do not duplicate item targeting or tutorial truth.
3. Verify 035/036/040/044 do not each invent a competing layout system.
4. Verify 038 is optional and cannot block the static/local game.
5. Verify 039 cannot block or alter race authority when assets fail.
6. Update the delivery roadmap and dependency graph.
7. Produce `specs/DEEPSEEK-HANDOFF.md` with one section per ready package.

## Per-feature working loop

Use the following loop for each package, stopping only for a material owner
decision:

1. Select the feature in `.specify/feature.json` and confirm the working tree.
2. Run `/speckit.specify` when only an intake exists.
3. Run the custom Spec Kit clarification skill and answer every high-impact
   question before planning.
4. Run `/speckit.plan` and review the constitution/authority boundaries.
5. Run `/speckit.tasks`; ensure every named production surface has integration
   coverage and every manual task is visibly marked manual.
6. Run `/speckit.analyze`; resolve critical/high findings and rerun.
7. Perform the implementation-readiness checklist above.
8. Add the package to the DeepSeek handoff index without starting code.

## DeepSeek handoff contract

Every package handed to DeepSeek must state:

- implement all `[CODE-DEEPSEEK]` tasks continuously;
- do not execute or complete `[MANUAL-FRONTIER-OR-OWNER]` tasks;
- do not perform `[ASSET-FRONTIER]` tasks;
- do not generate, source, crop, edit, or approve assets;
- do not take screenshots, perform browser visual acceptance, compare images,
  perform listening acceptance, or make qualitative UI/art judgments;
- automated browser/layout tests are permitted only when they produce objective
  machine assertions and do not masquerade as manual visual acceptance;
- finish code work by supplying a runnable build plus exact verification
  routes, seeds, states, viewport sizes, and expected outcomes for the later
  frontier/owner pass;
- stop with a typed missing-asset report if a required manifested file is absent;
- preserve unrelated working-tree changes;
- do not change simulation/economy authority for presentation convenience;
- run focused tests after each phase and the full required gate at completion;
- report each task ID with files, tests, and remaining manual/asset dependencies.

## Expected readiness queue

Subject to clarification answers, the final coding queue should be:

1. Feature 035 remediation.
2. Feature 036 remediation.
3. Feature 041 adjacency buffs.
4. Feature 042 item expansion and Loot.
5. Feature 045 onboarding and decision context.
6. Feature 038 async multiplayer.
7. Feature 044 responsive frame.
8. Feature 040 translucent glass UI.
9. Feature 039 recorded-audio integration, conditional on approved assets.

Features 037 and 043 remain outside this queue until the frontier asset lane
delivers approved files and manifests.
