# Quickstart: Race Playback Controls

## Implementation sequence

1. Run current playback, ContestScene, and Test Day regression suites.
2. Add failing pure clock/rate/idempotency and crossed-boundary tests.
3. Implement the framework-free playback clock and direct control model.
4. Integrate scored playback, then normalize Test Day speed behavior.
5. Add scene-boundary and immutable-result equivalence coverage.
6. Complete full automated and browser gates.

## Required verification

- A fixed race takes approximately 40 seconds entirely at `1×` and approximately 20 seconds entirely at `2×`.
- Changing speed at arbitrary times never changes elapsed schedule time discontinuously.
- One large update and equivalent small updates identify the same crossed lap/finish boundaries exactly once.
- Multiple speed sequences pass the identical result object to Results.
- Every newly opened scored race and Test Day starts at `1×`.
- Keys `1` and `2` match pointer/touch selection.
- Active state is readable without color and controls do not overlap existing evidence at 800×450.
- Test Day retains Cancel, Pause, Skip, and focus behavior, but never exposes 4×.
- Scored races expose neither Pause nor Skip.

## Commands

```sh
npm test -- --run tests/unit/playback.test.ts tests/unit/playbackControlPresentation.test.ts tests/integration/playback-controls.test.ts
npm test
npm run lint
npm run build
```

## Scope guard

Reject pause/skip additions to scored races, remembered speed, automatic speed choice, schedule/result mutation, simulation changes, multiplayer/network work, and overtake dramatization.
