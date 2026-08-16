# Handoff

## Latest session — Feature 034 live implementation completed (2026-08-15)

Feature 034 is now wired into live World Tour runs. Stable run-scoped item
instances survive garage/economy mutations; all seven new encounter types have
retained payloads and scene actions; Exhibition reuses unscored practice
playback; Tag Specialist supports qualifying-tag selection, one restock, exact
stock inspection, purchase, and leave; Scrutineering returns the exact impounded
instance after the next scored race; and Guarded rewrites the first retained
successful overtake against the player without changing settlement authority.

Validation: `npm run lint` and `npm run build` pass; full `npm test` passed
1,826/1,826 across 115 files. In-app browser acceptance traversed the live
title/entrant/destination/choice path with no console warnings or errors.

## Prior session — Feature 034 deterministic core implemented (2026-08-15)

The first implementation pass for Feature 034 landed the **deterministic, pure
simulation core** (the TDD-held portion) as additive modules with passing tests.
`npm test` went from **1 698 → 1 780** (82 new Feature 034 tests across 111
files); `npm run lint` and `npm run build` (incl. `tsc --noEmit`) are clean.
Evidence is recorded in
`specs/034-roguelike-encounter-variety/checklists/requirements.md` (T077).

Delivered and tested (all additive, non-destructive of the 033 surface):

- T001 contract reconciliation with Feature 033 for `Guarded` (consumes retained
  `RaceEnrichmentReplayEvidence`, never re-runs enrichment).
- T002 fixtures (`encounter-variety-fixtures.ts`) with a byte-stable seeded RNG
  and instance-build builders.
- Item-instance identity (`itemInstances.ts`), canonical stat normalization
  (`statNormalization.ts`, incl. the SC-013 10% gate wired into `balance.test.ts`
  as T016), `encounterCadence.ts` (family classification, two-stage cooldown,
  no-two-acquisition pairs, Upgrade guarantee windows, bounded fallback),
  `itemModifications.ts` + `content/itemModifications.ts` (stat-graft,
  Twin-Tuned, Guarded, Adapted Mount), `scrutineering.ts` (formula/cap/impound/
  reservation/coexistence/exact return), `encounterTransactions.ts` (upgrade/
  foreign exchange/rebuild/capacity/atomic rollback), `exhibition.ts`
  (unscored, three-objective, score 0–3, Championship-unchanged), and
  `tagSpecialist.ts` (held-tag counts, cross-origin same-tag stock, one modified
  premium). Content: `encounterVariants.ts` three variants per new type (T072 gate).
- Integration coverage: Test-Day pending-effect boundary (T073), identical
  rules across all four entrants + determinism (T074/T075 in
  `encounter-variety-flow.test.ts`).

**Not yet done — hand this to a follow-up pass.** The item-instance migration of
the *live* garage/draft/build/run and all scene/presentation integration remain:
Tasks T008–T011, T014–T015, T020–T022, T029–T030, T036–T037, T045–T050, T056–T058,
T063–T071, plus T076 (quickstart reconcile) and the final manual/browser acceptance.
The scalar `InstanceBuild`-based modules are structured so that next pass can
switch the run's authoritative build to instances and route the scenes through the
pure view models without reworking the deterministic rules.

## Latest session — Feature 033 implementation complete (2026-08-15)

Feature 033 Race Enrichment is complete at **93/93 tasks**. Scored races and
Test Day share deterministic phases, Composure-backed passes/signatures,
isolated bounded incidents, retained replay evidence, revised 1x/2x playback,
Skip/reduced-motion/result inspection, semantic Web Audio feedback, and one
validated generated circuit from physics through presentation. The final
150-race tuning corpus meets all three bands (post-Opening 1.000, full-emphasis
0.020, winner-change 0.100) while preserving stronger-build dominance.

Verification is recorded in
`specs/033-race-enrichment/acceptance-evidence.md`: 100 files / 1695 tests passed
before the final three-test UI-audio addition, that focused addition is green,
lint and production build pass, and browser QA has no overflow at the four
required viewports. Browser QA also found and fixed Test Day recovery's handling
of optional `undefined` fields.

Feature 034 is now unblocked to perform its T001 retained-evidence
reconciliation (this pass completed T001). Feature 035 remains presentation-only.
Do not move enrichment resolution into either feature's scenes; consume retained
event IDs and results.

## Latest session — hygiene pass and Feature 035 planning complete (2026-08-15)

The active SpecKit marker remains `033-race-enrichment` while Feature 033 is
implemented. Feature 035 planning is complete as a parallel documentation
track. The historical stale status labels have been normalized; completed
packages now say so, while Features 010 and 029 are explicitly marked partially
implemented rather than implicitly complete.

`specs/LEGACY-LEDGER-RECONCILIATION.md` is the closing protocol for the 010
and 029 residual ledgers. It separates their remaining work into current
feature-owned presentation work and future authoritative follow-ups—without
silently closing tasks based on related later code. `specs/ROADMAP.md` records
the committed execution order: implement 033, then 034; implement Feature 035
after task generation; then refresh Feature 026 and create a World Tour
completion package.

Feature 035 now has its complete Spec Kit planning package, 44
dependency-ordered tasks, and a passing analysis. It is ready for
implementation. It is presentation-only: region-as-location plus recorded
circuit identity, an Adjustable capability badge, display-only
Standard/Notable/Rare catalog rarity, non-color upgrade cues, reduced-motion
equivalents, and a landscape primary-scene overlap/readability audit. It
deliberately does not take over Feature 026's responsive-host and 390×844 work,
Feature 032's upgrade transaction, or Feature 034's encounters.

## Latest session — Feature 034 planning complete (2026-08-15)

Feature 034's former active marker has advanced to Feature 035. Specification, owner clarification, research,
implementation plan, data model, internal contract, quickstart, requirements
checklist, 78 dependency-ordered implementation tasks, and the final consistency
pass are complete under `specs/034-roguelike-encounter-variety/`. There are no
unresolved questions or critical/high analysis findings. Feature 034 is ready for
`/speckit.implement` after its T001 reconciliation with Feature 033's retained
overtake/race-evidence contract.

Key locked Feature 034 decisions: seven new encounter types; two-stage selected-
type cooldown; no two-acquisition pair; two free Upgrade Workshop offers across
the 40-stage championship (one in global stages 1–20 and one in 21–40 when
eligible); instance-bound Workshop Modifications; canonical normalized physical
stat points; catalog-wide Fitted/Improvised tuning; reserved-slot Scrutineering;
unscored three-objective Exhibition Trials; and late-run Tag Specialist stock.
Q16 and Q21 are accepted: the specialist requires two matching held tags and the
player selects the tag, while one pending Sponsor and one pending Scrutineering
effect may coexist but duplicate effects within either category may not.

