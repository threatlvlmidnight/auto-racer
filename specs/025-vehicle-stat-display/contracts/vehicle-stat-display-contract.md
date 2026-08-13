# Contract: Vehicle Stat Display

## 1. Shared vocabulary

Feature 025 MUST import physical stat order, names, units, signs, and precision
from feature 024's Phaser-free presentation metadata. It MUST NOT define a
competing vocabulary.

## 2. Pure model boundary

```ts
function currentVehicleStatModel(input: CurrentVehicleStatInput): VehicleStatPanelModel;

function prospectiveVehicleStatModel(
  input: ProspectiveVehicleStatInput,
): VehicleStatPanelModel;

function recordedLapVehicleStatModel(
  input: RecordedLapVehicleStatInput,
): VehicleStatPanelModel;
```

All functions are pure, deterministic, Phaser-free, and nonmutating. They MUST
NOT independently simulate a lap or determine garage legality.

## 3. Current-build totals

- Begin with `STOCK_PHYSICAL_STATS`.
- Include only contributions active in the current build and resolvable without
  a track, segment, cooldown, or lap context.
- Honor effective tier, installation state, active storage, Synergy, Buff, and
  the simulation's positive minimum through existing authorities.
- Put unresolved conditional potential in labeled detail, not the total.
- Reconcile every aggregate delta to inspectable item sources.

## 4. Placement preview

- Consume a valid `PlacementPreview` and prospective build from the existing
  garage command authority.
- Account for incoming, outgoing, swapped, replaced, evicted, moved, tiered,
  stored, Fitted, Flexible, and Improvised states.
- Compare prospective totals with the unchanged current build.
- Invalid or cancelled previews return to current values and never mutate state.

## 5. Recorded race and result values

- Use `PlayerLap.physics.stats` for all four aggregate values.
- Use `itemContributions` for source attribution when present.
- Never call simulation from a scene or infer a missing lap from another lap.
- Update race context at the authoritative inspected-player-lap boundary.
- Keep segment-conditional activation separate from whole-lap base stats.
- Missing aggregate evidence is `unavailable`; missing contribution evidence is
  `partially-available` with the aggregate still shown.

## 6. Rendering and input

- One shared renderer consumes `VehicleStatPanelModel` on preparation, race,
  result, and Test Day surfaces.
- All four lines stay in a fixed order and stable spatial position.
- Stock/current/preview/race context is always written, not color-only.
- Improvements, reductions, unchanged values, and unavailable values have text
  or structural indicators in addition to color or motion.
- Supporting sources are persistently reachable by mouse, touch, and keyboard;
  hover may supplement but never gate information.
- The panel reflows without clipping at 1920x1080, 1366x768, 1024x768, 800x450,
  and 390x844 under feature 026's responsive frame.

## 7. Ownership boundary

- Feature 024 owns item-level authored and resolved presentation.
- Feature 025 owns aggregate player vehicle stats and reconciliation links.
- Feature 027 owns live/projected race position, ghost-relative gaps, track
  composition, and post-race build-versus-track explanation.

## 8. Regression contract

Feature 025 MUST NOT change item definitions, stock stats, tiering, garage
legality, simulation formulas, lap evidence, contest timing, standings, run
state, or Test Day state.
