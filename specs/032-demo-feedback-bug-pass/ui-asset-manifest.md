# Feature 032 UI asset manifest

Decision (2026-08-15): no additional sprite sheet is required for the current
US5 scope. The approved transparent master is sufficient for primary,
secondary, compact, danger, selector, and focus states; labels, icons,
accessibility meaning, and input state remain runtime code. The source crop
inventory is registered in `src/scenes/uiChrome.ts` and validated by
`tests/unit/uiChrome.test.ts`.

Approved runtime asset:

| Key | Source | Size | Use |
|---|---|---:|---|
| `feature-032-controls-sheet` | `public/assets/ui/feature-032-controls-sheet.png` | 1672×941 | Nine-slice control states |

Preserved provenance source:

`public/assets/ui/source/feature-032-controls-sheet-chroma.png`

No new generation prompt or additional crop inventory is authorized by this
pass. Revisit only if a later in-game review identifies a semantic control
that cannot be represented by the approved master.
