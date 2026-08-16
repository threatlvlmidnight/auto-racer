# Data Model: Race Visual Spectacle

All entities in this document are presentation-only. None is serialized into a
contest input or read by the resolver.

## RaceVisualProfile

| Field | Type | Rules |
|---|---|---|
| `profileId` | string | Stable content identifier. |
| `role` | `player` \| `rival` | Must agree with the playback car role. |
| `vehicleKey` | string | Optional texture/illustration key. |
| `silhouetteClass` | string | Stable player model or reusable rival class. |
| `number` | string | Visible non-color identity; unique within a field. |
| `pattern` | string | Visible secondary identity descriptor. |
| `label` | string | Accessible display name. |
| `fallback` | marker descriptor | Must render without an external texture. |

**Invariants**: Four player profiles exist. A rival profile is deterministically
derived from retained `car.id`, never a random draw. No field expresses stats,
slots, item effects, or contest authority.

## VehicleAssetManifestEntry

| Field | Type | Rules |
|---|---|---|
| `profileId` | string | Must match one of the four player profiles. |
| `assetPath` | string | Packaged file under `public/assets/race/vehicles/`. |
| `textureKey` | string | Stable key used by preload and profile lookup. |
| `provenance` | string | Generated, commissioned, or license/source record. |
| `fallbackVerified` | boolean | True only after the missing-asset fallback test passes. |

The manifest is planning/provenance evidence, never contest input or player
state. It is recorded in `vehicle-asset-manifest.md`.

## CircuitVisualModel

| Field | Type | Rules |
|---|---|---|
| `trackId` | string | Equal to retained `schedule.track.id`. |
| `points` | readonly point[] | References/projection of retained track points only. |
| `roadLayers` | display descriptors | Decorative widths/colors only. |
| `landmarks` | display descriptors | Anchored relative to retained bounds, never used for movement. |
| `startFinish` | display descriptor | Derived from the retained start segment. |

**Invariant**: A vehicle's rendered coordinate still comes only from
`pointAtProgress(schedule.track, progress)`.

## PiPBudget

| Lap count | Maximum selected moments |
|---:|---:|
| 8 | 2 |
| 10 | 2 |
| 12 | 3 |
| 14 | 4 |
| 16 | 4 |

The resolver rejects unsupported lap counts rather than silently extrapolating.
An empty candidate set returns an empty selected set.

## SpectacleMoment

| Field | Type | Rules |
|---|---|---|
| `eventId` | string | Immutable Feature 033 event ID; unique consumption key. |
| `boundaryId` | string | Retained playback boundary. |
| `kind` | enrichment event kind | Must be in the eligible display set. |
| `participants` | readonly car IDs | Must include the player for eligibility. |
| `driverLabel` | string | Derived from retained roster/profile. |
| `headline` | string | Event/signature name from retained evidence. |
| `consequence` | string | Recorded result/effect, never inferred animation. |
| `priority` | integer | Fixed display priority described in research. |
| `status` | `pending` \| `active` \| `rendered` \| `suppressed` | Race-local presentation state. |

**Transitions**: `pending → active → rendered`; if conflict policy rejects it,
`pending → suppressed`. A terminal state cannot reactivate. A moment with a
non-selected `eventId` never enters this state machine.

## FocusWindowState

| Field | Type | Rules |
|---|---|---|
| `selectedCarId` | string | Defaults to retained player ID; may be any retained car. |
| `activeMomentId` | string \| null | Temporarily overrides the shown focus while PiP is active. |
| `displayedCarIds` | readonly string[] | Active participants or the selected single car. |

**Transitions**: initialization selects player; a named-car control updates
`selectedCarId`; PiP activation sets `activeMomentId`; all terminal PiP paths
clear it and restore `displayedCarIds` to `selectedCarId`. This reducer never
receives or changes playback time.

## SpectaclePresentationState

Contains the selected moment map, `FocusWindowState`, `reducedMotion` flag, and
asset availability flags. It is created per `ContestScene`, cleared on scene
shutdown, and intentionally absent from `NCarContestResult`.
