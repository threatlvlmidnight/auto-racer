# Feature 032 UI asset manifest

Decision (2026-08-15): in-game owner review approved the control master and
identified three additional neutral chrome surfaces that benefited from dedicated
art: encounter cards, entrant cards, and leg-status plates. Their v2 transparent
runtime sheets preserve runtime labels, accessibility meaning, and input state.
Crop/nine-slice metadata is registered in `src/scenes/uiChrome.ts` and validated
by `tests/unit/uiChrome.test.ts`.

Approved runtime asset:

| Key | Source | Size | Use |
|---|---|---:|---|
| `feature-032-controls-sheet` | `public/assets/ui/feature-032-controls-sheet.png` | 1672×941 | Nine-slice control states |
| `feature-032-encounter-card-sheet-v2` | `public/assets/ui/feature-032-encounter-card-sheet-v2.png` | 1774×887 | Encounter-card frame |
| `feature-032-entrant-card-sheet-v2` | `public/assets/ui/feature-032-entrant-card-sheet-v2.png` | 1705×922 | Thin entrant-card frame |
| `feature-032-leg-status-sheet-v2` | `public/assets/ui/feature-032-leg-status-sheet-v2.png` | 1942×809 | Compact eight-leg status plates |

Preserved provenance source:

`public/assets/ui/source/feature-032-controls-sheet-chroma.png`

Companion chroma sources are retained under `public/assets/ui/source/` with the
same encounter-card, entrant-card, and leg-status v2 basenames.

No further sheet generation is required for Feature 032. Later features may add
new semantic surfaces only with their own in-game evidence and crop inventory.
