# Internal Contract: Simulation Module

This project has no external API, service, or other system consuming it — the
only "interface" worth contracting is the boundary between `src/simulation/`
(framework-free, strictly TDD'd) and `src/scenes/` (Phaser presentation). That
boundary is documented here because it's the one this feature's tests are
written against first (Constitution Development Workflow — TDD for simulation
logic).

## `resolveContest`

```ts
function resolveContest(build: Build, ghost: SampleGhost): ContestResult
```

**Inputs**:
- `build: Build` — see data-model.md. Represents the player's accept/decline
  decision already applied.
- `ghost: SampleGhost` — see data-model.md. This feature's one fixed sample ghost.

**Output**: `ContestResult` — see data-model.md. Includes the win/loss/tie
outcome, the gap, the qualitative comparison data, and the internal `timeline`.

**Invariants (test these first, per strict TDD)**:

1. **Determinism**: calling `resolveContest` twice with the same `build` and
   `ghost` MUST return deep-equal results, including `timeline` (Success
   Criteria SC-003).
2. **Outcome correctness**: `outcome` MUST be `"win"` iff `playerTime < ghostTime`,
   `"loss"` iff `playerTime > ghostTime`, `"tie"` iff `playerTime === ghostTime`
   (FR-004, FR-011).
3. **Detectable effect**: `resolveContest({..., itemAccepted: true}, ghost)` and
   `resolveContest({..., itemAccepted: false}, ghost)` against the same `ghost`
   MUST produce different `playerTime` values whenever `item.timeModifier !== 0`
   (Success Criteria SC-004).
4. **No side effects**: `resolveContest` MUST NOT mutate its inputs, read global
   state, or depend on wall-clock time, randomness, or any browser/DOM API.
5. **Purity enables isolation**: this function and everything it calls MUST be
   importable and testable under Vitest with no Phaser instance, no canvas, and
   no DOM — this is what makes the "framework-free simulation core" constraint
   in plan.md true rather than aspirational.

## Non-goals for this contract

- No network calls, no persistence — nothing here reads or writes storage
  (Technical Context: Storage = N/A for this feature).
- No live/streamed output — `timeline` is returned whole, not emitted
  incrementally. A future live-playback feature consumes this same return value;
  it does not require a different contract, only a different consumer.
