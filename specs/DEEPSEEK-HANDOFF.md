# DeepSeek Implementation Handoff Index

**Updated**: 2026-08-17  
**Purpose**: Provide implementation-ready code packages while excluding asset
creation and manual acceptance.

## Global agent contract

For every package in this index, DeepSeek must:

- implement all and only `[CODE-DEEPSEEK]` tasks in dependency order;
- preserve unrelated working-tree changes;
- never execute or close `[MANUAL-FRONTIER-OR-OWNER]` tasks;
- never perform `[ASSET-FRONTIER]` work;
- never generate, source, select, crop, edit, label, or approve assets;
- never take screenshots, compare images, perform listening acceptance, or make
  qualitative visual/art judgments;
- use objective automated tests for code behavior and layout invariants;
- provide exact routes, seeds/states, viewport sizes, and expected outcomes for
  later frontier/owner verification;
- preserve simulation, economy, transaction, track, playback, and result
  authority unless a package explicitly owns a change to that authority;
- report completed task IDs with changed files and test evidence;
- leave every manual or missing-asset dependency open.

## Ready Batch 01 — Features 035 + 036 remediation

**Status**: Implementation-ready  
**Reason for combined batch**: Feature 035 T048 and Feature 036 T061 both edit
`src/scenes/ContestScene.ts`; one implementation must own the shared layout.

### Code tasks

- Feature 035: T045–T050.
- Feature 036: T058–T062.

### Manual tasks expressly excluded

- Feature 035 T043.
- Feature 036 T044.

### Required outcomes

- Pre-Race uses one bounded circuit/location identity and bounded normalized
  stat precision; no comparison text crosses panel bounds.
- Supplier semantic states, rules, upgrade cue, receipt, installed row, and
  storage row occupy measured non-overlapping regions in the dense fixture.
- Contest defines one coordinated safe-region layout for circuit, focus/PiP,
  standings/status, evidence, installed build, and playback controls.
- The primitive race track regains credible scale and road/edge/marking/depth
  hierarchy without changing retained track geometry.
- Dense-field markers and labels remain readable through deterministic
  presentation-only priority/spacing while authoritative positions and results
  remain identical.

### Protected boundaries

- Do not generate track segment art or modify Feature 043.
- Do not add regional shop demand; that belongs to proposed Feature 045.
- Do not change purchase, receipt, Undo, tier, setup, track generation,
  playback, PiP selection, standings, timing, or result authority.
- Do not complete browser screenshots or manual visual matrices.

### Focused automated verification

```sh
npm test -- tests/unit/interfaceClarityAudit.test.ts \
  tests/unit/cardFeedbackPresentation.test.ts \
  tests/unit/raceSpectaclePresentation.test.ts \
  tests/unit/raceVisualProfiles.test.ts \
  tests/integration/interface-clarity-flow.test.ts \
  tests/integration/supplier-feedback.test.ts \
  tests/integration/pre-race-setup.test.ts \
  tests/integration/race-spectacle.test.ts
npm test
npm run lint
npm run typecheck
npm run build
npm run build:pages
```

### Handoff to manual verifier

At code completion, report the local/deployed URL, exact routes, deterministic
fixtures/seeds and dense states, four viewport instructions, expected hierarchy
and fallback behavior, and the still-open T043/T044 checklist.

## Ready Batch 02 — Feature 041 Item Adjacency Buffs

**Status**: Implementation-ready; coding not started  
**Recommended order**: Land/rebase after Batch 01 because both packages touch
`PrepareScene`, `ContestScene`, `ResultScene`, and shared inspector/layout code.

### Code tasks

- Feature 041: T001–T042 in
  `specs/041-item-adjacency-buffs/tasks.md`.

### Manual task expressly excluded

- Feature 041 T043.

### Required outcomes

- Consecutive authored vehicle slot IDs define `adjacency-linear-v1`; runtime
  slot order, storage, and scene coordinates never create links.
- Category/tag clauses grant flat normalized physical-stat points to qualifying
  immediate neighbors from one additive, non-recursive snapshot.
- Only source tier scales adjacency; Buff, Synergy, installation, modification,
  Scrutineering, setup, and playback systems cannot multiply it.
