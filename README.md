# Auto Racer

Working title. An async, 2D auto-racer built around a spec-series structure:
every build starts from the same shared baseline car, and team identity is
expressed by how much a build deviates from it. See `specs/` for the
Spec-Kit design history — start with `.specify/memory/constitution.md`, then
`specs/001-core-loop/` for the first vertical slice.

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
| `npm run simulation:log` | Resolve a representative build and write its full result to `logs/simulation-result.json` |
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

The prepare phase presents five offers drawn from a 14-item pool. The active
Performance identity weights each draw toward Performance-tagged items while
keeping neutral items available. Drag offers onto the three-slot board, use
Next to advance or decline, and use the once-per-round Refresh to reroll. A
toggleable three-slot storage area accepts board items and supports swapping;
stored items are inert except for the visibly marked Tyre Rack. Item tags,
effects, and slot contents stay visible throughout preparation. A Performance
buff can amplify matching direct items held with it.

Contests resolve deterministically over 10 laps, then play back as a watched
race around an oval track for roughly 20 seconds. The two cars follow their
precomputed lap pacing, the player's board stays visible along the bottom and
flashes each direct or stacking item when it fires, and a live indicator names
the current leader and numeric gap. The result screen appears only after both
cars finish and remains unchanged.

Direct items recur on their authored cooldowns, flat buffs remain constant, and
stacking buffs grow on their firing laps. The fixed-pace ghost contributes the
same time every lap, and each result includes a complete lap breakdown with
per-item contribution values for presentation and diagnostics.

Run `npm run simulation:log` to generate a pretty-printed JSON fixture from a
representative contest. The generated `logs/` directory is intentionally
ignored so repeated test runs do not dirty the repository.

`specs/006-race-visualizer/quickstart.md` has the runnable scenarios for the
current feature. Run `npm run dev` and walk through them in a real browser to
validate playback, board-item flashes, the leader indicator, and the unchanged result
screen. The underlying schedule and frame calculations are covered by the
simulation suite.