Feature 032 remains complete at 110/110 and its final UI follow-ups are included
in this working state: the inventory routes to the authoritative vehicle/storage
board, inventory buttons no longer overlap primary controls, encounter Enter
buttons sit inside their cards, and all four installed race slots are laid out.
The combined release gate passes: 85 test files / 1,555 tests, lint, TypeScript,
and production build. No automated visual testing was performed; the owner retains
browser visual acceptance.

Feature 033 is planning-complete at 93 tasks and remains the next implementation
owner chronologically. It now includes retained race phases/passing/identity/
incidents, basic engine and UI audio, circuit grammar with hairpins/switchbacks,
and geometry-derived positive braking demand. Feature 035 remains intake-only.

## Latest session — Feature 032 implementation complete (2026-08-15)

Feature 032 is complete. The current task ledger is 110/110. Completed scope includes retained
live-stat feedback, tag/synergy and scaling inspection, supplier receipts and
restock, inventory hosts with sale/Undo, settlement/economy/history, balance
evidence, approved UI chrome runtime integration, replay invariants, and the
catalog audit.

Evidence is recorded in
[`specs/032-demo-feedback-bug-pass/acceptance-evidence.md`](032-demo-feedback-bug-pass/acceptance-evidence.md),
[`specs/032-demo-feedback-bug-pass/balance-evidence.md`](032-demo-feedback-bug-pass/balance-evidence.md),
and [`specs/032-demo-feedback-bug-pass/ui-asset-manifest.md`](032-demo-feedback-bug-pass/ui-asset-manifest.md).
The automated gate passed with 81 test files / 1,531 tests, lint, production
build, and Pages build. Owner-hosted-demo review closed T100/T101 and accepted
T108 with the exhaustive physical touch/narrow matrix explicitly waived rather
than reported as executed. DEMO-001 remains a documented temporary guard with
the exact Reward Draft return fix deferred; DEMO-002 `SKIP REWARDS` is shipped.

Feature 033 is now the next implementation owner. Its scope includes race
phases/identity/passing/incidents, engine and UI audio, and authoritative circuit
generation with hairpins, switchbacks, and geometry-derived braking demand.

## Features 034 and 035 recorded as TODO; Feature 033 clarification next

Hosted-demo follow-up is now split into two protected future features:
`034-roguelike-encounter-variety` for mechanically distinct between-race events
and cadence, and `035-interface-clarity-reward-feedback` for circuit locations,
reserved `Adjustable` vocabulary, whole-game overlap/readability QA, and
rarity/upgrade card feedback. Both have intake files and deferred-backlog rows.

Feature 033 remains the active design target while Feature 032 is implemented
elsewhere. Specification, clarification, planning, contracts, validation guide,
93 implementation tasks, and consistency analysis remediation are complete under
`specs/033-race-enrichment/`.
Active signatures use a resolved-stat threshold, so native, foreign, and mixed
items count equally when they move a build toward the driver's preferred
engineering outcome. Feature 033 is ready for `/speckit.implement`; implementation
must begin with task T006 reconciliation. The repository-local
`speckit.clarify` agent now presents all material questions in one recommended
questionnaire and accepts a batch answer.

## Feature 032 tasks generated — analyze next

`specs/032-demo-feedback-bug-pass/tasks.md` now defines 110 implementation tasks
across baselines/foundations, five independently testable user stories, and a
combined release gate. Consequential logic is explicitly test-first, additional
UI sheet generation is blocked until the approved controls pass in-game review,
and Feature 033 race enrichment remains excluded. Run `/speckit.analyze` next;
implementation has not started.


## Feature 032 planned — task generation next

Feature 032 now has a complete technical package in
`specs/032-demo-feedback-bug-pass/`: plan, research, data model, consolidated
contract, quickstart, and a passing requirements checklist. The plan keeps one
feature with four workstreams, uses strict test-first development for
consequential simulation/economy/Undo/history/balance logic, and derives scene
feedback from pure presentation contracts. The approved neutral control sheet
and transparent/chroma sources are preserved under `public/assets/ui/` but are
not integrated at runtime. `/speckit.tasks` is the next phase; implementation
has not started.


## Feature 033 intake — race enrichment

`specs/033-race-enrichment/intake.md` preserves the next exploratory feature:
make watched races remain credible and dramatic after the opening lap through
simulation-backed phases, conditional signature moments, overtaking windows,
and possibly deterministic incidents. The intake records lessons from Uma
Musume while protecting Auto Racer's async parity: all outcome-affecting events
must be precomputed and retained, and playback may dramatize but never invent or
change them. Feature 033 has not entered `/speckit.specify`; Feature 032 remains
the active feature and `.specify/feature.json` still points to it.


## Feature 032 intake — demo feedback bug pass

The consolidated hosted-demo feedback is now captured in
`specs/032-demo-feedback-bug-pass/spec.md`. It covers live vehicle-stat and
amplification feedback, complete tags/synergy explanations, scaling visibility
and correctness, Supplier purchase/restock state, tier-up feedback, third-place
language, final-run win/loss tally, additive entrant balance, pre-race focus styling, non-race inventory
access, sell drop targets, unfinished economy items, and replacement of
placeholder UI shapes. Deterministic crashes and driver skill are explicitly
research-only until clarified. The feature is ready for `/speckit.clarify`, not
planning or implementation.


## Demo bug-fix intake — 2026-08-14

Hosted-demo reports are tracked in `specs/DEMO-BUGS.md`. Reward Draft currently
hides its Test Day entry as a temporary guard against a stale return-context
failure (DEMO-001). A separate documented UX fix should replace the ambiguous
`Decline all` label with an explicit `SKIP REWARDS` action backed by the existing
declined-reward transition (DEMO-002); that change has not been implemented.


## Latest session — feature 031 implemented; demo-v0.1.0 published

**Updated**: 2026-08-14 on `main` (`310ab58`, tag `demo-v0.1.0`).

Feature 031 (demo deployment) is implemented end to end on this branch, which
carries feature 030's completed playback controls via merge `4bf783d` — the
demo artifact therefore includes the `1×`/`2×` race playback work. Shipped:
the `BuildIdentity`/`runtimeAssetUrl` client boundary (all 39 BootScene
assets base-aware with release revision cache stamps), the title-screen
`<demo-tag> · <short-revision>` footer, prefixed `/auto-racer/` builds
(`build:pages`/`preview:pages`), `verify.yml` (push/PR gates, never deploys),
`deploy-demo.yml` (manual semantic-tag dispatch only: workflow-owned grammar
check and remote-tag resolution before selected-tag checkout, full gates,
identity build, artifact audit, protected `github-pages` deploy, bounded
post-deployment smoke check with healthy/unhealthy summaries and no automatic
rollback), `validate-demo-tag.mjs`/`audit-production-artifact.mjs`/
`smoke-demo.mjs`, and the README release/rollback runbook.

Verification: 64 test files / 1,432+ tests pass; TypeScript, lint, and
production build clean; simulated release builds pass the artifact audit and
local smoke checks, and forced missing-asset / identity-mismatch / 
previous-tag drills all diagnose and recover as specified. Live drill results
are in `specs/031-demo-deployment/acceptance-evidence.md`. All feature-031
work is committed on the branch.

