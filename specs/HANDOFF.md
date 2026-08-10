# Handoff

**Last updated**: 2026-08-09, end of the post-demo planning session.

**State**: Working tree clean, `main` fully in sync with `origin/main`
(`8701952`). **Zero implementation code changed this session** — every
commit below is planning documents only (`specs/`). The app itself is
still exactly where it was after `e374a8a` (feature 010 complete + item
pool expanded to 20).

## What happened this session, in order

1. Finished feature `010-entrant-vehicle-garage` (Phases 4-5: PrepareScene
   garage rewrite, installation-aware simulation) and expanded the item
   pool 15→20 for a demo.
2. The demo happened. Feedback: add depth via "another screen." A
   collaborator ("Alex") sent a POC (`skribidi_skids_poc.html`, not in
   this repo) with a comparable but more mature economy/combat/season
   design.
3. Produced a full gap analysis comparing the POC to this codebase
   (published as a Claude Artifact — link no longer in this session's
   memory, regenerate from the analysis in `specs/skribidi-gap-decisions.md`
   if needed).
4. Walked through all 9 systems from that analysis via guided Q&A with
   the owner and recorded every decision in
   **`specs/skribidi-gap-decisions.md`** — this is the single
   authoritative "what did we decide and why" document for this whole
   arc. Read it first.
5. Ran the full spec-kit workflow (specify → clarify → plan → tasks) for
   every adopted system, one at a time, writing real spec-kit documents
   for each — no shortcuts, no chat-only decisions.

## What's fully planned and ready to build (in dependency order)

| # | Feature | What it does | Depends on |
|---|---|---|---|
| 1 | `012-multi-ghost-contest` | 6-8 car field (7 rivals + player), deterministic N-way standings, a small catalog of level-scaling NPC rival builds | Nothing — build this first |
| 2 | `013-race-spectacle` | Real race visualization: 3 fixed hand-authored tracks, deterministic seed-based track selection, no speed/skip control (pacing quality is the bar, not a fast-forward button), curated ticker | `012` (needs `NCarContestResult`) |
| 3 | `014-item-synergy-tags` | Two new item-effect shapes: Boost-Others (tag/category-targeted buffs to other held items) and Self-Conditional (an item's own effect changes based on build composition) | Independent |
| 4 | `015-economy-depth` | Reputation as a real lose-condition (new `"failed"` `RunStatus`), interest on banked credits, half-price item sell-back, Parts Supplier card-locking. Win/loss streaks explicitly deferred until `017` lands. | Independent |
| 5 | `016-duplicate-item-tiering` | Acquiring a duplicate item upgrades it (★1→★3) in place instead of wasting a slot; max-tier duplicates auto-convert to credits | Independent (reuses `015`'s sell-back math for its formula, not its code) |
| 6 | `017-season-structure-grow` | Grows the run from 6 stages (4 choice + 2 PvP) to 12 (8 choice + 4 PvP), same 2:1 ratio | Independent structurally, but `012`'s rival-scaling and `013`'s track selection were explicitly written to already generalize past ordinal 2 — verify that once both exist |

Every one of these has, in its `specs/NNN-.../` directory: `spec.md`,
`checklists/requirements.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/*.md`, `quickstart.md`, and `tasks.md` (checklist-formatted,
dependency-ordered, organized by user story). **Start any of them by
reading `tasks.md`** — it's the executable entry point.

**Recommended build order**: `012` first — it unblocks `013`, and `013`
is what `pre-race-setup` (below) is waiting on. `014`/`015`/`016`/`017`
have no cross-dependencies and can be built in any order, or in
parallel by different people.

## What's still blocked / not started

- **§8 Pre-race screen** (`specs/skribidi-gap-decisions.md` §8,
  working title `pre-race-setup`) — track preview + item-driven controls
  (e.g. a brake-bias slider for builds with configurable items). Cannot
  be meaningfully specified until `013-race-spectacle` is *actually
  built* (not just planned) — it needs a real track model to preview
  and tune against. This is the last item from the original gap
  analysis; nothing else is waiting.
- **Rejected, no work planned**: garage slot count increase (§3 — stays
  at 4 active / 3 storage), sabotage/inspection risk items (§9 — the
  POC's live catch-chance roll conflicts with Constitution Principle
  III; would need a deterministic redesign to reconsider).
- **Explicitly out of scope, tracked in `specs/DEFERRED.md`**:
  Scrutineering, Factory Development, and Privateer Exchange (phase-two
  encounter types with zero defined mechanics — someone needs to design
  these from scratch before they're speccable); event-type variety
  (Circuit/Drag/Drift/Demolition/Show-style scoring axes).

## Critical process notes for whoever picks this up

- **This repo has no native Claude Code `/speckit.*` slash commands.**
  They're GitHub Copilot agent-format files at
  `.github/agents/speckit.{specify,clarify,plan,tasks}.agent.md`. To run
  one, read the file and follow its documented steps exactly — use
  `.specify/scripts/bash/{create-new-feature,check-prerequisites,setup-plan,setup-tasks}.sh`
  for path resolution. Don't assume a slash command exists; there isn't
  one. If Claude Code adds native spec-kit support later, prefer that
  instead.
- **`.specify/memory/constitution.md` is at v1.3.0.** Amended this
  session: Principle I now allows "one or more recorded ghosts," not
  just 1v1, to unblock `012`.
- **Strict test-first (red-green TDD) is a hard project convention** for
  everything under `src/simulation/` — every `tasks.md` above already
  encodes this, don't skip the RED step when implementing.
- **Simulation stays framework-free.** `src/simulation/` has zero Phaser
  imports; scenes in `src/scenes/` only render/format precomputed
  results, never compute anything live. This shows up repeatedly in the
  planning docs above (e.g. `013`'s explicit "no live RNG during
  playback" requirement) — don't reintroduce live computation into a
  scene.
- **Balance constants are deliberately left unfixed** in several specs
  (reputation thresholds in `015`, tier-bonus percentage in `016`,
  lap-count progression in `017`) — these need a tuning pass during
  implementation, not before. Don't block on picking "the right number"
  before starting; each plan.md already says where the placeholder
  lives.

## Where to look first

1. `specs/skribidi-gap-decisions.md` — why any of this exists
2. `specs/DEFERRED.md` — everything intentionally not done yet, and why
3. `specs/012-multi-ghost-contest/tasks.md` — the actual next thing to
   build