- Garage preview and successful commit deep-equal, with persistent non-color
  evidence for gained, broken, changed, and active links.
- Test Day and scored races retain and validate the same graph/contribution
  authority; Results consume evidence without scene-time recomputation.
- Exactly four existing catalog items gain the approved clauses. No assets are
  generated or modified.

### Protected boundaries

- Do not expand beyond the four items; broader content belongs to Feature 042.
- Do not create, crop, label, select, or approve item art; Feature 037 owns the
  later art pass.
- Do not add remote transport; Feature 038 may embed the versioned contract.
- Do not take screenshots or close the qualitative dense-layout/readability
  matrix.

### Verification

Use `specs/041-item-adjacency-buffs/quickstart.md`. Complete its focused and
repository-wide automated commands, report exact outcomes, and stop with T043
open for the frontier/owner verifier.

## Ready Batch 03 — Feature 042 Item Pool Expansion and Loot

**Status**: Implementation-ready; coding not started  
**Recommended order**: Land/rebase after Feature 041 because Feature 042 audits
and composes the four adjacency-source definitions and overlapping inspectors.

### Code tasks

- Feature 042: T001–T058 in
  `specs/042-item-pool-expansion-loot/tasks.md`.

### Manual task expressly excluded

- Feature 042 T059.

### Required outcomes

- Repair all 70 current item definitions, including the two dead cards, and
  apply at least the 12 recorded retrofits with truthful typed presentation.
- Add exactly eight active items and four inert Loot items; add no image assets.
- Use weighted 4/2/1 rarity and unique visible offer IDs.
- Keep Loot out of every normal entrant-origin shop/draft. It may appear only
  through explicit neutral sources with at most one Loot per offer.
- Sell Loot for normal half-price credits plus eligible sale modifiers and an
  atomic +1/+2/+3 permanent normalized bonus to the leftmost full-fit target.
- Preserve exact instance lifecycle, receipt, stale/duplicate rejection, Undo,
  Test Day/scored race parity, and retained result attribution.
- Produce deterministic catalog, access, offer, tier-attainment, and lap-length
  audit evidence that freezes the roster for later Feature 037 art production.

### Protected boundaries

- Do not generate, source, select, crop, label, edit, or approve item art.
- Do not place Loot in `NEUTRAL_ITEMS` or any ordinary character shop/draft.
- Do not redefine Feature 041 adjacency topology/scaling/authority.
- Do not use item definition IDs as mechanical switches.
- Do not take screenshots or close qualitative browser acceptance.

### Verification

Use `specs/042-item-pool-expansion-loot/quickstart.md`. Complete all focused and
repository-wide automated commands, record objective audit outputs, and stop
with T059 open for the frontier/owner verifier.

## Ready Batch 04 — Feature 045 Onboarding and Decision Context

**Status**: Implementation-ready; coding not started  
**Recommended order**: Land/rebase after Features 041/042 and the shared
035/036 scene remediation, because the deck and acquisition/help integrations
consume their final models and surfaces.

### Code tasks

- Feature 045: T001–T054 in
  `specs/045-onboarding-decision-context/tasks.md`.

### Work expressly excluded

- T055 optional regional-demand plate: `[ASSET-FRONTIER-OPTIONAL]`.
- T056 visual/comprehension acceptance: `[MANUAL-FRONTIER-OR-OWNER]`.

### Required outcomes

- Ship the ten-page static `how-to-play-v1` deck, Skip on every page, distinct
  completed/skipped local preference, first-run routing, Title/Settings replay,
  and non-mutating contextual Help.
- Use authoritative Feature 041/042/item/topology projections; do not implement
  the future scripted guided championship run.
- Add a large compact `IMPROVISED` text/icon badge everywhere required while
  preserving exact existing inspector ordering and mechanics.
- Produce reproducible seven-region four-stat demand profiles from the fixed
  circuit sensitivity corpus and render a complete code-native four-axis chart
  on every typed acquisition host.
- Never run track simulation/RNG in a shop or alter offers, transactions, tracks,
  schedules, runs, or outcomes from demand/help presentation.
- Hide every normal Test Day entry through one presentation policy while
  retaining scenes, modules, registrations, recovery, and all existing tests.