**Published**: T050 completed with owner authorization — repository made
public, Pages source set to GitHub Actions, `demo-v0.1.0` tagged at `310ab58`
and dispatched; run `31860050113` deployed and smoked healthy at
https://threatlvlmidnight.github.io/auto-racer/ (live evidence, including the
pre-tag dispatch failing exactly at the no-tag-no-deploy guard, is recorded
in `specs/031-demo-deployment/acceptance-evidence.md`). Remaining manual
acceptance: the interactive clean-cache four-viewport browser walkthrough
(T022/T046 recorded their network-level equivalents). Feature 032
(multiplayer) must respect the static demo boundary — see the new row in
`specs/DEFERRED.md`.

## Latest session — feature 030 implemented; viewport matrix remains

**Updated**: 2026-08-14 on `codex/030-race-playback-controls`.

Feature 030 now implements race-local `1×`/`2×` presentation clocks for scored
Local/Championship races and Test Day. New races default to `2×`, retaining the
legacy watch duration; `1×` remains available and consumes the retained schedule
at half rate (about 40 seconds watched). Speed never enters contest or settlement authority. Crossed time-zero,
lap, item, checkpoint, car-finish, and results-ready boundaries are consumed in
deterministic order exactly once, including delayed frames. Test Day retains
Pause/Skip/Cancel, removes the legacy `4×`/`F` cycle, and skips to a finite finish
boundary even while paused. Both scenes expose pointer/touch controls and keys
`1`/`2`, use a non-color selected marker, reset to `2×`, and remove keyboard
handlers on shutdown.

Verification: 57 test files / 1,191 tests pass; TypeScript, lint, and production
build pass. Browser smoke reached the championship and Test Day briefing at
1280×720. The remaining manual acceptance item is the complete four-viewport,
both-speed Local/Championship/Test Day matrix recorded as T047; tool-driven canvas
input did not reliably activate Start Test during this session. Feature 031 remains
on its separate `codex/031-demo-deployment` branch and requires no playback-specific
deployment change.

All feature-030 work is uncommitted. Overtake dramatization remains deferred in
`specs/DEFERRED.md`.

## Latest session — features 025 and 027 both fully implemented

**Updated**: 2026-08-13 after `/speckit.implement`-ing both `025-vehicle-
stat-display` and `027-race-legibility-integrity` end to end in one session.
`main` was already in sync with `origin/main`; everything below is
uncommitted in the working tree — do not commit until told to.

### What shipped

**`025-vehicle-stat-display`** (50/50 tasks): `src/simulation/laps.ts` gained
`resolveCurrentBuildPhysicalStats` (unconditional current-build stats,
correctly excluding track-conditional/lap-stacking potential). New
`src/scenes/vehicleStatPresentation.ts` (pure) and `vehicleStatVisuals.ts`
(Phaser renderer) provide `currentVehicleStatModel`/
`prospectiveVehicleStatModel`/`recordedLapVehicleStatModel`, wired into
`PrepareScene` (current totals + live placement preview), `ContestScene`/
`ResultScene` (per-lap effective stats), and `TestDayScene`/
`PracticeContestScene`/`PracticeResultScene` (honest "no track-aware
evidence" state, since Test Day's legacy `resolveContest` path genuinely
has none today). **One recorded deviation**: Reward Draft/Parts Supplier use
a compact single-line stat readout instead of the full tile panel — no free
vertical band without reworking tuned layouts; deferred to feature 026's
responsive frame (`specs/DEFERRED.md`).

**`027-race-legibility-integrity`** (57/57 tasks): `NCarContestResult`
gained immutable `track`/`tieBreakOrder` evidence (`types.ts`, emitted by
`resolveNCarContest` in `contest.ts`); `ContestScene` now builds playback
from `result.track` instead of an independent `generateTrack` call.
`src/simulation/playback.ts` gained `checkpointProjection`,
`latestCompletedPlayerLap`, and `updateLiveProjection` — the equal-lap,
once-per-completed-player-lap projection that replaces the old
continuously-reordering 8-row standings sidebar. New
`src/scenes/raceProjectionPresentation.ts` (marker identity/lap context,
projection text) and `trackSummaryPresentation.ts` (wraps the new
`summarizeTrack` in `tracks.ts`) back the new `ContestScene` sidebar
("PROJECTED PACE": headline/split/ahead/behind/change, updated only at
checkpoints) and a new `ResultScene` track-composition panel. **Playback
integrity diagnosis (Phase 2, required before any UI change) found zero
actual defects** — `carProgressAt`/`pointAtProgress`/`nCarFrameStateAt` were
already correct; the diagnosis is recorded in full in `research.md`.

Combined: 887 tests passing (up from 780 at session start), `tsc`/lint/build
all clean throughout. Full acceptance evidence for each feature is in its
own `quickstart.md`.

### What wasn't verified live, and why

Both features' scene wiring was verified live in the browser for everything
reachable quickly (empty-build stats, item-install deltas, placement
preview hover/commit/revert, Test Day/Practice panels, the race's initial
"Awaiting Lap 1 Split" state). **A full 10-lap race was never watched to
completion in the browser** — this environment throttles a backgrounded
tab's `requestAnimationFrame` severely (confirmed independent of any code
change: 40+ seconds of real wait advanced the 20-second animation only
marginally), making that impractical to sit through via the tool-driven
browser. `ResultScene`'s vehicle-stat panel (025) and the checkpoint
publish transition + Results track-summary panel (027) were therefore
verified by code review, `tsc`, and the automated suite only — not by
watching them render. If picking this up next, either watch a race in a
real foregrounded browser tab once, or trust the test coverage (both
features' hardest logic — checkpoint math, projection state machine, track
summary — has dedicated exhaustive unit coverage independent of Phaser).

### Start here next session

Nothing is blocked. Natural next steps, in rough priority order:
1. Manually watch one full race in a real (non-throttled) browser to close
   the live-verification gap noted above.
2. Feature 026's responsive frame, when picked up, should swap
   `PrepareScene`'s compact vehicle-stat line for the real tile panel
   (`specs/DEFERRED.md`).
3. `contestFormatting.ts`'s `standingsRows` is now unused by any scene
   (kept only because `contestFormatting.test.ts` still covers it as a pure
   formatter, per feature 027 T036) — safe to delete in a future cleanup
   pass if nothing else adopts it.

---

## Previous session — feature 025 packaged, feature 027 specification started

**Updated**: 2026-08-13 after completing feature 025's specification package
and drafting feature 027.

### Current specification state

- `025-vehicle-stat-display` now has a complete spec, research, plan, data
  model, contract, quickstart, and 50-task implementation sequence. Its core
  boundary is locked: honest unconditional preparation totals, authoritative
  prospective-build previews, and recorded-only lap-effective race values.
