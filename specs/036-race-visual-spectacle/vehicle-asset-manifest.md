# Vehicle Asset Manifest: Race Visual Spectacle

Feature 036 ships exactly four bespoke 2D player-vehicle art files. Each entry
records the packaged path, the stable texture key used by preload and profile
lookup, and its production provenance. The manifest is planning/provenance
evidence only — it is never read by simulation, economy, or the contest
resolver (data-model VehicleAssetManifestEntry).

The four assets are **visibly distinct top-down silhouettes** (not color-only
differences). Every nose points toward **+x (right)** so that
`GameObjects.setRotation(headingRadians)` turns the vehicle along the retained
track heading. Each file is regenerable and each profile keeps a geometric,
labeled no-asset fallback so identity never depends on a loaded texture
(FR-008 / FR-010).

## Files

| profileId | assetPath | textureKey | silhouette | provenance | fallbackVerified |
|---|---|---|---|---|---|
| `evelyn-mercer` | `public/assets/race/vehicles/player-evelyn-mercer.png` | `race-player-evelyn-mercer` | highwheel (boxy touring racer) | Generated programmatically for Feature 036 (coachworks crimson). | true |
| `lucien-soto` | `public/assets/race/vehicles/player-lucien-soto.png` | `race-player-lucien-soto` | needle (long slim speedster) | Generated programmatically for Feature 036 (velodrome steel blue). | true |
| `inez-rook` | `public/assets/race/vehicles/player-inez-rook.png` | `race-player-inez-rook` | lark (broad crossbreed + rear wing) | Generated programmatically for Feature 036 (fieldworks field green). | true |
| `nell-voss` | `public/assets/race/vehicles/player-nell-voss.png` | `race-player-nell-voss` | hush (low rounded coupe) | Generated programmatically for Feature 036 (backroads charcoal indigo). | true |

## Regeneration

Re-run `node scripts/generate-race-vehicles.mjs` from the repository root to
regenerate identical deterministic art. Each file is a distinct silhouette and
body color with its forward nose toward +x; every player profile keeps a
geometric, labeled no-asset fallback so identity never depends on color or a
loaded texture (FR-008 / FR-010).
