# Playback Control Contract

## 1. Presentation-only authority

Playback speed may read immutable schedules/results and produce presentation time/events. It must not write or recompute build, setup, track, lap, car, outcome, settlement, standings, reputation, sponsor, or run evidence.

## 2. Exact speed semantics

| Display | Schedule-time multiplier | Whole-race duration versus legacy |
|---|---:|---:|
| `1×` | `0.5` | `2.0×` |
| `2×` | `1.0` | `1.0×` |

Every new scored or Test Day playback selects `1×`.

## 3. Monotonic transition

Selecting speed must not modify elapsed schedule time. For every valid frame delta, next schedule time must be greater than or equal to previous schedule time. Playback never restarts or rewinds.

## 4. Boundary integrity

All recorded boundaries in `(previousScheduleTime, nextScheduleTime]` are emitted once in deterministic order. Boundaries at `previousScheduleTime` are not emitted again. A delayed frame and many small frames covering the same interval must identify the same boundary set.

## 5. Message lifecycle

Messages have no playback-scaled dismissal timer. A message remains until a later event replaces it. Multiple messages reached in one update are applied in recorded order with the final one remaining visible. There is no cross-frame message queue, and Results navigation is never delayed for message display.

## 6. Input and state

- Pointer/touch activation and key `1` select `1×`.
- Pointer/touch activation and key `2` select `2×`.
- Selection is idempotent.
- Exactly one control exposes a text/shape selected state independent of color.
- Scene shutdown removes handlers.
- No selection persists into another playback.

## 7. Existing Test Day boundary

Test Day keeps its established Cancel, Pause, Skip, and focus behavior. Its speed domain becomes the exact shared two-value contract. Scored races do not gain Pause or Skip.

## 8. Result equivalence

Given the same immutable contest result, every speed sequence must navigate with the same exact result object/evidence as an all-`1×` control. Only real watch duration and transient presentation state may differ.