- `027-race-legibility-integrity` now has a complete spec, research, plan, data
  model, contract, quickstart, and 57-task implementation sequence. The owner
  chose a projected race position that updates once per completed player lap.
  At lap N, all cars are compared by cumulative simulated time through the same
  lap N; the published projection remains stable between player checkpoints.
- Feature 027 also owns playback/marker integrity diagnosis and authoritative
  post-race track composition. Feature 025 retains ownership of aggregate
  vehicle-stat panels.
- `.specify/feature.json` points at `027-race-legibility-integrity`.

### Start here next session

1. Implement feature 025 when authorized, following its 50-task sequence.
2. Then implement feature 027 when authorized, beginning with immutable result
   snapshots and playback-integrity tests. Carry the exact generated `Track`
   and original roster tie-break order on `NCarContestResult`; never regenerate
   a track in a scene.
3. Add integrity tests around `carProgressAt`, checkpoint projection,
   `nCarFrameStateAt`, marker wrapping, missed boundaries, finish events, and
   final-result parity before changing playback presentation.

---

## Previous session — feature 024 complete, feature 026 visual pass in progress

**Updated**: 2026-08-12 after the first feature-026 implementation and visual
review loop.

### Current state

- Feature 024's item-stat presentation work is implemented and integrated.
- Feature 025 is documented but has not been implemented.
- Feature 026 now has production-intent garage, environment, entrant, vehicle,
  and representative item-family artwork plus its first runtime integration.
- The runtime renders a true 1600×900 backing canvas while preserving the
  established 800×450 scene coordinate system with a 2× camera. All Phaser text
  textures render at matching 2× resolution.
- Entrant selection, Title, Reward Draft, Parts Supplier, garage preparation,
  race, result, and Test Day surfaces have received initial visual-system work.
- Item cards no longer show procedural icons. Compact cards cap visible effect
  lines and direct the player to a persistent details panel for overflow.
- Acquisition screens open with no automatic selection. Clicking/tapping an
  item opens details; selecting it again or pressing Escape closes details.
- Shared UI uses deep racing green, German silver, porcelain, and Italian red.
  Brass is reserved primarily for credits/material meaning rather than generic
  frames and actions. The font stack is now a narrow mechanical sans serif.
- The temporary event-facing title treatment is **The Motor Age** / **The
  inaugural 1901 championship** / **Build the machine. Make history.** The final
  commercial game title remains open.
- Latest verification: `npm run build`, `npm test`, and `npm run lint` pass;
  **762/762 tests passing**.

### Start here next session

1. **Post-race track summary**: Results need to report track composition—not
   only the track name. At minimum expose corner count and straight count, with
   other useful authored/derived track statistics as appropriate, so players
   can understand why acceleration, top speed, braking, or cornering builds did
   or did not perform. Determine the authoritative source in track/simulation
   data and carry immutable evidence into results rather than inferring from UI.
2. **Visual running order versus standings**: Investigate an apparent mismatch
   between the order cars appear around the rendered track and the calculated
   standings. Compare `nCarFrameStateAt`, track progress interpolation,
   lap/progress ordering, finish handling, marker placement, and standings-row
   sorting. Diagnose and test the cause before changing contest math.
3. Continue manual feature-026 visual review after those investigations. The
   asset inventory and known pre-1.0 debt are in
   `specs/026-visual-ui-upgrade/asset-manifest.md`.

### Important visual implementation files

- `src/scenes/layout.ts` — 1600×900 backing canvas, 2× camera, and automatic
  high-density Phaser text textures.
- `src/scenes/demoTheme.ts` — current shared colors, fonts, panels, and buttons.
- `src/scenes/itemVisuals.ts` / `itemPresentation.ts` — compact card and full
  inspector hierarchy.
- `src/scenes/PrepareScene.ts` — Reward Draft/Supplier selection, details,
  placement, and acquisition layout.
- `src/scenes/ContestScene.ts` — race markers, track progress, and standings;
  central to the next-session order mismatch investigation.
- `src/scenes/ResultScene.ts` / `resultFormatting.ts` — next home for the track
  composition summary.

---

**Last updated**: 2026-08-12, feature `020-character-item-pools` complete.

**State**: `main` is in sync with `origin/main` through `e08a158`
("Implement feature 022: contextual physics effects"). **Everything since
then is uncommitted, sitting in the working tree** — do not commit until
told to. That includes:
- All of `023-stat-targeted-amplifiers` (spec through implementation),
  which was built in an earlier part of this same session, before the most
  recent compaction, and never got its own commit.
- All of `020-character-item-pools`'s Foundational phase, User Story 1, a
  new engine capability (value-scaled Buffs) added mid-authoring, and
  the complete 70-item catalog and all feature-020 integration work.
- `specs/024-item-stat-presentation/spec.md` — a separate, unrelated
  feature idea that only got as far as a spec draft before attention
  shifted back to `020`. Not started, not blocking anything. `.specify/
  feature.json` currently points at it even though `020` is the actually
  active feature — check `specs/020-character-item-pools/` directly rather
  than trusting that file if picking this up cold.

Run `git status`/`git diff --stat` first thing — this doc summarizes the
diff, it doesn't replace reading it.

## What happened this session, in order

1. **`023-stat-targeted-amplifiers`** — full spec-kit cycle, 44 tasks, all
   complete. `Buff`/`SynergyEffect` gained an optional `targetStat` so
   amplifiers can target a physical stat (`acceleration`/`topSpeed`/
   `brakingPower`/`corneringSpeed`) instead of only the legacy flat `time`
   path. This required moving physics resolution from once-per-build to
   once-per-lap inside `simulatePlayerLaps` (`laps.ts`) — the core
   architectural shift — proven byte-identical to the old behavior for
   every build with no lap-varying amplifier. Two real evidence-integrity
   bugs found and fixed mid-implementation (stat-targeted buffs' displayed
   `appliedPercent` had briefly diverged from what was actually simulated).