- Keep the optional decorative plate non-blocking with a complete fallback.

### Protected boundaries

- Do not generate, source, crop, edit, select, or approve the optional plate.
- Do not take screenshots or perform qualitative/comprehension acceptance.
- Do not implement a partial scripted tutorial run.
- Do not delete or change Test Day simulation/domain behavior.
- Do not claim Constitution Principle V is satisfied while Test Day remains
  player-inaccessible; the temporary deviation is documented in `analysis.md`.
- Do not change Feature 041 adjacency, Feature 042 Loot, item, offer, track,
  economy, transaction, contest, or result authority.

### Verification

Use `specs/045-onboarding-decision-context/quickstart.md`. Complete all focused,
corpus, Test Day preservation, and repository-wide automated gates. Stop with
T055/T056 open and report exact routes/fixtures for the frontier/owner verifier.

## Planned packages not ready yet

| Package | Remaining Spec Kit stages |
|---|---|
| 044 Responsive Frame | Extract intake → Specify → Clarify → Plan → Tasks → Analyze |
| 040 Translucent Glass UI | Specify → Clarify → Plan → Tasks → Analyze |
| 039 Recorded Race Audio integration | Split ownership → Specify → Clarify → Plan → Tasks → Analyze |

Features 037 and 043 are excluded until frontier-produced assets and manifests
exist. They must not be inferred as coding work from this index.

## Ready Batch 05 — Feature 038 Async Multiplayer V1

**Status**: Implementation-ready after Features 041/042; coding not started  
**Recommended order**: Land/rebase after Features 041/042 freeze their catalog,
adjacency, Loot, and instance evidence. Prefer landing after the combined 035/036
scene remediation before Contest/Results integration.

### Code tasks

- Feature 038: T001–T065 in
  `specs/038-async-multiplayer-v1/tasks.md`.

### Work expressly excluded

- T066 hosted Free pilot creation/configuration/activation:
  `[OWNER-OPTIONAL-PILOT]`.
- T067 qualitative cross-device/browser/audio acceptance:
  `[MANUAL-FRONTIER-OR-OWNER]`.

### Required outcomes

- Keep the normal GitHub Pages build disabled/unconfigured with zero service
  startup/local-play requests and no secret/hosted dependency.
- After explicit disclosure consent, use Supabase anonymous Auth with a
  server-authored pseudonym; collect no email, chat, location, or free text.
- Publish only a strictly rehydrated/validated immutable Feature 033/034/041/042
  build, setup, circuit, manifest, and digest with seven-day discovery TTL.
- Discover through a rotating compatible pool and bind one retained circuit/
  ghost to a 15-minute offer before challenger setup.
- Resolve/store the complete enriched result in an Edge Function before return:
  challenger + six canonical local rivals + one verified remote ghost.
- Feed the stored receipt into normal eight-car playback/Results without scene-
  time resolver/network/track generation.
- Treat every remote contest as an unscored exhibition; never change run,
  encounter, RNG, credits, reputation, history, standings, or local result.
- Enforce RLS/direct-access denial, idempotency, exact versions, payload/CPU/rate
  bounds, withdrawal, block/report, retention, read-only/kill switches, redacted
  logs, and reproducible local migrations/functions.

### Protected boundaries

- Do not create, link, configure, or upgrade a hosted project; do not enter
  credentials or authorize payment/overages.
- Do not weaken server authority or fall back to a client-computed remote result
  when Edge performance/security/parity fails. Leave the pilot disabled.
- Do not make remote opponents part of championship settlement/progression.
- Do not invent partial version compatibility or trust claimed stats/results.
- Do not expose service-role/secret keys, direct table writes, owner Auth IDs,
  payloads, or free-text moderation.
- Do not take screenshots, conduct listening acceptance, or close T066/T067.

### Verification

Use `specs/038-async-multiplayer-v1/quickstart.md`. Complete its disabled static
artifact, pure contract, shared resolver, local Supabase/RLS, retention, rate,
privacy, benchmark, focused UI, and full repository gates. Stop after T065 with
T066/T067 open and exact routes/fixtures for the owner/frontier lanes.
