# Auto Racer

Working title. An async, 2D auto-battler set at the dawn of an alternate Motor
Age. Invited owner-builders enter the inaugural 1901 Auto Race Championship in
anything they can make self-propelled. Every entrant's machine begins with
equivalent performance and capacity; identity comes from draft bias, items,
synergies, and the strange route each build takes toward winning. See
`specs/vision.md` for the living design direction and
`.specify/memory/constitution.md` for binding product constraints.

## Stack

TypeScript + [Phaser 3](https://phaser.io/) + [Vite](https://vitejs.dev/).
See `specs/001-core-loop/research.md` for why.

## Getting started

```bash
npm install
npm run dev
```

Opens the Vite dev server — the game loads in a browser tab.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build (`dist/`) + a full type-check |
| `npm run simulation:log` | Resolve a representative build and write its full result to `logs/simulation-result.json`, plus a fixed Test Day practice result to `logs/practice-result.json` |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint over the whole project |

## Testing philosophy

Only `src/simulation/` (lap-tick contest resolution, cooldowns, slots, weighted
drafting, and buff resolution) is held to strict TDD — tests are written and
confirmed failing before implementation, per the constitution's resolved
testing-discipline decision. Everything else (`src/scenes/`, the Phaser
presentation layer) is tested lightly or checked manually. This is deliberate,
not partial coverage by oversight.

## Manual validation

The item catalog contains 10 shared Neutral items plus 15 exclusive items for
each of the four entrants. Standard Reward Draft and Parts Supplier encounters
draw only from Neutral plus the selected entrant's pool; Cross-Pollination
occasionally offers three parts from exactly one other entrant's exclusive
workshop. Drag offers onto the selected vehicle's four typed slots or three
storage positions. Items expose physical-stat changes, contextual effects,
cooldowns, Buffs, Synergies, tiers, and storage behavior throughout preparation.

Contests resolve deterministically over 10 laps, then play back as a watched
race around an oval track for roughly 20 seconds. The two cars follow their
precomputed lap pacing, the player's board stays visible along the bottom and
flashes each direct or stacking item when it fires, and a live indicator names
the current leader and numeric gap. The result screen appears only after both
cars finish and remains unchanged.

Direct items recur on their authored cooldowns. Buffs come in three kinds:
flat buffs remain constant, stacking buffs grow on their firing laps, and
count-synergy buffs scale with how many matching-tag items are held across
board and storage combined, active or inert. The fixed-pace ghost contributes
the same time every lap, and each result includes a complete lap breakdown
with per-item contribution values for presentation and diagnostics.

Run `npm run simulation:log` to generate a pretty-printed JSON fixture from a
representative contest. The generated `logs/` directory is intentionally
ignored so repeated test runs do not dirty the repository.

`specs/006-race-visualizer/quickstart.md` has the runnable scenarios for the
current feature. Run `npm run dev` and walk through them in a real browser to
validate playback, board-item flashes, the leader indicator, and the unchanged result
screen. The underlying schedule and frame calculations are covered by the
simulation suite.

## Test Day (unscored build testing)

Test Day is a low-stakes practice contest, required by Constitution Principle
V, that lets a player try their current build before it counts. It is
reachable from three origins during an active run: the run hub, a stable
Supplier/Reward Draft acquisition screen, and a pre-start PvP briefing. It is
unavailable — with an explicit, specific reason shown on screen — when there
is no active run, the run has ended, the build is invalid, a purchase/restock/
drag/replacement/eviction/sponsor confirmation is unresolved, contest playback
or scored settlement is active, the origin/encounter is missing, or a leftover
recovery capsule no longer matches the current run.

Every Test Day contest uses the same fixed, disclosed configuration
(`test-day-v1`): the `ghost-001` sample rival at a fixed 5.85s/lap pace over
exactly 10 laps, no RNG. Starting a test locks an immutable snapshot of the
current build and resolves it through the same authoritative `resolveContest`
path used for scored races — the result and playback facts are exactly equal
to a direct scored resolution for the same inputs. A completed test never
touches credits, sponsors, run history, stage progress, or the next scored
opponent; leaving Test Day (cancel or return) restores the exact run object
and origin screen you left, unchanged.

The result screen shows full evidence for every held item on every lap —
trigger/cooldown state, buff source and amount, storage-active state, and the
minimum-lap-time clamp — with no data hidden behind hover. Repeating a test
after changing the build shows a comparison against the immediately previous
test in the same run (build changes, total/gap/outcome deltas); this
comparison is presentation-local and is cleared when the run ends, is
abandoned, or becomes unavailable.

Recovery (`src/simulation/practiceRecovery.ts`) guards against a stale or
corrupted practice capsule left in `sessionStorage`: it is versioned
(`test-day-recovery-v1`), canonically serialized, and checksummed with a
non-cryptographic `fnv1a64-v1` fingerprint that is recomputed and cross-checked
(run ID, origin, snapshot, and fixed config) on every read, so even a
syntactically valid but mutated capsule is rejected rather than silently
accepted. Note the scope of what this actually protects: this codebase has no
run-persistence layer at all today (nothing survives a real page reload), so
recovery only guards in-session state — for example, a capsule left over from
a different run — not resuming an interrupted Test Day after a browser reload.

Practice entry, briefing, playback controls, inspection, comparison, and
return are all reachable by mouse, touch (no hover or precision drag
required), and keyboard: every control has its own dedicated key (Escape to
cancel/return, Enter to start, Space to pause, F to change speed, S to skip,
R to repeat) in addition to a visible Tab-cycled focus ring. Every semantic
state (unscored, selected, focused, disabled, unavailable, changed, improved,
worsened) is carried in text, not color alone. Interactive control labels
render at 16 CSS px or larger and supporting text at 14 CSS px or larger.

Validation commands:

```bash
npx vitest run tests/unit/practice.test.ts tests/unit/practice-determinism.test.ts \
  tests/unit/practice-protected-state.test.ts tests/unit/practiceRecovery.test.ts \
  tests/unit/practicePresentation.test.ts tests/integration/test-day-flow.test.ts \
  tests/integration/test-day-boundaries.test.ts tests/integration/test-day-recovery.test.ts
npm run simulation:log   # also writes logs/practice-result.json
```

See `specs/011-build-test-day/quickstart.md` and
`specs/011-build-test-day/acceptance-evidence.md` for the full validation
workflow and retained evidence.

## Demo deployment (GitHub Pages)

Feature 031-demo-deployment publishes a shareable demo to
`https://threatlvlmidnight.github.io/auto-racer/`. Releases are deliberate:
ordinary pushes and pull requests run verification only and never deploy; only
a manually selected semantic demo tag can become the public demo, and every
release passes the full gates (tests, lint, build, artifact audit) plus a
post-deployment public smoke check. The deployed game is fully static — no
multiplayer service, accounts, secrets, or server-side process.

### One-time repository setup (administrator)

1. Open repository **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions**.
3. Confirm the protected `github-pages` environment permits the
   **Deploy demo release** workflow (add required reviewers here if you want
   a second human gate on every publication).

### Publish a demo release

Creating a tag only makes a revision eligible — it does not deploy. Tag,
then manually dispatch:

```bash
git tag -a demo-v0.1.0 -m "First public demo release" <approved-commit>
git push origin demo-v0.1.0
```

1. Open **Actions → Deploy demo release → Run workflow**.
2. Enter the exact tag (e.g. `demo-v0.1.0`) and run it.
3. Watch the stages: tag grammar validation → exact remote-tag resolution →
   checkout of the resolved revision → tests → lint → identity build →
   artifact audit → Pages deployment → public smoke check.
4. Inspect the workflow **summary** for the deployment URL, selected tag,
   resolved revision, and healthy/unhealthy result. The live title screen
   footer shows `<demo-tag> · <short-revision>` as a second confirmation.

Any failed pre-deployment gate leaves the currently published demo
untouched. A failed smoke check marks the release unhealthy and names the
failing public resource; no automatic rollback runs.

### Ordinary releases

Increment the semantic demo version (`demo-vMAJOR.MINOR.PATCH`), tag the
approved revision, and manually dispatch that tag. Tag names must use
non-negative integer components with no omitted component or leading zero.

### Manual rollback

Recovery is the same release operation with a previous tag — there is no
current-release state file and no automatic rollback controller:

1. Identify the previously healthy demo tag from workflow/deployment history.
2. **Actions → Deploy demo release → Run workflow** with that existing tag.
3. Wait for all verification, deployment, and smoke stages to complete.
4. Confirm the title footer once again shows the restored tag and revision.

### Local release validation

| Command | Does |
|---|---|
| `npm run build:pages` | Production build beneath the `/auto-racer/` prefix (set `VITE_DEMO_RELEASE_TAG`/`VITE_DEMO_REVISION`/`VITE_DEMO_BUILT_AT_UTC` for a simulated release identity) |
| `npm run preview:pages` | Serve the prefixed build locally at `http://localhost:4173/auto-racer/` |
| `npm run audit:artifact` | Run the forbidden-path/credential-pattern audit over `dist/` |
| `npm run verify` | Tests + lint + build, the same gates CI enforces |

```bash
node scripts/smoke-demo.mjs --url http://localhost:4173/auto-racer/ \
  --tag demo-v0.1.0 --revision "$(git rev-parse HEAD)"
```