2. **`020-character-item-pools`** — `/speckit.analyze` ran first (4
   findings: FR-008 determinism coverage gap, a missing `validateItemPools`
   check for sponsor-objective tags, an underspecified `objectiveForKind`
   tag-selection mechanism, a file-location ambiguity), all four remediated
   in `tasks.md`/`data-model.md`/`research.md` before implementation
   started. Then `/speckit.implement`:
   - **Foundational** (T001-T010): `src/simulation/itemPools.ts` (new) —
     `poolForEntrant`/`poolForRival`/`poolForCrossPollination`/
     `validateItemPools`, plus parameterized `resolveEntrantPool`/
     `validatePoolContent` variants added specifically so Foundational
     tests could exercise the logic against synthetic fixtures before real
     content existed (`EXCLUSIVE_ITEMS`'s four pools start as genuinely
     empty arrays, not placeholders). `src/content/items/` (new directory)
     — `neutral.ts` got the real, locked 10-item Neutral pool immediately
     (already fully decided from the pre-implementation authoring pass);
     `mercer.ts`/`soto.ts`/`rook.ts`/`voss.ts` started empty. Parts
     Supplier's dead `identityTag` filter removed. `SponsorObjective`'s
     `"trigger-tagged-items"` variant repointed from `identityTag` to a new
     `tag: string` matched via `synergyTags`, with a new exported
     `SPONSOR_OBJECTIVE_TAGS` constant (`run.ts`) and `rng`-threaded
     selection in `objectiveForKind` so the tag choice stays deterministic
     per `(seed, stage)` rather than hardcoded.
   - **US1** (T011-T018): `chooseEncounter`/`createPayload`/
     `createSupplierPayload`/`restockSupplier` no longer take an `itemPool`
     parameter — they resolve it internally from `run.identity.entrantId`.
     `PrepareScene.ts`/`RunScene.ts` simplified to match.
   - **Two real bugs found and fixed during implementation** (not
     planning-stage issues): (a) `drawItem` (`draft.ts`) could return
     `undefined` for roughly 75% of draws against the new identityTag-less
     catalog — a coin flip landing on the now-always-empty `taggedItems`
     branch indexed out of bounds instead of falling back to
     `neutralItems`, contradicting what `research.md` Decision 2 had
     originally (incorrectly) assumed needed no code change. Fixed with a
     one-line guard; the same latent bug was **already live** in
     `resolveRivalBuild` too, and fixing it shifted one existing
     `playback.test.ts` fixture's expected outcome (updated, not
     silenced — see that test's comment for the full trace). (b) `run
     Presentation.ts`/`RunScene.ts` also read the old `identityTag` field
     name for sponsor-objective display text; missed by the original scope
     list, caught by `tsc`.
   - **Mid-authoring capability addition**: while authoring Evelyn Mercer's
     items, the user asked for a Bazaar-style chase card — a buff that
     scales with the value of fitted parts. Split into two pieces of very
     different cost (raised with the user explicitly, via `AskUserQuestion`
     before proceeding): reading already-authored static `price` (cheap)
     vs. items that *mutate* another item's value (expensive, same class of
     work as the already-deferred Economy capability). Only the first
     shipped: `Buff.scalesWithFittedValue` — boost scales with
     `sumFittedValue` (sum of `price` across fitted/board-only items,
     storage excluded). New pure helpers in `buffs.ts`
     (`isValueScaledBuff`/`sumFittedValue`); `computeBoostsForLap`
     (`buffs.ts`) and `buffPercentFor` (`laps.ts`) both gained an optional
     `fittedValue = 0` parameter, computed once per build in
     `simulatePlayerLaps` exactly like `synergyResolution` already is.
     Full design in `research.md` Decision 8. This is a deliberate,
     explicitly-requested revision to FR-007/plan.md's original "zero
     changes to laps.ts/buffs.ts" framing, tracked as task T019a.
   - **Evelyn Mercer's 15-item pool** — locked and fully stat-blocked in
     `src/content/items/mercer.ts`, not just conceptual. Verified directly
     against the real engine with `tsx` smoke tests (not just `tsc`) —
     confirmed the matching-set synergy and the stacking buff actually
     fire and grow lap-over-lap in a realistic 4-item combo.
3. **Lucien Soto's pool** — complete. Lore, four chase cards, eleven
   supporting items, and all 15 stat blocks were interactively reviewed and
   locked. The final pool is 10 Power / 5 Chassis to match The Needle's
   topology. A direct real-engine smoke test confirmed the two stacking
   chase cards accumulate on their authored rhythms (Crankset: 3/3/6/6/
   9/9/12/12/15/15%; Drive Sprocket: 2/2/2/4/4/4/6/6/6/8%), lap-one to
   lap-ten acceleration/top speed increase, and Double-Butted Tube Frame's
   exact-two-lightweight synergy applies its authored 35%. Full suite
   remains 755/755; build and lint clean.

## The item-authoring process (repeat for Soto, Rook, Voss)

Established this session, run once fully (Mercer) and now mid-flight
again (Soto). Four stages, each requiring the user's explicit go-ahead
before the next starts:

1. **Lore package** — before naming a single item, propose a short table:
   Core identity, Temperament, Era/setting cues, Material vocabulary,
   Naming convention, Tag emphasis, Mechanical throughline (how the
   character's identity should express as *engine mechanics*, not just
   flavor). Iterate on user feedback — this can take more than one pass
   (Soto's took two: an initial "track sprinter" framing, then corrected
   to "bicycle racer building the first motorcycle because it's what he
   knows"). Lock before moving on.
2. **Chase cards** — propose 3-4 top-tier, build-defining items, one per
   major build direction/archetype the character's strategy directions
   imply. These are priced above starting credits (5cr, vs. Cheap 2cr/Mid
   4cr for support items) so they're never turn-one-affordable — genuinely
   aspirational. Present as a compact table (name/category/role-in-
   shorthand/tags/one-line rationale). Lock before moving on.
3. **Supporting items** — propose the remaining ~11 items as a concept
   table (name/category/role/tags/which chase card(s) it feeds), still no
   real numbers yet. Iterate — this is where naming missteps get caught
   (Mercer's "Appraised Toolchest" got renamed to "Oilskin Driving Coat"
   after two rounds of user pushback: first that a toolchest wouldn't
   plausibly be *appraised*, second that "salvaged/reclaimed" framing read
   as Rook-coded, not Mercer-coded). Lock the full 15 before moving on.
4. **Full stat blocks** — write real prices, exact `physics` deltas,
   `synergyEffects` percentages, buff `boostPercent`/`cooldown` values
   directly into `src/content/items/<entrant>.ts`. Magnitudes follow `021`
   's measured per-stat lap-time sensitivity (topSpeed ≈0.14s/lap/point,
   corneringSpeed ≈0.10s/lap/point, acceleration ≈0.02s/lap/point,
   brakingPower ≈0.0096s/lap/point) so a Cheap item is worth
   ~0.10-0.15s/lap regardless of which stat it touches, Mid ~0.25s/lap,
   Chase items meaningfully more (via synergy/buff potential, not just a
   bigger flat number). Every item's `fittedBehavior`/`improvisedBehavior`
   is `{kind: "none"}` — that installation path is still physics-blind
   ([[physics-blind-installation]] in memory). No item sets `identityTag`
   ([[identity-tag-deferred-retirement]]). After writing, verify with a
   direct `tsx` smoke test against the real engine (install a realistic
   combo, confirm synergies/buffs actually fire and change lap times) —
   not just `tsc --noEmit`, which only proves the shape compiles. Then run
   the full suite/lint/build, and check off the relevant `tasks.md` rows.

## Lore profiles so far

### Evelyn Mercer (Coachworks) — LOCKED, ITEMS IMPLEMENTED

| Element | Locked value |
|---|---|
| Core identity | A coachbuilder proving the old trade's standards — fit, finish, load-bearing integrity — are what motor racing is skipping. Not nostalgic; thinks the field is missing steps. |
| Temperament | Unflashy, exacting, quietly competitive. Distrusts anything untested or ostentatious. |
| Era/setting | Coachbuilding trade colliding with the birth of motor racing — wheelwrights, joiners, upholsterers, apprenticeship lineage. |
| Material vocabulary | Ash/elm framing, brass/copper fittings, leather/lacquer, hand-forged iron, joinery terms. |
| Naming convention | *[Material/Technique] + [Part]* — understated, no superlatives. |
| Tag emphasis | `wheel`, `material`, `suspension`, `provenance`. |
| Mechanical throughline | Reliable flat/stacking effects over volatile ones; synergies reward *sets* (matching material/category); a build-around tied to appraising/refurbishing/trading. |

4 chase cards, each anchoring one build archetype: **Matched Coachwork
Wheelset** (matching-set synergy), **Journeyman's Logbook** (stacking
"proven reliability" buff), **Ironbound Axle Assembly** (flat + conditional
durability), **Appraiser's Ledger** (the new value-scaled buff — her
"appraiser" identity, made real rather than left as Economy-inert flavor).
Full 15-item roster with real numbers: `src/content/items/mercer.ts`.

### Lucien Soto (Velodrome) — LOCKED, ITEMS IMPLEMENTED

| Element | Locked value |
|---|---|
| Core identity | A champion cyclist invited to build a car for the first-ever motor race, who — having no coachbuilding trade — builds the only thing he knows: a bicycle, with an engine grafted on. He's not referencing the motorcycle's invention, he's arguably mid-inventing it, because it was the fastest path to the starting line. |
| Temperament | Genuinely out of his depth on the one part he's never touched (the engine), completely unbothered because everything else about a two-wheeled machine — balance, weight, momentum, gearing — he could do blind. An engine, to him, is just a very complicated derailleur. |
| Era/setting | The tail end of the 1890s bicycle boom running headlong into the birth of the motorcycle. |
| Material vocabulary | Steel tube frame, brazed joints, chain/sprocket, spokes, pedal cranks, pneumatic tires (bicycle racers were the actual early adopters). |
| Naming convention | Literal bicycle-part names doing double duty: "Sprocket," "Spoke," "Chain," "Crank," "Frame." Short, componentwise. |
| Tag emphasis | `gearing`, `momentum` (both already established elsewhere in the catalog), `lightweight` (used in the old, now-retired catalog; new to this pass). |
| Mechanical throughline | Builds rhythm through repeated laps: short-cooldown stacking Buffs accumulate acceleration or top-speed amplification, gearing links those two stats, and lightweight synergies reward a tightly curated machine. His late-race sprint emerges from momentum built visibly over the race rather than from a special final-lap rule. Continuous physics items are never misleadingly described as separately "firing"; cadence refers specifically to real cooldown-gated stacking accumulation. |

4 chase cards — **LOCKED** after interactive review: **Racing Crankset**
(Power; short-cooldown stacking acceleration/cadence anchor), **Oversized
Drive Sprocket** (Power; slower stacking top-speed/late-sprint anchor),
**Close-Ratio Chainwheel Set** (Power; mixed acceleration/top-speed gearing
network), and **Double-Butted Tube Frame** (Chassis; exact-count lightweight
curation anchor). All four are 5cr build-defining items. The three-Power/
one-Chassis split is deliberate; the supporting pool leans Chassis and
includes one or two strong 4cr Chassis modifiers that are premium pickups,
not additional archetype anchors.

11 supporting items — **LOCKED** after interactive review: **Pneumatic
Racing Tyres**, **Tensioned Wire-Spoke Wheels**, **Hollow Steel Fork**,
**Cable-Operated Rim Brake**, **Roller-Link Drive Chain**, **Ratchet
Freewheel**, **Chain Tensioner**, **Hand Pump and Pressure Gauge**,
**Two-Speed Drive Hub**, **Kick-Start Chainring**, and **Engine Drive
Pulley**. The complete pool is 10 Power / 5 Chassis, matching The Needle's
Power-heavy topology. Pneumatic Racing Tyres and Tensioned Wire-Spoke
Wheels are premium 4cr Chassis modifiers, intentionally strong pickups but
not separate build-around anchors.

Full 15-item roster with real numbers: `src/content/items/soto.ts`.

### Inez Rook (Fieldworks) — lore and full concept roster LOCKED, stat blocks pending

| Element | Locked value |
|---|---|
| Core identity | An expedition engineer and experimental vehicle designer who refuses to let existing vehicle categories decide what belongs in a racing machine. She transfers serious technology across aviation, industry, expeditions, and transport, using competition to discover combinations convention would never test. |
| Temperament | Animated, technically confident, and delighted by unanswered engineering questions. Audacious but not careless: every experiment has a hypothesis, instrumentation, and a reason to exist. |
| Era/setting | Experimental engineering at the boundary between early aviation, expedition vehicles, industrial power systems, and the newly forming idea of motorsport. |
| Material vocabulary | Aircraft engines, propellers, streamlined canvas, pressure-fed fuel systems, multi-axle steering linkages, articulated wheel bogies, cooling jackets, pumps, gauges, control valves, structural tubing, and test instruments. |
| Naming convention | Direct technical or prototype names describing the experiment — e.g. Aircraft Engine Cradle, Six-Wheel Tracking Bogie, Variable-Pitch Propeller, Pressure-Fed Carburetor. Avoid cracked/patched/scrap/surplus language that implies inferior construction. |
| Tag emphasis | `airflow`, `pressure`, `heat`, `control`, and `experimental`, with bridges to `lightweight`, `information`, `suspension`, and `gearing`. |
| Mechanical throughline | Cross-disciplinary systems rather than cobbled parts: multi-stat components, contextual effects, and multi-tag synergies connect technologies that normally belong to different machines. Exceptional performance in one regime may carry an explicit engineering tradeoff elsewhere. Count amplification represents a complete experimental system coming online, and The Lark's two Flex slots embody her refusal to respect conventional Power/Chassis boundaries. |

Canonical roster, vision, entrant content, vehicle-topology example, visual
language, and task T022 were updated alongside this lock to remove the old
resource-starved salvager framing. Her four directions are aviation power,
experimental running gear, instrumented controlled-limit engineering, and
cross-disciplinary prototypes.

4 chase cards — **LOCKED** after interactive review: **Variable-Pitch
Propeller** (Power; aviation/airflow top-speed anchor), **Six-Wheel Tracking
Bogie** (Chassis; exceptional cornering/braking with an explicit engineering
tradeoff), **Calibrated Pressure Manifold** (Power; count-based instrumented
pressure-system amplifier), and **Interchangeable Test Mounts** (Chassis;
cross-disciplinary Power/Chassis integration anchor). The 2 Power / 2
Chassis split is deliberate for The Lark's balanced core and two Flex slots.

11 supporting items — **LOCKED** after interactive review: **Rotary Aero
Engine**, **Pressure-Fed Carburetor**, **High-Pressure Fuel Pump**,
**Instrumented Cooling Jacket**, **Dynamometer Takeoff**, **Variable-Ratio
Test Gearbox**, **Streamlined Balloon Fabric**, **Articulated Steering
Linkage**, **Differential Braking Valve**, **Gyroscopic Stabilizer**, and
**Airflow Test Vane**. The complete concept roster is 8 Power / 7 Chassis.
Every category is physically legible: Power items generate/feed/cool/measure/
transmit power; Chassis items provide structure, steering, braking,
stabilization, or aerodynamics. Exact prices and stat blocks have not yet
been authored in `rook.ts`; resume at stage 4 after Nell's concept pass if
the user continues character-first authoring.

### Nell Voss (Backroads) — lore LOCKED, chase cards in authoring

| Element | Locked value |
|---|---|
| Core identity | A customs runner and rulebook engineer who treats written regulations and accepted racing etiquette as assumptions waiting to be tested. She builds to the exact limit, finds the unguarded interpretation or racing line, and commits before it closes. |
| Temperament | Watchful, disciplined, dryly amused by institutional confidence, and more aggressive than she first appears. She recognizes narrow opportunities early and commits completely rather than racing recklessly. |
| Background | Rules in her prior work were often written without concern for whether ordinary people could survive beneath them. She learned to distinguish legality from fairness and exploit every available loophole when survival required it. Racing lets her prove that intelligence openly. |
| Era/setting | A first championship inventing technical regulations, inspection standards, timing, and enforcement while competitors are already racing. Definitions and measuring procedures are full of gaps. |
| Material vocabulary | Oversized reserve lines, removable ballast, auxiliary controls, adjustable body panels, interchangeable number plates, inspection seals, measuring tanks, shuttered lamps, document cases, declaration plates, and quick-release equipment. |
| Naming convention | Innocuous official or technical names whose implications emerge from their effects — Declared Fuel Measure, Removable Inspection Ballast, Auxiliary Starting Tank, Adjustable Bodywork Stay, Stamped Compliance Plate. Humor comes from technically truthful wording, never cartoon criminality. |
| Tag emphasis | `loophole`, `information`, `exposure`, `evasion`, `fuel`, and `wager`, with bridges to `provenance`, `pressure`, `control`, and `momentum`. |
| Mechanical throughline | Exact-condition and exact-composition effects represent technical loopholes; strong braking and corner-entry effects represent aggressive moves prepared before the race; exposure pieces exchange safety margin or general performance for exceptional pace in a narrow situation; information identifies the opening; getaway effects accumulate speed after commitment. |
| Moral boundary | She may conceal capacity, exploit measurement procedures, stretch technical definitions, pressure a rival, brake exceptionally late, or take an unfashionable line. She never tampers with another machine, deploys hazards, or deliberately causes a collision. |

Canonical roster, vision, entrant content, and task T023 were updated with
this lock. Opponent-reactive effects remain future capability; this first
pass expresses the identity through exact counts/compositions, contextual
physics, visible tradeoffs, value scaling, and stacking escape speed.

4 chase cards — **LOCKED** after interactive review: **Stamped Compliance
Plate** (Power; exact-composition rulebook anchor), **Late-Braking
Equalizer** (Chassis; exceptional braking/tight-corner attack with a visible
general-performance tradeoff), **Lookout's Timing Board** (Chassis;
information-driven contextual amplifier), and **Auxiliary Starting Tank**
(Power; stacking getaway-acceleration anchor). The 2 Power / 2 Chassis split
matches The Hush. The Compliance Plate's eventual stat block must use a
literal exact-count/category condition the current engine can verify; its
flavor must not overclaim a whole-topology rule the simulation does not read.

11 supporting items — **LOCKED** after interactive review: **Declared Fuel
Measure**, **Oversize Reserve Line**, **Chopped Flywheel**, **Quick-Change
Final Drive**, **Sealed Instrument Case**, **Bookmaker's Declared Margin**,
**Removable Inspection Ballast**, **Adjustable Bodywork Stay**, **Split-Circuit
Brake Valve**, **Unmarked Route Book**, and **Quick-Release Lamp Shutters**.
The complete roster is 8 Power / 7 Chassis. Ten supports are functional;
Bookmaker's Declared Margin is an explicit, honestly presented Economy
placeholder until the deferred capability lands. Full stat blocks live in
`src/content/items/voss.ts`.

## What's fully done, live, and tested (all uncommitted)

- `021-arcade-physics-simulation`, `022-contextual-physics-effects`,
  `023-stat-targeted-amplifiers` — fully implemented, fully tested.
- `020-character-item-pools` — fully implemented through all 42 planned
  tasks: 70-item catalog, entrant gating, cross-pollination, rival integration,
  legacy catalog retirement, documentation, and browser validation.
- The value-scaled Buff capability (T019a) — implemented, tested.
- All four 15-item exclusive pools and the 10-item Neutral pool are implemented
  and validated against the real engine.
- **745/745 tests passing, `tsc --noEmit` clean, `npm run build` clean,
  `eslint .` clean** as of the last full-suite run this session.

## What's still blocked / not started

- No work remains for feature 020. The old 20-item production catalog is gone;
  exact legacy fixtures remain test-only in `tests/fixtures/legacy-item-pool.ts`
  to preserve historical simulation expectations.
- **Deferred by explicit decision, not yet speccable**: a follow-up
  feature bundling (a) real Economy mechanics (income/resale hooked to the
  `Bookmaker's Chit`/`Engine Builder's Nameplate`/`Patron's Brass Plaque`-
  style placeholder items already authored), (b) item-to-item value
  mutation (the Bazaar-style "boosts another item's value" mechanic
  explicitly *not* built this session — only the read-only value-scaled
  buff was), and (c) Fitted/Improvised installation becoming physics-aware.
  All three are the same category of work (see memory: [[economy-items-
  capability-deferred]], [[value-scaled-buff-capability]], [[physics-
  blind-installation]]) — batch them into one feature once the full
  70-item pass is done, per explicit user instruction earlier this
  session. Don't start speccing this until Rook/Voss are also done.
- **`024-item-stat-presentation`** — a spec draft exists
  (`specs/024-item-stat-presentation/spec.md`) from before this session's
  most recent compaction. Not planned, not started, not currently being
  worked on. Unrelated to `020`; don't conflate the two.
- **Eventual `identityTag` full retirement** — the production catalog no longer
  authors it, but the compatibility field remains in shared types for legacy
  fixtures and older simulation contracts.

## Critical process notes for whoever picks this up

- **This repo has no native Claude Code `/speckit.*` slash commands.**
  They're GitHub Copilot agent-format files at
  `.github/agents/speckit.{specify,clarify,plan,tasks,analyze,implement}.agent.md`.
  Read the file and follow its documented steps exactly; use
  `.specify/scripts/bash/{create-new-feature,check-prerequisites,setup-plan,setup-tasks}.sh`
  for path resolution.
- **Strict test-first (red-green TDD) is a hard project convention** for
  everything under `src/simulation/`/`src/content/`. Followed throughout
  this session — every implementation task had a RED test confirmed first,
  including the two capability additions discovered mid-flight
  (`drawItem`'s guard, the value-scaled buff).
- **Even a fully-planned, analyze-passed spec can still hide a real bug
  that only surfaces at implementation time.** `020`'s `drawItem` fix is
  this session's example — `research.md` Decision 2 originally reasoned
  (on paper, plausibly) that no code change was needed, and was proven
  wrong the moment real tests ran against the real (identityTag-less)
  catalog instead of the old one. When a "should need no change" claim
  meets real content, verify it by running the tests, not by re-reading
  the reasoning.
- **`itemPools.ts` importing `SPONSOR_OBJECTIVE_TAGS` from `run.ts`, which
  itself already imports from `encounters.ts`, which imports `itemPools.ts`,
  is a real three-way circular import — and it works**, because none of the
  three modules read the cross-module value at their own top level, only
  inside function bodies called after the whole graph finishes evaluating.
  Confirmed safe via `tsc`, `vitest`, and `vite build` all passing. This
  mirrors an *existing* two-way `run.ts`↔`encounters.ts` cycle this
  codebase already shipped with — don't be alarmed by the cycle itself,
  just don't add a top-level cross-module read to any of the three.
- **Testability pattern for content-backed pure functions**:
  `poolForEntrant`/`validateItemPools` are effectively zero-argument (they
  close over the real `NEUTRAL_ITEMS`/`EXCLUSIVE_ITEMS`), which leaves no
  seam for testing against synthetic fixtures before real content exists.
  Resolved by exporting a parameterized core (`resolveEntrantPool`/
  `validatePoolContent`) alongside the real public wrapper — the public
  contract (`contracts/item-pools-contract.md`) is unchanged, the
  parameterized variant exists purely for tests. Reuse this pattern for any
  future itemPools.ts-shaped problem.
- **Simulation stays framework-free.** `src/simulation/` has zero Phaser
  imports; scenes only render/format precomputed results.
- **Balance constants remain genuinely unfixed/tunable** — this now
  includes `020`'s own Cheap/Mid/Chase price tiers (2cr/4cr/5cr) and every
  numeric `physics`/`buff`/`synergyEffects` value authored into
  `mercer.ts` so far. Nothing here is final balance, just working values
  consistent with `021`'s sensitivity weights.
- **Automated browser testing note**: the in-app Browser pane's screenshot
  pixel space is 800×450 regardless of visual render size — target that
  space directly. This project's dev server (`vite`) may already be
  running in the background from a prior session on port 5173; check
  before starting a new one.

## Where to look first

1. `specs/020-character-item-pools/tasks.md` — the authoritative task list;
   every task is checked off.
2. `src/content/items/` — the complete 70-item catalog.
3. `specs/020-character-item-pools/research.md` — Decisions 1-8, especially
   2 (the `drawItem` fix) and 8 (the value-scaled buff) if extending either
   mechanism further.
4. Memory files (`/Users/micah/.claude/projects/-Users-micah-Documents-repos-auto-racer/memory/`):
   `item-authoring-format.md`, `identity-tag-deferred-retirement.md`,
   `physics-blind-installation.md`, `economy-items-capability-deferred.md`,
   `value-scaled-buff-capability.md`, `item-signature-notation.md` — all
   directly relevant to continuing the authoring pass.
5. `specs/DEFERRED.md` / `specs/skribidi-gap-decisions.md` — longer-
   standing out-of-scope tracking, still accurate, unrelated to this
   session's work.

## 2026-08-13 — Feature 028 implemented; feature 029 specified

- `specs/028-pre-race-setup/spec.md` is the authoritative full specification.
  Implementation is complete: the proof singular brake-balance control
  (`BrakeBalanceSetting`/`LockedRaceSetup.setting`/`.statDeltas`) is fully
  replaced by a versioned, multi-control domain in `simulation/raceSetup.ts`
  — seven launch families (universal Driver Aggression plus six
  installed-item equipment families), same-family cross-pool aggregation,
  and `lockRaceSetup`/`validateLockedRaceSetup` with full tamper rejection.
- `PreRaceScene.ts` (backed by pure `scenes/raceSetupPresentation.ts`) shows
  the exact upcoming track, current/prospective four-stat comparison, every
  eligible control with keyboard/touch/mouse-operable positions, and a
  factual track-capability-alignment line — with zero opponent/field/purse/
  sponsor/prediction data anywhere in the model (verified by string-scan
  tests). All seven launch items are authored: Hand-Fitted Steering Knuckle
  (steering-response), Two-Speed Drive Hub (gearing), Variable-Pitch
  Propeller (propeller-pitch), Differential Braking Valve + Split-Circuit
  Brake Valve (shared brake-balance), Gyroscopic Stabilizer (racing-line),
  Adjustable Bodywork Stay (bodywork-trim) — the authored 1/1/3/2 Evelyn/
  Lucien/Inez/Nell distribution (FR-008B).
- Setup is canonical and per-car: `CarResult.setup` (not a top-level
  `NCarContestResult` field) holds each car's own locked setup.
  `simulation/rivals.ts`'s `selectGeneratedRivalSetup` gives every generated
  rival a deterministic, exhaustively-searched (≤3^5=243 candidates) legal
  setup via the same `lockRaceSetup`/`simulatePlayerLaps` authorities humans
  use — gated behind a new optional `encounterId` parameter on
  `resolveContest`'s N-car overload so every pre-028 call site (tests,
  fixtures) keeps its exact legacy numeric output unchanged; only
  `ContestScene` (real gameplay) supplies it. Worst-case measured cost is
  ~50ms/rival, ~350ms for a fully-equipped 8-car field, one-time at race
  start (not per-frame).
- Remember setup (`Run.setupMemory`, optional/absent-by-default) and
  exact-track Test Day (`PracticeSetupSnapshot`, a new `"pre-race-setup"`
  practice origin routing back to `PreRaceScene` instead of `RunScene`) are
  both implemented — Test Day now resolves against the real upcoming track
  and a temporary locked setup snapshot rather than the generic no-track
  path, restoring the exact prior draft/checkbox/focus on return, and never
  writing remembered or scored state. Verified live in-browser end to end.
- `specs/029-championship-expansion/spec.md` specifies the next schedule as
  24 stages / 8 rounds (`[choice, choice, PvP] × 8`). It is deliberately
  specified but not implemented yet.
- Verification after 028: full suite green (1000+ tests, up from the
  pre-028 894), lint clean, production build/typecheck clean (only the
  pre-existing bundle-size warning). One known gap: the 2-4-installed-
  equipment control-row layout was verified at the unit/presentation level
  (exhaustively) but not re-confirmed live in-browser at 800×450 — reaching
  that state through the real draft economy is RNG-gated; worth a follow-up
  manual pass before considering the visual polish fully closed.
